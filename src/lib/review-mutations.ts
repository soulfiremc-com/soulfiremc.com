import {
  type Mutation,
  mutationOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { Data, Effect } from "effect";
import { ReviewChallengeError } from "@/lib/review-challenge";
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

class ReviewMutationRequestError extends Data.TaggedError(
  "ReviewMutationRequestError",
)<{
  readonly operation: "submit" | "delete" | "refresh";
  readonly cause: unknown;
}> {}

function request<A>(
  operation: ReviewMutationRequestError["operation"],
  run: () => PromiseLike<A>,
) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new ReviewMutationRequestError({ operation, cause }),
  });
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
  const mutateReview = Effect.fn("reviewMutation")(function* (
    variables: ReviewMutationVariables,
  ) {
    const data = { itemType, itemSlug: variables.slug };
    if (variables.action === "delete") {
      const result = yield* request("delete", () => deleteReview({ data }));
      return { error: result.ok ? null : result.error };
    }

    const turnstileToken = variables.needsTurnstile
      ? yield* Effect.tryPromise({
          try: executeTurnstile,
          catch: (cause) =>
            new ReviewChallengeError({
              message: "Cloudflare Turnstile could not verify this review.",
              cause,
            }),
        })
      : null;
    const result = yield* request("submit", () =>
      submitReview({
        data: {
          ...data,
          rating: variables.rating,
          body: variables.body ?? null,
          turnstileToken,
        },
      }),
    );
    return { error: result.ok ? null : result.error };
  });

  return mutationOptions({
    mutationKey: reviewMutationKey(itemType, viewerId),
    retry: false,
    // Do not queue a verification challenge to replay when connectivity returns.
    networkMode: "always",
    mutationFn: (
      variables: ReviewMutationVariables,
    ): Promise<ReviewMutationResult> =>
      Effect.runPromise(
        mutateReview(variables).pipe(
          Effect.catchTag("ReviewChallengeError", () =>
            Effect.succeed({ error: "verification" } as const),
          ),
          // Keep the original transport failure at the React Query boundary.
          Effect.mapError((error) => error.cause),
        ),
      ),
    onSuccess: (result) =>
      Effect.runPromise(
        (result.error === null
          ? request("refresh", () =>
              queryClient.invalidateQueries({
                queryKey: ["reviews", itemType],
              }),
            )
          : Effect.void
        ).pipe(Effect.mapError((error) => error.cause)),
      ),
  });
}
