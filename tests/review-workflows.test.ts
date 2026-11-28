import assert from "node:assert/strict";
import test from "node:test";
import { defined } from "./support/defined";
import { Effect } from "effect";
import {
  deleteReview,
  getPendingComments,
  getReviews,
  moderateReview,
  NEW_ACCOUNT_HOLD_MS,
  removeReview,
  ReviewSession,
  ReviewSessionError,
  ReviewStore,
  ReviewStoreError,
  ReviewVerification,
  submitReview,
  type ExistingReview,
  type GetReviewsInput,
  type ReviewStoreService,
  type ReviewWrite,
} from "@/lib/review-workflows";
import { TurnstileVerificationError } from "@/lib/turnstile";

// Accounts older than the new-account hold, so their ratings count at once.
const OLD_ACCOUNT = new Date(0);

function dependencies({
  store = {},
  user = { id: "user-1", role: "user", createdAt: OLD_ACCOUNT },
  verify = Effect.void,
  currentUser = Effect.succeed(user),
  freshUser = currentUser,
}: {
  store?: Partial<ReviewStoreService>;
  user?: { id: string; role: string; createdAt: Date } | null;
  verify?: Effect.Effect<void, TurnstileVerificationError>;
  currentUser?: Effect.Effect<
    { id: string; role?: string | null; createdAt: Date } | null,
    ReviewSessionError
  >;
  freshUser?: Effect.Effect<
    { id: string; role?: string | null; createdAt: Date } | null,
    ReviewSessionError
  >;
} = {}) {
  const unexpected = Effect.die(new Error("Unexpected repository call"));
  const repository: ReviewStoreService = {
    summaries: () => unexpected,
    userReviews: () => unexpected,
    writtenReviews: () => unexpected,
    find: () => unexpected,
    create: () => unexpected,
    update: () => unexpected,
    pendingComments: unexpected,
    moderate: () => unexpected,
    remove: () => unexpected,
    delete: () => unexpected,
    ...store,
  };
  return <A, E>(
    program: Effect.Effect<
      A,
      E,
      ReviewSession | ReviewStore | ReviewVerification
    >,
  ) =>
    program.pipe(
      Effect.provideService(ReviewStore, repository),
      Effect.provideService(ReviewSession, {
        currentUser,
        freshUser,
      }),
      Effect.provideService(ReviewVerification, { verify }),
      Effect.runPromise,
    );
}

const input = {
  itemType: "account",
  itemSlug: "shop",
  rating: 5,
  body: "  Helpful service  ",
  invited: false,
} as const;
const readInput: GetReviewsInput = {
  itemType: "account",
  slugs: [" shop "],
  includeWrittenReviews: true,
  reviewsPage: 2,
};

await test("review writes and moderation require the correct session before accessing storage", async () => {
  const anonymous = dependencies({ user: null });
  for (const result of [
    await anonymous(submitReview(input)),
    await anonymous(deleteReview(input)),
    await anonymous(getPendingComments),
    await anonymous(
      moderateReview({ reviewId: "id", commentStatus: "approved", body: "x" }),
    ),
  ]) {
    assert.deepEqual(result, {
      ok: false,
      error: "unauthorized",
    });
  }
  const member = dependencies();
  assert.deepEqual(await member(getPendingComments), {
    ok: false,
    error: "unauthorized",
  });
  assert.deepEqual(
    await member(
      moderateReview({ reviewId: "id", commentStatus: "rejected", body: "x" }),
    ),
    { ok: false, error: "unauthorized" },
  );
});

await test("new reviews verify before inserting and normalize comments for moderation", async () => {
  const events: string[] = [];
  const written: ReviewWrite[] = [];
  const run = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
      create: (value) =>
        Effect.sync(() => {
          events.push("write");
          written.push(value);
        }),
    },
    verify: Effect.sync(() => {
      events.push("verify");
    }),
  });
  const submitted = { ...input, turnstileToken: "one-use-token" };
  assert.deepEqual(await run(submitReview(submitted)), {
    ok: true,
    ratingStatus: "approved",
  });
  assert.deepEqual(events, ["verify", "write"]);
  assert.deepEqual(written[0], {
    ...input,
    userId: "user-1",
    body: "Helpful service",
    commentStatus: "pending",
    ratingStatus: "approved",
  });
  await run(submitReview({ ...input, body: "  " }));
  assert.equal(defined(written[1]).body, null);
  assert.equal(defined(written[1]).commentStatus, "approved");
  await run(submitReview({ ...input, body: "x".repeat(2001) }));
  assert.equal(defined(written[2]).body?.length, 2000);
});

