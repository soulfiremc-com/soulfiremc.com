import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHost } from "@tanstack/react-start/server";
import { Effect } from "effect";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { reviewStore } from "@/lib/review-store";
import {
  deleteReview,
  getPendingComments,
  getReviews,
  moderateReview,
  ReviewSession,
  ReviewSessionError,
  ReviewStore,
  ReviewVerification,
  submitReview,
  type DeleteReviewResult,
  type GetPendingReviewCommentsResult,
  type GetReviewsResult,
  type ModerateReviewCommentResult,
  type SubmitReviewResult,
} from "@/lib/review-workflows";
import {
  getExpectedTurnstileHostname,
  getTurnstileRemoteIp,
  REVIEW_TURNSTILE_ACTION,
  validateTurnstileTokenEffect,
} from "@/lib/turnstile";

export type {
  DeleteReviewResult,
  GetPendingReviewCommentsResult,
  GetReviewsResult,
  ModerateReviewCommentResult,
  SubmitReviewResult,
} from "@/lib/review-workflows";

const itemTypeSchema = z.enum(["account", "proxy", "resource"]);

const getReviewsInputSchema = z.object({
  itemType: itemTypeSchema,
  slugs: z.array(z.string().min(1)).min(1).max(100),
  includeWrittenReviews: z.boolean().default(false),
  reviewsPage: z.number().int().min(1).default(1),
});

const submitReviewInputSchema = z.object({
  itemType: itemTypeSchema,
  itemSlug: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().nullable().default(null),
  turnstileToken: z.string().nullable().default(null),
});

const deleteReviewInputSchema = z.object({
  itemType: itemTypeSchema,
  itemSlug: z.string().min(1),
});

const moderateReviewCommentInputSchema = z.object({
  reviewId: z.string().uuid(),
  commentStatus: z.enum(["approved", "rejected"]),
});

function runReviewWorkflow<A, E>(
  program: Effect.Effect<A, E, ReviewSession | ReviewStore>,
  request: Request,
) {
  return Effect.runPromise(
    program.pipe(
      Effect.provideService(ReviewStore, reviewStore),
      Effect.provideService(ReviewSession, {
        currentUser: Effect.tryPromise({
          try: () => auth.api.getSession({ headers: request.headers }),
          catch: (cause) =>
            new ReviewSessionError({ operation: "session", cause }),
        }).pipe(Effect.map((session) => session?.user ?? null)),
      }),
    ),
  );
}

export const getReviewsServerFn = createServerFn({ method: "GET" })
  .validator(getReviewsInputSchema)
  .handler(({ data }): Promise<GetReviewsResult> =>
    runReviewWorkflow(getReviews(data), getRequest()),
  );

export const submitReviewServerFn = createServerFn({ method: "POST" })
  .validator(submitReviewInputSchema)
  .handler(({ data }): Promise<SubmitReviewResult> => {
    const request = getRequest();
    return runReviewWorkflow(
      submitReview(data).pipe(
        Effect.provideService(ReviewVerification, {
          verify: validateTurnstileTokenEffect({
            token: data.turnstileToken ?? "",
            remoteIp: getTurnstileRemoteIp(request.headers),
            expectedAction: REVIEW_TURNSTILE_ACTION,
            expectedHostname: getExpectedTurnstileHostname(getRequestHost()),
          }),
        }),
      ),
      request,
    );
  });

export const getPendingReviewCommentsServerFn = createServerFn({
  method: "GET",
}).handler((): Promise<GetPendingReviewCommentsResult> =>
  runReviewWorkflow(getPendingComments, getRequest()),
);

export const moderateReviewCommentServerFn = createServerFn({ method: "POST" })
  .validator(moderateReviewCommentInputSchema)
  .handler(({ data }): Promise<ModerateReviewCommentResult> =>
    runReviewWorkflow(moderateReview(data), getRequest()),
  );

export const deleteReviewServerFn = createServerFn({ method: "POST" })
  .validator(deleteReviewInputSchema)
  .handler(({ data }): Promise<DeleteReviewResult> =>
    runReviewWorkflow(deleteReview(data), getRequest()),
  );
