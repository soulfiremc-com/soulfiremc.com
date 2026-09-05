"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useReviewTurnstile } from "@/components/review-turnstile-provider";
import { useSession } from "@/lib/auth-hooks";
import {
  emptyReviewSummary,
  type ItemType,
  type PaginatedPublicReviewRecords,
  type ReviewSummary,
} from "@/lib/review-core";
import {
  deleteReviewServerFn,
  submitReviewServerFn,
} from "@/lib/reviews-actions";
import { normalizeReviewSlugs, reviewsQueryOptions } from "@/lib/reviews-query";

type UseReviewsOptions = {
  includeWrittenReviews?: boolean;
  writtenReviewsPage?: number;
};

type MutationError = "unauthorized" | "verification" | null;

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
  const [pendingBySlug, setPendingBySlug] = useState<Record<string, boolean>>(
    {},
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

  const setPending = useCallback((slug: string, value: boolean) => {
    setPendingBySlug((current) => ({ ...current, [slug]: value }));
  }, []);

  const upsertReview = useCallback(
    async (
      slug: string,
      nextReview: {
        rating: number;
        body?: string | null;
      },
    ): Promise<{ error: MutationError }> => {
      if (!session?.user && !sessionPending) {
        return { error: "unauthorized" };
      }

      if (reviewsQuery.isPending || pendingBySlug[slug]) {
        return { error: null };
      }

      const needsTurnstile = !reviewsQuery.data?.userReviews[slug];
      let turnstileToken: string | null = null;

      setPending(slug, true);

      if (needsTurnstile) {
        try {
          turnstileToken = await executeTurnstile();
        } catch {
          setPending(slug, false);
          return { error: "verification" };
        }
      }

      try {
        const result = await submitReviewServerFn({
          data: {
            itemType,
            itemSlug: slug,
            rating: nextReview.rating,
            body: nextReview.body ?? null,
            turnstileToken,
          },
        });

        if (!result.ok) {
          return { error: result.error };
        }

        await refreshReviews();
        return { error: null };
      } finally {
        setPending(slug, false);
      }
    },
    [
      executeTurnstile,
      itemType,
      pendingBySlug,
      refreshReviews,
      reviewsQuery.data?.userReviews,
      reviewsQuery.isPending,
      session?.user,
      sessionPending,
      setPending,
    ],
  );

  const deleteReview = useCallback(
    async (slug: string): Promise<{ error: MutationError }> => {
      if (!session?.user && !sessionPending) {
        return { error: "unauthorized" };
      }

      if (reviewsQuery.isPending || pendingBySlug[slug]) {
        return { error: null };
      }

      setPending(slug, true);

      try {
        const result = await deleteReviewServerFn({
          data: {
            itemType,
            itemSlug: slug,
          },
        });

        if (!result.ok) {
          return { error: result.error };
        }

        await refreshReviews();
        return { error: null };
      } finally {
        setPending(slug, false);
      }
    },
    [
      itemType,
      pendingBySlug,
      refreshReviews,
      reviewsQuery.isPending,
      session?.user,
      sessionPending,
      setPending,
    ],
  );

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