await test("review edits verify again and retain approval only for unchanged approved comments", async () => {
  const cases: [ExistingReview, string | null, string][] = [
    [
      {
        id: "id",
        body: "Helpful service",
        commentStatus: "approved",
        invited: false,
        ratingStatus: "approved",
      },
      input.body,
      "approved",
    ],
    [
      {
        id: "id",
        body: "old",
        commentStatus: "approved",
        invited: false,
        ratingStatus: "approved",
      },
      "changed",
      "pending",
    ],
    [
      {
        id: "id",
        body: "Helpful service",
        commentStatus: "pending",
        invited: false,
        ratingStatus: "approved",
      },
      input.body,
      "pending",
    ],
    [
      {
        id: "id",
        body: "Helpful service",
        commentStatus: "rejected",
        invited: false,
        ratingStatus: "approved",
      },
      input.body,
      "pending",
    ],
    [
      {
        id: "id",
        body: "old",
        commentStatus: null,
        invited: false,
        ratingStatus: "approved",
      },
      null,
      "approved",
    ],
  ];
  for (const [existing, body, commentStatus] of cases) {
    let update: unknown;
    let verified = 0;
    const run = dependencies({
      store: {
        find: () => Effect.succeed(existing),
        update: (id, value) =>
          Effect.sync(() => {
            update = { id, ...value };
          }),
      },
      verify: Effect.sync(() => {
        verified++;
      }),
    });
    assert.deepEqual(await run(submitReview({ ...input, body })), {
      ok: true,
      ratingStatus: "approved",
    });
    assert.equal(verified, 1);
    assert.deepEqual(update, {
      id: "id",
      rating: 5,
      body: body?.trim() || null,
      commentStatus,
      invited: false,
    });
  }
});

await test("reviews from a review link stay invited through later edits", async () => {
  const written: ReviewWrite[] = [];
  const created = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
      create: (value) =>
        Effect.sync(() => {
          written.push(value);
        }),
    },
  });
  await created(submitReview({ ...input, invited: true }));
  assert.equal(defined(written[0]).invited, true);

  for (const [existingInvited, submittedInvited] of [
    [true, false],
    [false, true],
    [false, false],
  ] as const) {
    let invited: boolean | undefined;
    const run = dependencies({
      store: {
        find: () =>
          Effect.succeed<ExistingReview>({
            id: "id",
            body: null,
            commentStatus: null,
            invited: existingInvited,
            ratingStatus: "approved",
          }),
        update: (_id, value) =>
          Effect.sync(() => {
            invited = value.invited;
          }),
      },
    });
    await run(submitReview({ ...input, invited: submittedInvited }));
    assert.equal(invited, existingInvited || submittedInvited);
  }
});

await test("verification failures keep their public result and database failures are never retried", async () => {
  const rejected = dependencies({
    verify: Effect.fail(
      TurnstileVerificationError.make({ errorCodes: ["action-mismatch"] }),
    ),
  });
  assert.deepEqual(await rejected(submitReview(input)), {
    ok: false,
    error: "verification",
    errorCodes: ["action-mismatch"],
  });
  let attempts = 0;
  const failed = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
      create: () =>
        Effect.suspend(() => {
          attempts++;
          return ReviewStoreError.make({
            operation: "create",
            cause: new Error("database unavailable"),
          });
        }),
    },
  });
  await assert.rejects(failed(submitReview(input)), {
    _tag: "ReviewStoreError",
    operation: "create",
  });
  assert.equal(attempts, 1);
});

