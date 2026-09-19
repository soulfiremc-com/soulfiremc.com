"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useReviewTurnstile } from "@/components/review-turnstile-provider";
import { useSession } from "@/lib/auth-hooks";
import {
  emptyReviewSummary,
  type ItemType,
  type PaginatedPublicReviewRecords,
  type ReviewSummary,
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
import { normalizeReviewSlugs, reviewsQueryOptions } from "@/lib/reviews-query";

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
  });
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
    () => withEmptySummaries(normalizedSlugs, reviewsQuery.data?.summaries),
    [normalizedSlugs, reviewsQuery.data?.summaries],
  );
  const writtenReviews = useMemo(() => {
    if (!includeWrittenReviews || normalizedSlugs.length !== 1) {
      return {};
    }

    return {
      [normalizedSlugs[0]]:
        reviewsQuery.data?.writtenReviews ??
        emptyWrittenReviews(writtenReviewsPage),
    };
  }, [
    includeWrittenReviews,
    normalizedSlugs,
    reviewsQuery.data?.writtenReviews,
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
      reviewsQuery.isPending ||
      queryClient.isMutating({
        mutationKey,
        exact: true,
        predicate: (mutation) =>
          selectReviewMutationSlug(mutation) === variables.slug,
      }) > 0
    ) {
      return { error: null };
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
      needsTurnstile: !reviewsQuery.data?.userReviews[slug],
    });

  const deleteReview = (slug: string) =>
    mutateReview({ action: "delete", slug });

  return {
    summaries,
    userReviews: reviewsQuery.data?.userReviews ?? {},
    writtenReviews,
    loading: reviewsQuery.isPending,
    pendingBySlug,
    upsertReview,
    deleteReview,
    refreshReviews,
  };
}
