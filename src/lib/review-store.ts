import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { db, reviewDb } from "@/lib/db";
import { review } from "@/lib/db/schema";
import {
  ReviewStoreError,
  type ReviewStoreService,
} from "@/lib/review-workflows";
import {
  getPaginatedWrittenReviews,
  getPendingReviewComments,
  getReviewSummaries,
  getUserReviews,
  updateReviewCommentStatus,
} from "@/lib/reviews";

function query<A>(operation: string, run: () => PromiseLike<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new ReviewStoreError({ operation, cause }),
  });
}

// Resolve Drizzle queries only when the effect runs, within the Worker's D1
// request context. Keep primary reads and review-session writes as before.
export const reviewStore: ReviewStoreService = {
  summaries: (itemType, slugs) =>
    query("summaries", () => getReviewSummaries(itemType, slugs)),
  userReviews: (userId, itemType, slugs) =>
    query("user-reviews", () => getUserReviews(userId, itemType, slugs)),
  writtenReviews: (itemType, slug, totalCount, options) =>
    query("written-reviews", () =>
      getPaginatedWrittenReviews(itemType, slug, totalCount, options),
    ),
  find: (userId, itemType, slug) =>
    query("find", () =>
      db
        .select({
          id: review.id,
          body: review.body,
          commentStatus: review.commentStatus,
        })
        .from(review)
        .where(
          and(
            eq(review.userId, userId),
            eq(review.itemType, itemType),
            eq(review.itemSlug, slug),
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0])),
  create: (input) =>
    query("create", () => reviewDb.insert(review).values(input)).pipe(
      Effect.asVoid,
    ),
  update: (id, input) =>
    query("update", () =>
      reviewDb.update(review).set(input).where(eq(review.id, id)),
    ).pipe(Effect.asVoid),
  pendingComments: query("pending-comments", getPendingReviewComments),
  moderate: (id, status) =>
    query("moderate", () => updateReviewCommentStatus(id, status)),
  delete: (userId, itemType, slug) =>
    query("delete", () =>
      reviewDb
        .delete(review)
        .where(
          and(
            eq(review.userId, userId),
            eq(review.itemType, itemType),
            eq(review.itemSlug, slug),
          ),
        ),
    ).pipe(Effect.asVoid),
};