await test("review reads preserve personal reviews and pagination, and skip personal reads for guests", async () => {
  const summaries = { shop: { averageRating: 5, reviewCount: 9 } };
  const userReviews = {
    shop: {
      rating: 5,
      body: null,
      commentStatus: "approved" as const,
      ratingStatus: "approved" as const,
    },
  };
  const page = {
    entries: [],
    page: 2,
    pageSize: 8,
    totalCount: 9,
    totalPages: 2,
  };
  const store: Partial<ReviewStoreService> = {
    summaries: (type, slugs) => {
      assert.equal(type, "account");
      assert.deepEqual(slugs, ["shop"]);
      return Effect.succeed(summaries);
    },
    userReviews: (id) => {
      assert.equal(id, "user-1");
      return Effect.succeed(userReviews);
    },
    writtenReviews: (type, slug, count, options) => {
      assert.equal(type, "account");
      assert.equal(slug, "shop");
      assert.equal(count, 9);
      assert.deepEqual(options, { page: 2, pageSize: 8 });
      return Effect.succeed(page);
    },
  };
  assert.deepEqual(await dependencies({ store })(getReviews(readInput)), {
    summaries,
    userReviews,
    writtenReviews: page,
  });
  assert.deepEqual(
    await dependencies({
      user: null,
      store: { ...store, userReviews: () => Effect.die("Guest personal read") },
    })(getReviews(readInput)),
    {
      summaries,
      userReviews: {},
      writtenReviews: page,
    },
  );
  assert.deepEqual(
    await dependencies()(getReviews({ ...readInput, slugs: ["  "] })),
    { summaries: {}, userReviews: {} },
  );
});

await test("review reads fall back for operational failures while defects still surface", async () => {
  const run = dependencies({
    store: {
      summaries: () =>
        Effect.fail(
          ReviewStoreError.make({
            operation: "summaries",
            cause: new Error("offline"),
          }),
        ),
      userReviews: () => Effect.succeed({}),
    },
  });
  assert.deepEqual(await run(getReviews(readInput)), {
    summaries: { shop: { averageRating: null, reviewCount: 0 } },
    userReviews: {},
    writtenReviews: {
      entries: [],
      page: 2,
      pageSize: 8,
      totalCount: 0,
      totalPages: 0,
    },
    unavailable: true,
  });
  const broken = dependencies({
    store: {
      summaries: () => Effect.die(new Error("programming defect")),
      userReviews: () => Effect.succeed({}),
    },
  });
  await assert.rejects(broken(getReviews(readInput)), /programming defect/u);
  await assert.rejects(
    dependencies({
      currentUser: Effect.fail(
        ReviewSessionError.make({ operation: "session", cause: "offline" }),
      ),
    })(deleteReview(input)),
    { _tag: "ReviewSessionError" },
  );
});

await test("moderation checks admin roles and deletion scopes the write to the signed-in user", async () => {
  const writes: unknown[] = [];
  const run = dependencies({
    user: { id: "admin-1", role: "user, ADMIN ", createdAt: OLD_ACCOUNT },
    store: {
      pendingComments: Effect.succeed([]),
      moderate: (id, status, body) =>
        Effect.sync(() => {
          writes.push({ id, status, body });
          return true;
        }),
      delete: (userId, itemType, itemSlug) =>
        Effect.sync(() => {
          writes.push({ userId, itemType, itemSlug });
        }),
    },
  });
  assert.deepEqual(await run(getPendingComments), { ok: true, comments: [] });
  assert.deepEqual(
    await run(
      moderateReview({
        reviewId: "review-id",
        commentStatus: "rejected",
        body: "Seen text",
      }),
    ),
    { ok: true },
  );
  assert.deepEqual(await run(deleteReview(input)), { ok: true });
  assert.deepEqual(writes, [
    { id: "review-id", status: "rejected", body: "Seen text" },
    { userId: "admin-1", itemType: "account", itemSlug: "shop" },
  ]);
});

await test("admin checks use the uncached session and stale moderation is reported", async () => {
  const demoted = dependencies({
    currentUser: Effect.succeed({
      id: "admin-1",
      role: "admin",
      createdAt: OLD_ACCOUNT,
    }),
    freshUser: Effect.succeed({
      id: "admin-1",
      role: "user",
      createdAt: OLD_ACCOUNT,
    }),
  });
  assert.deepEqual(await demoted(getPendingComments), {
    ok: false,
    error: "unauthorized",
  });
  const stale = dependencies({
    user: { id: "admin-1", role: "admin", createdAt: OLD_ACCOUNT },
    store: { moderate: () => Effect.succeed(false) },
  });
  assert.deepEqual(
    await stale(
      moderateReview({
        reviewId: "review-id",
        commentStatus: "approved",
        body: "Old text",
      }),
    ),
    { ok: false, error: "stale" },
  );
});

