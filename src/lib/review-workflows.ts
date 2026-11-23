import { Context, Schema, Effect } from "effect";
import {
  emptyReviewSummary,
  type ItemType,
  type PaginatedPublicReviewRecords,
  type ReviewCommentStatus,
  type ReviewSummary,
  type UserReviewRecord,
} from "@/lib/review-core";
import { hasAdminRole } from "@/lib/auth/roles";
import type { PendingReviewCommentRecord } from "@/lib/reviews";
import type { TurnstileVerificationError } from "@/lib/turnstile";

const REVIEWS_PAGE_SIZE = 8;

type ReviewUser = { id: string; role?: string | null };
export type ExistingReview = {
  id: string;
  body: string | null;
  commentStatus: ReviewCommentStatus | null;
};
export type ReviewWrite = {
  userId: string;
  itemType: ItemType;
  itemSlug: string;
  rating: number;
  body: string | null;
  commentStatus: ReviewCommentStatus;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReviewSessionError extends Schema.TaggedError<
  ReviewSessionError,
  { readonly brand: unique symbol }
>()("ReviewSessionError", {
  operation: Schema.Literals(["session"]),
  cause: Schema.Unknown,
}) {}
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReviewStoreError extends Schema.TaggedError<
  ReviewStoreError,
  { readonly brand: unique symbol }
>()("ReviewStoreError", { operation: Schema.String, cause: Schema.Unknown }) {}
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class ReviewUnauthorizedError extends Schema.TaggedError<
  ReviewUnauthorizedError,
  { readonly brand: unique symbol }
>()("ReviewUnauthorizedError", {}) {}

export class ReviewSession extends Context.Service<
  ReviewSession,
  {
    readonly currentUser: Effect.Effect<ReviewUser | null, ReviewSessionError>;
    /** Reads the session from the database, skipping the cookie cache. */
    readonly freshUser: Effect.Effect<ReviewUser | null, ReviewSessionError>;
  }
>()("soulfiremc.com/lib/review-workflows/ReviewSession") {}

export type ReviewStoreService = {
  summaries(
    itemType: ItemType,
    slugs: string[],
  ): Effect.Effect<Record<string, ReviewSummary>, ReviewStoreError>;
  userReviews(
    userId: string,
    itemType: ItemType,
    slugs: string[],
  ): Effect.Effect<Record<string, UserReviewRecord>, ReviewStoreError>;
  writtenReviews(
    itemType: ItemType,
    slug: string,
    totalCount: number,
    options: { page: number; pageSize: number },
  ): Effect.Effect<PaginatedPublicReviewRecords, ReviewStoreError>;
  find(
    userId: string,
    itemType: ItemType,
    slug: string,
  ): Effect.Effect<ExistingReview | undefined, ReviewStoreError>;
  create(input: ReviewWrite): Effect.Effect<void, ReviewStoreError>;
  update(
    id: string,
    input: Pick<ReviewWrite, "rating"> &
      Partial<Pick<ReviewWrite, "body" | "commentStatus">>,
  ): Effect.Effect<void, ReviewStoreError>;
  pendingComments: Effect.Effect<
    PendingReviewCommentRecord[],
    ReviewStoreError
  >;
  /** Returns false when the comment is no longer pending with this body. */
  moderate(
    id: string,
    status: "approved" | "rejected",
    body: string,
  ): Effect.Effect<boolean, ReviewStoreError>;
  delete(
    userId: string,
    itemType: ItemType,
    slug: string,
  ): Effect.Effect<void, ReviewStoreError>;
};
export class ReviewStore extends Context.Service<
  ReviewStore,
  ReviewStoreService
>()("soulfiremc.com/lib/review-workflows/ReviewStore") {}

export class ReviewVerification extends Context.Service<
  ReviewVerification,
  {
    readonly verify: Effect.Effect<void, TurnstileVerificationError>;
  }
>()("soulfiremc.com/lib/review-workflows/ReviewVerification") {}

export type GetReviewsInput = {
  itemType: ItemType;
  slugs: string[];
  includeWrittenReviews: boolean;
  reviewsPage: number;
};
export type SubmitReviewInput = {
  itemType: ItemType;
  itemSlug: string;
  rating: number;
  /** Omit to change only the rating and keep the current comment. */
  body?: string | null | undefined;
};
export type GetReviewsResult = {
  summaries: Record<string, ReviewSummary>;
  userReviews: Record<string, UserReviewRecord>;
  writtenReviews?: PaginatedPublicReviewRecords;
  /** Set when storage failed and the result holds empty fallback data. */
  unavailable?: true;
};
export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" }
  | { ok: false; error: "verification"; errorCodes: string[] };
export type DeleteReviewResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" };
export type GetPendingReviewCommentsResult =
  | { ok: true; comments: PendingReviewCommentRecord[] }
  | { ok: false; error: "unauthorized" };
export type ModerateReviewCommentResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "stale" };

const requireUser = Effect.gen(function* () {
  const { currentUser } = yield* ReviewSession;
  const user = yield* currentUser;
  if (!user) return yield* ReviewUnauthorizedError.make();
  return user;
});

// Admin checks read the session from the database, so a removed role or a ban
// takes effect at once instead of after the cookie cache expires.
const requireAdmin = Effect.gen(function* () {
  const { freshUser } = yield* ReviewSession;
  const user = yield* freshUser;
  if (!user || !hasAdminRole(user.role)) {
    return yield* ReviewUnauthorizedError.make();
  }
  return user;
});

