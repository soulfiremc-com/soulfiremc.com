import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getAvatarUrl } from "@/lib/avatar";
import { db } from "@/lib/db";
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

export async function getReviewSummaries(
  itemType: ItemType,
  slugs: string[],
): Promise<Record<string, ReviewSummary>> {
  if (slugs.length === 0) return {};

  const rows = await db
    .select({
      itemSlug: review.itemSlug,
      reviewCount: sql<number>`count(*)::int`,
      averageRating: sql<number>`round(avg(${review.rating})::numeric, 2)::float8`,
    })
    .from(review)
    .where(and(eq(review.itemType, itemType), inArray(review.itemSlug, slugs)))
    .groupBy(review.itemSlug);

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
}

export async function getUserReviews(
  userId: string,
  itemType: ItemType,
  slugs: string[],
): Promise<Record<string, UserReviewRecord>> {
  if (slugs.length === 0) return {};

  const rows = await db
    .select({
      itemSlug: review.itemSlug,
      rating: review.rating,
      body: review.body,
      commentStatus: review.commentStatus,
    })
    .from(review)
    .where(
      and(
        eq(review.userId, userId),
        eq(review.itemType, itemType),
        inArray(review.itemSlug, slugs),
      ),
    );

  return Object.fromEntries(
    rows.map((row) => [
      row.itemSlug,
      {
        rating: row.rating,
        body: row.body,
        commentStatus: getEffectiveCommentStatus({
          body: row.body,
          commentStatus: row.commentStatus,
        }),
      },
    ]),
  );
}

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

export async function getWrittenReviews(
  itemType: ItemType,
  slug: string,
  options?: {
    page?: number;
    pageSize?: number;
  },
): Promise<PublicReviewRecord[]> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 8);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: review.id,
      itemSlug: review.itemSlug,
      rating: review.rating,
      body: review.body,
      commentStatus: review.commentStatus,
      createdAt: review.createdAt,
      username: user.username,
      displayUsername: user.displayUsername,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(review)
    .leftJoin(user, eq(review.userId, user.id))
    .where(and(eq(review.itemType, itemType), eq(review.itemSlug, slug)))
    .orderBy(desc(review.createdAt))
    .limit(pageSize)
    .offset(offset);

  return rows.map((row) => {
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
      createdAt: row.createdAt.toISOString(),
      authorName,
      authorImage: getAvatarUrl(row.userImage, row.userEmail),
    };
  });
}

export async function getPaginatedWrittenReviews(
  itemType: ItemType,
  slug: string,
  totalCount: number,
  options?: {
    page?: number;
    pageSize?: number;
  },
): Promise<PaginatedPublicReviewRecords> {
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
      : await getWrittenReviews(itemType, slug, {
          page,
          pageSize,
        });

  return {
    entries,
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

export type PendingReviewCommentRecord = {
  id: string;
  itemType: ItemType;
  itemSlug: string;
  rating: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorEmail: string | null;
  authorImage: string | null;
};

export async function getPendingReviewComments(): Promise<
  PendingReviewCommentRecord[]
> {
  const rows = await db
    .select({
      id: review.id,
      itemType: review.itemType,
      itemSlug: review.itemSlug,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      username: user.username,
      displayUsername: user.displayUsername,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(review)
    .leftJoin(user, eq(review.userId, user.id))
    .where(
      and(
        or(eq(review.commentStatus, "pending"), isNull(review.commentStatus)),
        sql`${review.body} IS NOT NULL`,
        sql`btrim(${review.body}) <> ''`,
      ),
    )
    .orderBy(desc(review.createdAt));

  return rows.flatMap((row) => {
    const body = row.body?.trim();
    if (!body) {
      return [];
    }

    return [
      {
        id: row.id,
        itemType: row.itemType,
        itemSlug: row.itemSlug,
        rating: row.rating,
        body,
        createdAt: row.createdAt.toISOString(),
        authorName: row.displayUsername ?? row.username ?? "User",
        authorEmail: row.userEmail,
        authorImage: getAvatarUrl(row.userImage, row.userEmail),
      },
    ];
  });
}

export async function updateReviewCommentStatus(
  reviewId: string,
  commentStatus: Extract<ReviewCommentStatus, "approved" | "rejected">,
) {
  await db.update(review).set({ commentStatus }).where(eq(review.id, reviewId));
}
