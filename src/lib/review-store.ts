import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { db, reviewDb } from "@/lib/db";
import { ReviewDatabase, reviewQuery } from "@/lib/review-database";
import { review } from "@/lib/db/schema";
import { type ReviewStoreService } from "@/lib/review-workflows";
import {
  getPaginatedWrittenReviews,
  getPendingReviewComments,
  getReviewSummaries,
  getUserReviews,
  updateReviewCommentStatus,
} from "@/lib/reviews";

// Resolve Drizzle queries only when the effect runs, within the Worker's D1
// request context. Keep primary reads and review-session writes as before.
export function makeReviewStore(database: {
  primary: typeof db;
  reviews: typeof reviewDb;
}): ReviewStoreService {
  const { primary: db, reviews: reviewDb } = database;
  const provide = <A, E>(program: Effect.Effect<A, E, ReviewDatabase>) =>
    program.pipe(Effect.provideService(ReviewDatabase, database));
  return {
    summaries: (itemType, slugs) =>
      provide(getReviewSummaries(itemType, slugs)),
    userReviews: (userId, itemType, slugs) =>
      provide(getUserReviews(userId, itemType, slugs)),
    writtenReviews: (itemType, slug, totalCount, options) =>
      provide(getPaginatedWrittenReviews(itemType, slug, totalCount, options)),
    find: (userId, itemType, slug) =>
      reviewQuery("find", () =>
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
      reviewQuery("create", () => reviewDb.insert(review).values(input)).pipe(
        Effect.asVoid,
      ),
    update: (id, input) =>
      reviewQuery("update", () =>
        reviewDb.update(review).set(input).where(eq(review.id, id)),
      ).pipe(Effect.asVoid),
    pendingComments: provide(getPendingReviewComments()),
    moderate: (id, status) => provide(updateReviewCommentStatus(id, status)),
    delete: (userId, itemType, slug) =>
      reviewQuery("delete", () =>
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
}

export const reviewStore = makeReviewStore({ primary: db, reviews: reviewDb });
