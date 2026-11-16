import { queryOptions } from "@tanstack/react-query";
import {
  type ItemType,
  normalizeReviewSlugs,
  reviewsQueryKey,
} from "@/lib/review-core";
import { getReviewsServerFn } from "@/lib/reviews-actions";

type ReviewsQueryInput = {
  includeWrittenReviews?: boolean;
  itemType: ItemType;
  reviewsPage?: number;
  slugs: string[];
  viewerId?: string;
};

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
    queryKey: reviewsQueryKey({
      itemType,
      slugs: normalizedSlugs,
      includeWrittenReviews: includesWrittenReviews,
      reviewsPage: normalizedPage,
      viewerId,
    }),
    queryFn: () =>
      getReviewsServerFn({
        data: {
          itemType,
          slugs: normalizedSlugs,
          includeWrittenReviews: includesWrittenReviews,
          reviewsPage: normalizedPage,
        },
      }),
    // Fallback data from a storage failure should not hide reviews for long.
    staleTime: (query) => (query.state.data?.unavailable ? 0 : 60_000),
  });
}
