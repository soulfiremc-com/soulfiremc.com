import {
  type Mutation,
  mutationOptions,
  type QueryClient,
} from "@tanstack/react-query";
import type { ItemType } from "@/lib/review-core";
import type {
  deleteReviewServerFn,
  submitReviewServerFn,
} from "@/lib/reviews-actions";

export type ReviewMutationResult = {
  error: "unauthorized" | "verification" | null;
};

export type ReviewMutationVariables = { slug: string } & (
  | { action: "delete" }
  | {
      action: "upsert";
      rating: number;
      body?: string | null;
      needsTurnstile: boolean;
    }
);

export function reviewMutationKey(itemType: ItemType, viewerId?: string) {
  return ["review-mutation", itemType, viewerId ?? "anonymous"] as const;
}

export function selectReviewMutationSlug(mutation: Mutation) {
  return (mutation.state.variables as ReviewMutationVariables).slug;
}

export function reviewMutationOptions({
  itemType,
  viewerId,
  queryClient,
  executeTurnstile,
  submitReview,
  deleteReview,
}: {
  itemType: ItemType;
  viewerId?: string;
  queryClient: QueryClient;
  executeTurnstile: () => Promise<string>;
  submitReview: (
    options: Parameters<typeof submitReviewServerFn>[0],
  ) => ReturnType<typeof submitReviewServerFn>;
  deleteReview: (
    options: Parameters<typeof deleteReviewServerFn>[0],
  ) => ReturnType<typeof deleteReviewServerFn>;
}) {
  return mutationOptions({
    mutationKey: reviewMutationKey(itemType, viewerId),
    retry: false,
    // Do not queue a verification challenge to replay when connectivity returns.
    networkMode: "always",
    mutationFn: async (
      variables: ReviewMutationVariables,
    ): Promise<ReviewMutationResult> => {
      const data = { itemType, itemSlug: variables.slug };
      if (variables.action === "delete") {
        const result = await deleteReview({ data });
        return { error: result.ok ? null : result.error };
      }

      let turnstileToken: string | null = null;
      if (variables.needsTurnstile) {
        try {
          turnstileToken = await executeTurnstile();
        } catch {
          return { error: "verification" };
        }
      }

      const result = await submitReview({
        data: {
          ...data,
          rating: variables.rating,
          body: variables.body ?? null,
          turnstileToken,
        },
      });
      return { error: result.ok ? null : result.error };
    },
    onSuccess: async (result) => {
      if (result.error === null) {
        await queryClient.invalidateQueries({
          queryKey: ["reviews", itemType],
        });
      }
    },
  });
}