await test("review submissions verify before reading or writing storage", async () => {
  const run = dependencies({
    verify: Effect.fail(
      TurnstileVerificationError.make({ errorCodes: ["timeout-or-duplicate"] }),
    ),
  });
  assert.deepEqual(await run(submitReview(input)), {
    ok: false,
    error: "verification",
    errorCodes: ["timeout-or-duplicate"],
  });
});

await test("an empty comment clears the stored comment and needs no moderation", async () => {
  const updates: unknown[] = [];
  const run = dependencies({
    store: {
      find: () =>
        Effect.succeed<ExistingReview | undefined>({
          id: "id",
          body: "Written comment",
          commentStatus: "rejected",
          invited: false,
          ratingStatus: "approved",
        }),
      update: (id, value) =>
        Effect.sync(() => {
          updates.push({ id, ...value });
        }),
    },
  });
  assert.deepEqual(await run(submitReview({ ...input, body: null })), {
    ok: true,
    ratingStatus: "approved",
  });
  assert.deepEqual(updates[0], {
    id: "id",
    rating: 5,
    body: null,
    commentStatus: "approved",
    invited: false,
  });

  const created: ReviewWrite[] = [];
  const first = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
      create: (value) =>
        Effect.sync(() => {
          created.push(value);
        }),
    },
  });
  await first(submitReview({ ...input, body: "   " }));
  assert.equal(defined(created[0]).body, null);
  assert.equal(defined(created[0]).commentStatus, "approved");
});

await test("cut comments are stored as trimmed text that moderation can match", async () => {
  const written: ReviewWrite[] = [];
  const run = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
      create: (value) =>
        Effect.sync(() => {
          written.push(value);
        }),
    },
  });
  await run(
    submitReview({ ...input, body: `${"x".repeat(1999)}\n${"y".repeat(10)}` }),
  );
  const body = defined(defined(written[0]).body);
  assert.equal(body, "x".repeat(1999));
  assert.equal(body, body.trim());
});

await test("ratings from new accounts wait for a moderator and edits keep the hold", async () => {
  const now = Date.now();
  const written: ReviewWrite[] = [];
  const submitAs = (ageMs: number) =>
    dependencies({
      user: { id: "user-1", role: "user", createdAt: new Date(now - ageMs) },
      store: {
        find: () => Effect.succeed<ExistingReview | undefined>(undefined),
        create: (value) =>
          Effect.sync(() => {
            written.push(value);
          }),
      },
    })(submitReview(input));
  assert.deepEqual(await submitAs(60 * 60 * 1000), {
    ok: true,
    ratingStatus: "pending",
  });
  assert.equal(defined(written[0]).ratingStatus, "pending");
  assert.deepEqual(await submitAs(NEW_ACCOUNT_HOLD_MS + 60_000), {
    ok: true,
    ratingStatus: "approved",
  });
  assert.equal(defined(written[1]).ratingStatus, "approved");

  // A held review stays held after the account ages, so waiting out the hold
  // and editing does not move the average. Edits never write the status.
  let update: Record<string, unknown> | undefined;
  const edit = dependencies({
    store: {
      find: () =>
        Effect.succeed<ExistingReview>({
          id: "id",
          body: null,
          commentStatus: null,
          invited: false,
          ratingStatus: "pending",
        }),
      update: (_id, value) =>
        Effect.sync(() => {
          update = value;
        }),
    },
  });
  assert.deepEqual(await edit(submitReview({ ...input, rating: 1 })), {
    ok: true,
    ratingStatus: "pending",
  });
  assert.equal(update !== undefined && "ratingStatus" in update, false);
});

await test("only admins remove other users' reviews", async () => {
  const member = dependencies();
  assert.deepEqual(await member(removeReview({ reviewId: "review-id" })), {
    ok: false,
    error: "unauthorized",
  });
  const removed: string[] = [];
  const admin = dependencies({
    user: { id: "admin-1", role: "admin", createdAt: OLD_ACCOUNT },
    store: {
      remove: (id) =>
        Effect.sync(() => {
          removed.push(id);
        }),
    },
  });
  assert.deepEqual(await admin(removeReview({ reviewId: "review-id" })), {
    ok: true,
  });
  assert.deepEqual(removed, ["review-id"]);
});
