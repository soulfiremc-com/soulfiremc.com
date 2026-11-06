import { Context, Data, Effect } from "effect";
import {
  emptyReviewSummary,
  type ItemType,
  type PaginatedPublicReviewRecords,
  type ReviewCommentStatus,
  type ReviewSummary,
  type UserReviewRecord,
} from "@/lib/review-core";
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

export class ReviewSessionError extends Data.TaggedError("ReviewSessionError")<{
  readonly operation: "session";
  readonly cause: unknown;
}> {}
export class ReviewStoreError extends Data.TaggedError("ReviewStoreError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}
class ReviewUnauthorizedError extends Data.TaggedError(
  "ReviewUnauthorizedError",
) {}

export class ReviewSession extends Context.Service<
  ReviewSession,
  {
    readonly currentUser: Effect.Effect<ReviewUser | null, ReviewSessionError>;
  }
>()("soulfire/ReviewSession") {}

export interface ReviewStoreService {
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
    input: Pick<ReviewWrite, "rating" | "body" | "commentStatus">,
  ): Effect.Effect<void, ReviewStoreError>;
  pendingComments: Effect.Effect<
    PendingReviewCommentRecord[],
    ReviewStoreError
  >;
  moderate(
    id: string,
    status: "approved" | "rejected",
  ): Effect.Effect<void, ReviewStoreError>;
  delete(
    userId: string,
    itemType: ItemType,
    slug: string,
  ): Effect.Effect<void, ReviewStoreError>;
}
export class ReviewStore extends Context.Service<
  ReviewStore,
  ReviewStoreService
>()("soulfire/ReviewStore") {}

export class ReviewVerification extends Context.Service<
  ReviewVerification,
  {
    readonly verify: Effect.Effect<void, TurnstileVerificationError>;
  }
>()("soulfire/ReviewVerification") {}

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
  body: string | null;
};
export type GetReviewsResult = {
  summaries: Record<string, ReviewSummary>;
  userReviews: Record<string, UserReviewRecord>;
  writtenReviews?: PaginatedPublicReviewRecords;
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
  | { ok: false; error: "unauthorized" };

const requireUser = Effect.gen(function* () {
  const { currentUser } = yield* ReviewSession;
  const user = yield* currentUser;
  if (!user) return yield* new ReviewUnauthorizedError();
  return user;
});
const requireAdmin = requireUser.pipe(
  Effect.flatMap((user) => {
    const roles = user.role
      ?.split(",")
      .map((role) => role.trim().toLowerCase());
    return roles?.includes("admin")
      ? Effect.succeed(user)
      : Effect.fail(new ReviewUnauthorizedError());
  }),
);

function emptyReviews(
  slugs: string[],
  input: GetReviewsInput,
): GetReviewsResult {
  return {
    summaries: Object.fromEntries(
      slugs.map((slug) => [slug, emptyReviewSummary()]),
    ),
    userReviews: {},
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
    const writtenReviews =
      input.includeWrittenReviews && slugs.length === 1
        ? yield* store.writtenReviews(
            input.itemType,
            slugs[0],
            summaries[slugs[0]]?.reviewCount ?? 0,
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
    const store = yield* ReviewStore;
    const existing = yield* store.find(user.id, input.itemType, input.itemSlug);
    const body = input.body?.trim().slice(0, 2_000) || null;
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
      const { verify } = yield* ReviewVerification;
      yield* verify;
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
}) {
  return yield* Effect.gen(function* () {
    yield* requireAdmin;
    const store = yield* ReviewStore;
    yield* store.moderate(input.reviewId, input.commentStatus);
    return { ok: true } as const;
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
