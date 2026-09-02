import { queryOptions } from "@tanstack/react-query";
import type { ItemType } from "@/lib/review-core";
import { getReviewsServerFn } from "@/lib/reviews-actions";

type ReviewsQueryInput = {
  includeWrittenReviews?: boolean;
  itemType: ItemType;
  reviewsPage?: number;
  slugs: string[];
  viewerId?: string;
};

export function normalizeReviewSlugs(slugs: string[]) {
  return [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))].sort();
}

export function reviewsQueryOptions({
  includeWrittenReviews = false,
  itemType,
  reviewsPage = 1,
  slugs,
  viewerId,
}: ReviewsQueryInput) {
  const normalizedSlugs = normalizeReviewSlugs(slugs);
  const normalizedPage = Math.max(1, reviewsPage);
  const includesWrittenReviews =
    includeWrittenReviews && normalizedSlugs.length === 1;

  return queryOptions({
    queryKey: [
      "reviews",
      itemType,
      normalizedSlugs,
      includesWrittenReviews,
      normalizedPage,
      viewerId ?? "anonymous",
    ],
    queryFn: () =>
      getReviewsServerFn({
        data: {
          itemType,
          slugs: normalizedSlugs,
          includeWrittenReviews: includesWrittenReviews,
          reviewsPage: normalizedPage,
        },
      }),
    staleTime: 60_000,
  });
}