function emptyReviews(
  slugs: string[],
  input: GetReviewsInput,
): GetReviewsResult {
  return {
    summaries: Object.fromEntries(
      slugs.map((slug) => [slug, emptyReviewSummary()]),
    ),
    userReviews: {},
    unavailable: true,
    writtenReviews:
      input.includeWrittenReviews && slugs.length === 1
        ? {
            entries: [],
            page: input.reviewsPage,
            pageSize: REVIEWS_PAGE_SIZE,
            totalCount: 0,
            totalPages: 0,
          }
        : undefined,
  };
}

export const getReviews = Effect.fn("getReviews")(function* (
  input: GetReviewsInput,
) {
  const slugs = input.slugs.map((slug) => slug.trim()).filter(Boolean);
  if (slugs.length === 0) {
    const empty: GetReviewsResult = { summaries: {}, userReviews: {} };
    return empty;
  }

  return yield* Effect.gen(function* () {
    const store = yield* ReviewStore;
    const { currentUser } = yield* ReviewSession;
    const user = yield* currentUser;
    const [summaries, userReviews] = yield* Effect.all(
      [
        store.summaries(input.itemType, slugs),
        user
          ? store.userReviews(user.id, input.itemType, slugs)
          : Effect.succeed({}),
      ],
      { concurrency: 2 },
    );
    const [onlySlug] = slugs;
    const writtenReviews =
      input.includeWrittenReviews &&
      slugs.length === 1 &&
      onlySlug !== undefined
        ? yield* store.writtenReviews(
            input.itemType,
            onlySlug,
            summaries[onlySlug]?.reviewCount ?? 0,
            {
              page: input.reviewsPage,
              pageSize: REVIEWS_PAGE_SIZE,
            },
          )
        : undefined;
    const result: GetReviewsResult = { summaries, userReviews, writtenReviews };
    return result;
  }).pipe(
    Effect.catch((error) =>
      Effect.logWarning("Unable to load reviews", {
        operation: error.operation,
      }).pipe(Effect.as(emptyReviews(slugs, input))),
    ),
  );
});

export const submitReview = Effect.fn("submitReview")(function* (
  input: SubmitReviewInput,
) {
  return yield* Effect.gen(function* () {
    const user = yield* requireUser;
    // Every write needs a fresh challenge, so edits cannot flood the
    // database or the moderation queue.
    const { verify } = yield* ReviewVerification;
    yield* verify;
    const store = yield* ReviewStore;
    const existing = yield* store.find(user.id, input.itemType, input.itemSlug);
    // Inline star ratings send no comment. Keep the stored comment and its
    // moderation status instead of erasing it.
    if (input.body === undefined && existing) {
      yield* store.update(existing.id, { rating: input.rating });
      return { ok: true } as const;
    }
    // Trim again after the cut, so the stored text matches the trimmed text
    // that moderators see and send back.
    const body = input.body?.trim().slice(0, 2000).trimEnd() || null;
    const commentStatus: ReviewCommentStatus =
      !body ||
      (existing?.commentStatus === "approved" &&
        (existing.body?.trim() || null) === body)
        ? "approved"
        : "pending";

    if (existing) {
      yield* store.update(existing.id, {
        rating: input.rating,
        body,
        commentStatus,
      });
    } else {
      yield* store.create({
        itemType: input.itemType,
        itemSlug: input.itemSlug,
        rating: input.rating,
        userId: user.id,
        body,
        commentStatus,
      });
    }
    return { ok: true } as const;
  }).pipe(
    Effect.catchTags({
      ReviewUnauthorizedError: () =>
        Effect.succeed({ ok: false, error: "unauthorized" } as const),
      TurnstileVerificationError: (error) =>
        Effect.succeed({
          ok: false,
          error: "verification",
          errorCodes: error.errorCodes,
        } as const),
    }),
  );
});

export const getPendingComments = Effect.gen(function* () {
  yield* requireAdmin;
  const store = yield* ReviewStore;
  return { ok: true, comments: yield* store.pendingComments } as const;
}).pipe(
  Effect.catchTag("ReviewUnauthorizedError", () =>
    Effect.succeed({ ok: false, error: "unauthorized" } as const),
  ),
);

export const moderateReview = Effect.fn("moderateReview")(function* (input: {
  reviewId: string;
  commentStatus: "approved" | "rejected";
  /** The comment text the moderator saw. */
  body: string;
}) {
  return yield* Effect.gen(function* () {
    yield* requireAdmin;
    const store = yield* ReviewStore;
    const moderated = yield* store.moderate(
      input.reviewId,
      input.commentStatus,
      input.body,
    );
    return moderated
      ? ({ ok: true } as const)
      : ({ ok: false, error: "stale" } as const);
  }).pipe(
    Effect.catchTag("ReviewUnauthorizedError", () =>
      Effect.succeed({ ok: false, error: "unauthorized" } as const),
    ),
  );
});

export const deleteReview = Effect.fn("deleteReview")(function* (input: {
  itemType: ItemType;
  itemSlug: string;
}) {
  return yield* Effect.gen(function* () {
    const user = yield* requireUser;
    const store = yield* ReviewStore;
    yield* store.delete(user.id, input.itemType, input.itemSlug);
    return { ok: true } as const;
  }).pipe(
    Effect.catchTag("ReviewUnauthorizedError", () =>
      Effect.succeed({ ok: false, error: "unauthorized" } as const),
    ),
  );
});
