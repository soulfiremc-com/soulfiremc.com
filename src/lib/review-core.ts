import type { AggregateRating, Review as SchemaReview } from "schema-dts";

export type ItemType = "account" | "proxy" | "resource";

export function normalizeReviewSlugs(slugs: string[]) {
  return [
    ...new Set(slugs.map((slug) => slug.trim()).filter(Boolean)),
  ].toSorted();
}

/** Build the cache key for review data. Inputs must already be normalized. */
export function reviewsQueryKey({
  itemType,
  slugs,
  includeWrittenReviews,
  reviewsPage,
  viewerId,
}: {
  itemType: ItemType;
  slugs: string[];
  includeWrittenReviews: boolean;
  reviewsPage: number;
  viewerId?: string;
}) {
  return [
    "reviews",
    itemType,
    slugs,
    includeWrittenReviews,
    reviewsPage,
    viewerId ?? "anonymous",
  ] as const;
}

/** Whether two review query keys load the same items, ignoring page and viewer. */
export function isSameReviewItems(
  previousKey: readonly unknown[],
  nextKey: readonly unknown[],
) {
  return (
    previousKey[1] === nextKey[1] &&
    JSON.stringify(previousKey[2]) === JSON.stringify(nextKey[2]) &&
    previousKey[3] === nextKey[3]
  );
}

export type ReviewCommentStatus = "approved" | "pending" | "rejected";

export type ReviewRatingStatus = "approved" | "pending";

export type ReviewSummary = {
  averageRating: number | null;
  reviewCount: number;
};

export type ReviewSummaryStatus = "ready" | "loading" | "unavailable";

/** Loading or failed review data must not read as an item without ratings. */
export function getReviewSummaryStatus(query: {
  data: { unavailable?: true } | undefined;
  isPending: boolean;
}): ReviewSummaryStatus {
  if (query.isPending) return "loading";
  return query.data === undefined || query.data.unavailable === true
    ? "unavailable"
    : "ready";
}

export type UserReviewRecord = {
  rating: number;
  body: string | null;
  commentStatus: ReviewCommentStatus;
  /** Pending ratings do not count until a moderator approves them. */
  ratingStatus: ReviewRatingStatus;
};

export type PublicReviewRecord = {
  id: string;
  itemSlug: string;
  rating: number;
  body: string | null;
  commentStatus: ReviewCommentStatus;
  /** The reviewer arrived through the shop's review link. */
  invited: boolean;
  createdAt: string;
  authorName: string;
  authorImage: string | null;
};

export type PaginatedPublicReviewRecords = {
  entries: PublicReviewRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function emptyReviewSummary(): ReviewSummary {
  return {
    averageRating: null,
    reviewCount: 0,
  };
}

export function getAggregateRatingJsonLd(
  summary: ReviewSummary,
): AggregateRating | undefined {
  if (summary.reviewCount === 0 || summary.averageRating === null) {
    return undefined;
  }

  return {
    "@type": "AggregateRating",
    ratingValue: summary.averageRating,
    ratingCount: summary.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export function getReviewJsonLd(
  reviews: PublicReviewRecord[],
): SchemaReview[] | undefined {
  if (reviews.length === 0) {
    return undefined;
  }

  return reviews.map((entry) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: entry.authorName,
    },
    datePublished: entry.createdAt.slice(0, 10),
    ...(entry.body ? { reviewBody: entry.body } : {}),
    reviewRating: {
      "@type": "Rating",
      ratingValue: entry.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));
}

export function compareReviewSummaries(
  a: ReviewSummary | undefined,
  b: ReviewSummary | undefined,
  sort: "default" | "best-rated",
) {
  const ratingDifference = (b?.averageRating ?? 0) - (a?.averageRating ?? 0);
  const countDifference = (b?.reviewCount ?? 0) - (a?.reviewCount ?? 0);
  return sort === "best-rated"
    ? ratingDifference || countDifference
    : countDifference || ratingDifference;
}
