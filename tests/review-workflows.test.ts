import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import {
  deleteReview,
  getPendingComments,
  getReviews,
  moderateReview,
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

function dependencies({
  store = {},
  user = { id: "user-1", role: "user" },
  verify = Effect.void,
  currentUser = Effect.succeed(user),
}: {
  store?: Partial<ReviewStoreService>;
  user?: { id: string; role: string } | null;
  verify?: Effect.Effect<void, TurnstileVerificationError>;
  currentUser?: Effect.Effect<
    { id: string; role?: string | null } | null,
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
} as const;
const readInput: GetReviewsInput = {
  itemType: "account",
  slugs: [" shop "],
  includeWrittenReviews: true,
  reviewsPage: 2,
};

await test("review writes and moderation require the correct session before accessing storage", async () => {
  const anonymous = dependencies({ user: null });
  for (const program of [
    submitReview(input),
    deleteReview(input),
    getPendingComments,
    moderateReview({ reviewId: "id", commentStatus: "approved" }),
  ]) {
    assert.deepEqual(await anonymous(program), {
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
    await member(moderateReview({ reviewId: "id", commentStatus: "rejected" })),
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
  assert.deepEqual(await run(submitReview(submitted)), { ok: true });
  assert.deepEqual(events, ["verify", "write"]);
  assert.deepEqual(written[0], {
    ...input,
    userId: "user-1",
    body: "Helpful service",
    commentStatus: "pending",
  });
  await run(submitReview({ ...input, body: "  " }));
  assert.equal(written[1].body, null);
  assert.equal(written[1].commentStatus, "approved");
  await run(submitReview({ ...input, body: "x".repeat(2001) }));
  assert.equal(written[2].body?.length, 2000);
});

await test("review edits skip verification and retain approval only for unchanged approved comments", async () => {
  const cases: [ExistingReview, string | null, string][] = [
    [
      { id: "id", body: "Helpful service", commentStatus: "approved" },
      input.body,
      "approved",
    ],
    [
      { id: "id", body: "old", commentStatus: "approved" },
      "changed",
      "pending",
    ],
    [
      { id: "id", body: "Helpful service", commentStatus: "pending" },
      input.body,
      "pending",
    ],
    [
      { id: "id", body: "Helpful service", commentStatus: "rejected" },
      input.body,
      "pending",
    ],
    [{ id: "id", body: "old", commentStatus: null }, null, "approved"],
  ];
  for (const [existing, body, commentStatus] of cases) {
    let update: unknown;
    const run = dependencies({
      store: {
        find: () => Effect.succeed(existing),
        update: (id, value) =>
          Effect.sync(() => {
            update = { id, ...value };
          }),
      },
      verify: Effect.die(new Error("Existing reviews must not verify again")),
    });
    assert.deepEqual(await run(submitReview({ ...input, body })), { ok: true });
    assert.deepEqual(update, {
      id: "id",
      rating: 5,
      body: body?.trim() || null,
      commentStatus,
    });
  }
});

await test("verification failures keep their public result and database failures are never retried", async () => {
  const rejected = dependencies({
    store: {
      find: () => Effect.succeed<ExistingReview | undefined>(undefined),
    },
    verify: Effect.fail(
      new TurnstileVerificationError({ errorCodes: ["action-mismatch"] }),
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
          return new ReviewStoreError({
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
    shop: { rating: 5, body: null, commentStatus: "approved" as const },
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
          new ReviewStoreError({
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
  });
  const broken = dependencies({
    store: {
      summaries: () => Effect.die(new Error("programming defect")),
      userReviews: () => Effect.succeed({}),
    },
  });
  await assert.rejects(broken(getReviews(readInput)), /programming defect/);
  await assert.rejects(
    dependencies({
      currentUser: Effect.fail(
        new ReviewSessionError({ operation: "session", cause: "offline" }),
      ),
    })(deleteReview(input)),
    { _tag: "ReviewSessionError" },
  );
});

await test("moderation checks admin roles and deletion scopes the write to the signed-in user", async () => {
  const writes: unknown[] = [];
  const run = dependencies({
    user: { id: "admin-1", role: "user, ADMIN " },
    store: {
      pendingComments: Effect.succeed([]),
      moderate: (id, status) =>
        Effect.sync(() => {
          writes.push({ id, status });
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
      moderateReview({ reviewId: "review-id", commentStatus: "rejected" }),
    ),
    { ok: true },
  );
  assert.deepEqual(await run(deleteReview(input)), { ok: true });
  assert.deepEqual(writes, [
    { id: "review-id", status: "rejected" },
    { userId: "admin-1", itemType: "account", itemSlug: "shop" },
  ]);
});
