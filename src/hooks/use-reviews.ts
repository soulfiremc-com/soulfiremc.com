"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useHydratedQueryResult } from "@/hooks/use-hydrated-query-result";
import { useReviewTurnstile } from "@/components/review-turnstile-provider";
import { useSession } from "@/lib/auth-hooks";
import {
  emptyReviewSummary,
  isSameReviewItems,
  type ItemType,
  normalizeReviewSlugs,
  type PaginatedPublicReviewRecords,
  type ReviewSummary,
  type ReviewSummaryStatus,
} from "@/lib/review-core";
import {
  type ReviewMutationResult,
  type ReviewMutationVariables,
  reviewMutationKey,
  reviewMutationOptions,
  selectReviewMutationSlug,
} from "@/lib/review-mutations";
import {
  deleteReviewServerFn,
  submitReviewServerFn,
} from "@/lib/reviews-actions";
import { reviewsQueryOptions } from "@/lib/reviews-query";

type UseReviewsOptions = {
  includeWrittenReviews?: boolean;
  writtenReviewsPage?: number;
};

function withEmptySummaries(
  slugs: string[],
  summaries?: Record<string, ReviewSummary>,
) {
  return Object.fromEntries(
    slugs.map((slug) => [slug, summaries?.[slug] ?? emptyReviewSummary()]),
  );
}

function emptyWrittenReviews(page: number): PaginatedPublicReviewRecords {
  return {
    entries: [],
    page,
    pageSize: 8,
    totalCount: 0,
    totalPages: 0,
  };
}

export function useReviews(
  itemType: ItemType,
  slugs: string[],
  options?: UseReviewsOptions,
) {
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const { executeTurnstile } = useReviewTurnstile();
  const includeWrittenReviews = options?.includeWrittenReviews ?? false;
  const writtenReviewsPage = Math.max(1, options?.writtenReviewsPage ?? 1);
  const normalizedSlugs = useMemo(() => normalizeReviewSlugs(slugs), [slugs]);
  const queryOptions = reviewsQueryOptions({
    itemType,
    slugs: normalizedSlugs,
    includeWrittenReviews,
    reviewsPage: writtenReviewsPage,
    viewerId: session?.user.id,
  });
  const reviewsQuery = useQuery({
    ...queryOptions,
    enabled: normalizedSlugs.length > 0,
    // Keep the current reviews visible while another page or the signed-in
    // view of the same items loads. Never reuse data from other items.
    placeholderData: (previousData, previousQuery) =>
      previousQuery &&
      isSameReviewItems(previousQuery.queryKey, queryOptions.queryKey)
        ? previousData
        : undefined,
  });
  const { data: reviewsData, isPending: loading } =
    useHydratedQueryResult(reviewsQuery);
  const refreshing = !loading && reviewsQuery.isPlaceholderData;
  // Storage failures return empty fallback data. Transport failures leave no
  // data. Neither result may read as an item without reviews.
  const failed =
    !loading &&
    (reviewsData?.unavailable === true ||
      (reviewsQuery.isError && reviewsData === undefined));
  const summaryStatus: ReviewSummaryStatus = loading
    ? "loading"
    : failed
      ? "unavailable"
      : "ready";
  const retrying = failed && reviewsQuery.isFetching;
  const retryReviews = useCallback(() => {
    // Page headers read the same reviews through their own query.
    void queryClient.refetchQueries({
      queryKey: ["reviews", itemType],
      type: "active",
    });
  }, [itemType, queryClient]);
  const mutationKey = reviewMutationKey(itemType, session?.user.id);
  const { mutateAsync } = useMutation(
    reviewMutationOptions({
      itemType,
      viewerId: session?.user.id,
      queryClient,
      executeTurnstile,
      submitReview: submitReviewServerFn,
      deleteReview: deleteReviewServerFn,
    }),
  );
  const pendingSlugs = useMutationState({
    filters: { mutationKey, exact: true, status: "pending" },
    select: selectReviewMutationSlug,
  });
  const pendingBySlug = useMemo<Record<string, boolean>>(
    () => Object.fromEntries(pendingSlugs.map((slug) => [slug, true])),
    [pendingSlugs],
  );

  const summaries = useMemo(
    () => withEmptySummaries(normalizedSlugs, reviewsData?.summaries),
    [normalizedSlugs, reviewsData?.summaries],
  );
  const writtenReviews = useMemo(() => {
    if (!includeWrittenReviews || normalizedSlugs.length !== 1) {
      return {};
    }

    return {
      [normalizedSlugs[0]]:
        reviewsData?.writtenReviews ?? emptyWrittenReviews(writtenReviewsPage),
    };
  }, [
    includeWrittenReviews,
    normalizedSlugs,
    reviewsData?.writtenReviews,
    writtenReviewsPage,
  ]);

  const refreshReviews = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["reviews", itemType],
    });
  }, [itemType, queryClient]);

  const mutateReview = async (
    variables: ReviewMutationVariables,
  ): Promise<ReviewMutationResult> => {
    if (!session?.user && !sessionPending) {
      return { error: "unauthorized" };
    }

    if (
      loading ||
      refreshing ||
      queryClient.isMutating({
        mutationKey,
        exact: true,
        predicate: (mutation) =>
          selectReviewMutationSlug(mutation) === variables.slug,
      }) > 0
    ) {
      return { error: null, skipped: true };
    }

    return mutateAsync(variables);
  };

  const upsertReview = (
    slug: string,
    nextReview: { rating: number; body?: string | null },
  ) =>
    mutateReview({
      action: "upsert",
      slug,
      ...nextReview,
      needsTurnstile: !reviewsData?.userReviews[slug],
    });

  const deleteReview = (slug: string) =>
    mutateReview({ action: "delete", slug });

  return {
    summaries,
    userReviews: reviewsData?.userReviews ?? {},
    writtenReviews,
    loading,
    refreshing,
    failed,
    summaryStatus,
    retrying,
    retryReviews,
    pendingBySlug,
    upsertReview,
    deleteReview,
    refreshReviews,
  };
}
