import { Effect } from "effect";
import { reviewQuery, ReviewDatabase } from "@/lib/review-database";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getAvatarUrl } from "@/lib/avatar";
import { user } from "@/lib/db/auth-schema";
import { review } from "@/lib/db/schema";
import {
  emptyReviewSummary,
  type ItemType,
  type PaginatedPublicReviewRecords,
  type PublicReviewRecord,
  type ReviewCommentStatus,
  type ReviewSummary,
  type UserReviewRecord,
} from "@/lib/review-core";

// Leave room for filters within D1's 100 bound parameters per statement.
const REVIEW_SLUG_BATCH_SIZE = 90;

// Better Auth leaves `banned` set after a timed ban ends until the user signs
// in again, so an expired ban counts as lifted here.
const authorNotBanned = sql`(coalesce(${user.banned}, 0) = 0 OR ${user.banExpires} <= cast(unixepoch('subsecond') * 1000 as integer))`;

/** Reviews that count toward averages and appear on public pages. */
const publicReview = and(eq(review.ratingStatus, "approved"), authorNotBanned);

export const getReviewSummaries = Effect.fn("Reviews.getReviewSummaries")(
  function* (itemType: ItemType, slugs: string[]) {
    const { reviews: reviewDb } = yield* ReviewDatabase;
    if (slugs.length === 0) return {};

    const rows = [];
    for (
      let offset = 0;
      offset < slugs.length;
      offset += REVIEW_SLUG_BATCH_SIZE
    ) {
      rows.push(
        ...(yield* reviewQuery("getReviewSummaries", () =>
          reviewDb
            .select({
              itemSlug: review.itemSlug,
              reviewCount: sql<number>`count(*)`,
              averageRating: sql<number>`round(avg(${review.rating}), 2)`,
            })
            .from(review)
            .innerJoin(user, eq(review.userId, user.id))
            .where(
              and(
                eq(review.itemType, itemType),
                publicReview,
                inArray(
                  review.itemSlug,
                  slugs.slice(offset, offset + REVIEW_SLUG_BATCH_SIZE),
                ),
              ),
            )
            .groupBy(review.itemSlug),
        )),
      );
    }

    const summaryMap: Record<string, ReviewSummary> = {};
    for (const slug of slugs) {
      summaryMap[slug] = emptyReviewSummary();
    }

    for (const row of rows) {
      summaryMap[row.itemSlug] = {
        averageRating: row.averageRating,
        reviewCount: row.reviewCount,
      };
    }

    return summaryMap;
  },
);

export const getUserReviews = Effect.fn("Reviews.getUserReviews")(function* (
  userId: string,
  itemType: ItemType,
  slugs: string[],
) {
  const { primary: db } = yield* ReviewDatabase;
  if (slugs.length === 0) return {};

  const rows = [];
  for (
    let offset = 0;
    offset < slugs.length;
    offset += REVIEW_SLUG_BATCH_SIZE
  ) {
    rows.push(
      ...(yield* reviewQuery("getUserReviews", () =>
        db
          .select({
            itemSlug: review.itemSlug,
            rating: review.rating,
            body: review.body,
            commentStatus: review.commentStatus,
            ratingStatus: review.ratingStatus,
          })
          .from(review)
          .where(
            and(
              eq(review.userId, userId),
              eq(review.itemType, itemType),
              inArray(
                review.itemSlug,
                slugs.slice(offset, offset + REVIEW_SLUG_BATCH_SIZE),
              ),
            ),
          ),
      )),
    );
  }

  const result: Record<string, UserReviewRecord> = Object.fromEntries(
    rows.map((row) => [
      row.itemSlug,
      {
        rating: row.rating,
        body: row.body,
        commentStatus: getEffectiveCommentStatus({
          body: row.body,
          commentStatus: row.commentStatus,
        }),
        ratingStatus: row.ratingStatus,
      },
    ]),
  );
  return result;
});

function getEffectiveCommentStatus({
  body,
  commentStatus,
}: {
  body: string | null;
  commentStatus: ReviewCommentStatus | null;
}): ReviewCommentStatus {
  if (!body?.trim()) {
    return "approved";
  }

  return commentStatus ?? "pending";
}

function getPublicComment({
  body,
  commentStatus,
}: {
  body: string | null;
  commentStatus: ReviewCommentStatus | null;
}): {
  body: string | null;
  commentStatus: ReviewCommentStatus;
} {
  const trimmedBody = body?.trim() || null;
  if (!trimmedBody) {
    return { body: null, commentStatus: "approved" };
  }

  if (commentStatus === "approved") {
    return { body: trimmedBody, commentStatus };
  }

  return {
    body: null,
    commentStatus: getEffectiveCommentStatus({ body, commentStatus }),
  };
}

export const getWrittenReviews = Effect.fn("Reviews.getWrittenReviews")(
  function* (
    itemType: ItemType,
    slug: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const { reviews: reviewDb } = yield* ReviewDatabase;
    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.max(1, options?.pageSize ?? 8);
    const offset = (page - 1) * pageSize;

    const rows = yield* reviewQuery("getWrittenReviews", () =>
      reviewDb
        .select({
          id: review.id,
          itemSlug: review.itemSlug,
          rating: review.rating,
          body: review.body,
          commentStatus: review.commentStatus,
          invited: review.invited,
          createdAt: review.createdAt,
          username: user.username,
          displayUsername: user.displayUsername,
          userEmail: user.email,
          userImage: user.image,
        })
        .from(review)
        .innerJoin(user, eq(review.userId, user.id))
        .where(
          and(
            eq(review.itemType, itemType),
            eq(review.itemSlug, slug),
            publicReview,
          ),
        )
        // The id breaks ties, so reviews created in the same millisecond keep
        // one order across pages instead of repeating or going missing.
        .orderBy(desc(review.createdAt), desc(review.id))
        .limit(pageSize)
        .offset(offset),
    );

    return rows.map((row): PublicReviewRecord => {
      const authorName = row.displayUsername ?? row.username ?? "User";
      const publicComment = getPublicComment({
        body: row.body,
        commentStatus: row.commentStatus,
      });

      return {
        id: row.id,
        itemSlug: row.itemSlug,
        rating: row.rating,
        body: publicComment.body,
        commentStatus: publicComment.commentStatus,
        invited: row.invited,
        createdAt: row.createdAt.toISOString(),
        authorName,
        authorImage: getAvatarUrl(row.userImage, row.userEmail),
      };
    });
  },
);

