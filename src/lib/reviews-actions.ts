import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHost } from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";
import { getShopBySlug } from "@/lib/accounts-data";
import { runWebsiteEffect } from "@/lib/effect-runtime";
import { getProviderBySlug } from "@/lib/proxies-data";
import type { ItemType } from "@/lib/review-core";
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

const itemTypeSchema = Schema.Literals(["account", "proxy", "resource"]);

const getReviewsInputSchema = Schema.Struct({
  itemType: itemTypeSchema,
  slugs: Schema.mutable(
    Schema.Array(Schema.String.check(Schema.isMinLength(1))),
  )
    .check(Schema.isMinLength(1))
    .check(Schema.isMaxLength(100)),
  includeWrittenReviews: Schema.Boolean.pipe(
    Schema.withDecodingDefaultType(Effect.succeed(false)),
  ),
  reviewsPage: Schema.Finite.check(Schema.isInt())
    .check(Schema.isGreaterThanOrEqualTo(1))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed(1))),
});

const submitReviewInputSchema = Schema.Struct({
  itemType: itemTypeSchema,
  itemSlug: Schema.String.check(Schema.isMinLength(1)).check(
    Schema.isMaxLength(100),
  ),
  rating: Schema.Finite.check(Schema.isInt())
    .check(Schema.isGreaterThanOrEqualTo(1))
    .check(Schema.isLessThanOrEqualTo(5)),
  // Omitted when only the rating changes, so the stored comment stays.
  body: Schema.optional(Schema.NullOr(Schema.String)),
  turnstileToken: Schema.NullOr(Schema.String).pipe(
    Schema.withDecodingDefaultType(Effect.succeed(null)),
  ),
});

const deleteReviewInputSchema = Schema.Struct({
  itemType: itemTypeSchema,
  itemSlug: Schema.String.check(Schema.isMinLength(1)),
});

const moderateReviewCommentInputSchema = Schema.Struct({
  reviewId: Schema.String.check(Schema.isUUID()),
  commentStatus: Schema.Literals(["approved", "rejected"]),
  body: Schema.String.check(Schema.isMaxLength(2000)),
});

/** Only listed shops and providers accept reviews. */
function isReviewableItem(itemType: ItemType, itemSlug: string) {
  switch (itemType) {
    case "account": {
      return getShopBySlug(itemSlug) !== undefined;
    }
    case "proxy": {
      return getProviderBySlug(itemSlug) !== undefined;
    }
    case "resource": {
      return false;
    }
    default: {
      return itemType satisfies never;
    }
  }
}

function readSessionUser(request: Request, disableCookieCache: boolean) {
  return Effect.tryPromise({
    try: () =>
      auth.api.getSession({
        headers: request.headers,
        query: { disableCookieCache },
      }),
    catch: (cause) => ReviewSessionError.make({ operation: "session", cause }),
  }).pipe(
    Effect.uninterruptible,
    Effect.map((session) => session?.user ?? null),
  );
}

function runReviewWorkflow<A, E>(
  program: Effect.Effect<A, E, ReviewSession | ReviewStore>,
  request: Request,
) {
  return runWebsiteEffect(
    program.pipe(
      Effect.provideService(ReviewStore, reviewStore),
      Effect.provideService(ReviewSession, {
        currentUser: readSessionUser(request, false),
        freshUser: readSessionUser(request, true),
      }),
    ),
    request.signal,
  );
}

export const getReviewsServerFn = createServerFn({ method: "GET" })
  .validator(Schema.toStandardSchemaV1(getReviewsInputSchema))
  .handler(({ data }): Promise<GetReviewsResult> =>
    runReviewWorkflow(getReviews(data), getRequest()),
  );

export const submitReviewServerFn = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(submitReviewInputSchema))
  .handler(({ data }): Promise<SubmitReviewResult> => {
    if (!isReviewableItem(data.itemType, data.itemSlug)) {
      throw new Error("This item cannot be reviewed.");
    }
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
  .validator(Schema.toStandardSchemaV1(moderateReviewCommentInputSchema))
  .handler(({ data }): Promise<ModerateReviewCommentResult> =>
    runReviewWorkflow(moderateReview(data), getRequest()),
  );

export const deleteReviewServerFn = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(deleteReviewInputSchema))
  .handler(({ data }): Promise<DeleteReviewResult> =>
    runReviewWorkflow(deleteReview(data), getRequest()),
  );