export const getPaginatedWrittenReviews = Effect.fn(
  "Reviews.getPaginatedWrittenReviews",
)(function* (
  itemType: ItemType,
  slug: string,
  totalCount: number,
  options?: {
    page?: number;
    pageSize?: number;
  },
) {
  const pageSize = Math.max(1, options?.pageSize ?? 8);
  const totalPages =
    totalCount === 0 ? 0 : Math.max(1, Math.ceil(totalCount / pageSize));
  const page =
    totalPages === 0
      ? 1
      : Math.min(Math.max(1, options?.page ?? 1), totalPages);
  const entries =
    totalCount === 0
      ? []
      : yield* getWrittenReviews(itemType, slug, {
          page,
          pageSize,
        });

  return {
    entries,
    page,
    pageSize,
    totalCount,
    totalPages,
  } satisfies PaginatedPublicReviewRecords;
});

export type PendingReviewCommentRecord = {
  id: string;
  itemType: ItemType;
  itemSlug: string;
  rating: number;
  /** Set when the comment waits for moderation. */
  body: string | null;
  /** The rating does not count until a moderator approves it. */
  ratingHeld: boolean;
  invited: boolean;
  createdAt: string;
  authorName: string;
  authorEmail: string | null;
  authorImage: string | null;
};

const PENDING_COMMENTS_LIMIT = 100;

const commentPending = and(
  or(eq(review.commentStatus, "pending"), isNull(review.commentStatus)),
  sql`trim(coalesce(${review.body}, '')) <> ''`,
);

export const getPendingReviewComments = Effect.fn(
  "Reviews.getPendingReviewComments",
)(function* () {
  const { primary: db } = yield* ReviewDatabase;
  const rows = yield* reviewQuery("getPendingReviewComments", () =>
    db
      .select({
        id: review.id,
        itemType: review.itemType,
        itemSlug: review.itemSlug,
        rating: review.rating,
        body: review.body,
        commentStatus: review.commentStatus,
        ratingStatus: review.ratingStatus,
        invited: review.invited,
        createdAt: review.createdAt,
        username: user.username,
        displayUsername: user.displayUsername,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(review)
      .innerJoin(user, eq(review.userId, user.id))
      .where(
        and(
          or(commentPending, eq(review.ratingStatus, "pending")),
          // Banned authors' reviews stay hidden, so they need no decision.
          authorNotBanned,
        ),
      )
      .orderBy(desc(review.createdAt))
      .limit(PENDING_COMMENTS_LIMIT),
  );

  return rows.map((row): PendingReviewCommentRecord => {
    const body = row.body?.trim() || null;
    return {
      id: row.id,
      itemType: row.itemType,
      itemSlug: row.itemSlug,
      rating: row.rating,
      body:
        body &&
        row.commentStatus !== "approved" &&
        row.commentStatus !== "rejected"
          ? body
          : null,
      ratingHeld: row.ratingStatus === "pending",
      invited: row.invited,
      createdAt: row.createdAt.toISOString(),
      authorName: row.displayUsername ?? row.username ?? "User",
      authorEmail: row.userEmail,
      authorImage: getAvatarUrl(row.userImage, row.userEmail),
    };
  });
});

export const updateReviewCommentStatus = Effect.fn(
  "Reviews.updateReviewCommentStatus",
)(function* (
  reviewId: string,
  decision: Extract<ReviewCommentStatus, "approved" | "rejected">,
  expectedBody: string,
) {
  const { reviews: reviewDb } = yield* ReviewDatabase;
  // Only moderate the text the admin saw. An edit since then resets the
  // comment to pending with a new body, and must be reviewed again. The
  // queue shows trimmed text, or none for a held rating without a comment.
  const sameBody = sql`trim(coalesce(${review.body}, '')) = ${expectedBody}`;
  const rows = yield* reviewQuery("moderate", () =>
    decision === "approved"
      ? reviewDb
          .update(review)
          .set({ commentStatus: "approved", ratingStatus: "approved" })
          .where(
            and(
              eq(review.id, reviewId),
              sameBody,
              or(commentPending, eq(review.ratingStatus, "pending")),
            ),
          )
          .returning({ id: review.id })
      : // A held rating is approved or removed as a whole, so rejecting only
        // its comment would leave a rating that no one can approve.
        reviewDb
          .update(review)
          .set({ commentStatus: "rejected" })
          .where(
            and(
              eq(review.id, reviewId),
              sameBody,
              commentPending,
              eq(review.ratingStatus, "approved"),
            ),
          )
          .returning({ id: review.id }),
  );
  return rows.length > 0;
});

export const removeReviewById = Effect.fn("Reviews.removeReviewById")(
  function* (reviewId: string) {
    const { reviews: reviewDb } = yield* ReviewDatabase;
    yield* reviewQuery("remove", () =>
      reviewDb.delete(review).where(eq(review.id, reviewId)),
    );
  },
);
