import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHost } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { review } from "@/lib/db/schema";
import type {
  PaginatedPublicReviewRecords,
  ReviewCommentStatus,
  ReviewSummary,
  UserReviewRecord,
} from "@/lib/review-core";
import {
  getPaginatedWrittenReviews,
  getPendingReviewComments,
  getReviewSummaries,
  getUserReviews,
  type PendingReviewCommentRecord,
  updateReviewCommentStatus,
} from "@/lib/reviews";
import {
  getExpectedTurnstileHostname,
  getTurnstileRemoteIp,
  REVIEW_TURNSTILE_ACTION,
  validateTurnstileToken,
} from "@/lib/turnstile";

const REVIEWS_PAGE_SIZE = 8;

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
  anonymous: z.boolean().default(true),
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

export type GetReviewsResult = {
  summaries: Record<string, ReviewSummary>;
  userReviews: Record<string, UserReviewRecord>;
  writtenReviews?: PaginatedPublicReviewRecords;
};

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" }
  | { ok: false; error: "verification"; errorCodes: string[] };

export type DeleteReviewResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" };

export type GetPendingReviewCommentsResult =
  | { ok: true; comments: PendingReviewCommentRecord[] }
  | { ok: false; error: "unauthorized" };

export type ModerateReviewCommentResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" };

function normalizeBody(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, 2_000);
}

function hasAdminRole(role: string | null | undefined): boolean {
  return (
    role
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .includes("admin") ?? false
  );
}

async function getAdminSession() {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });

  if (!session?.user || !hasAdminRole(session.user.role)) {
    return null;
  }

  return session;
}

function getSubmittedCommentStatus({
  existingBody,
  existingCommentStatus,
  nextBody,
}: {
  existingBody?: string | null;
  existingCommentStatus?: ReviewCommentStatus | null;
  nextBody: string | null;
}): ReviewCommentStatus {
  if (!nextBody) {
    return "approved";
  }

  if (
    existingCommentStatus === "approved" &&
    (existingBody?.trim() || null) === nextBody
  ) {
    return "approved";
  }

  return "pending";
}

export const getReviewsServerFn = createServerFn({ method: "GET" })
  .validator(getReviewsInputSchema)
  .handler(async ({ data }): Promise<GetReviewsResult> => {
    const slugs = data.slugs.map((slug) => slug.trim()).filter(Boolean);
    if (slugs.length === 0) {
      return { summaries: {}, userReviews: {} };
    }

    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });

    try {
      const [summaries, userReviews] = await Promise.all([
        getReviewSummaries(data.itemType, slugs),
        session?.user
          ? getUserReviews(session.user.id, data.itemType, slugs)
          : {},
      ]);

      const writtenReviews =
        data.includeWrittenReviews && slugs.length === 1
          ? await getPaginatedWrittenReviews(
              data.itemType,
              slugs[0],
              summaries[slugs[0]]?.reviewCount ?? 0,
              {
                page: data.reviewsPage,
                pageSize: REVIEWS_PAGE_SIZE,
              },
            )
          : undefined;

      return { summaries, userReviews, writtenReviews };
    } catch {
      const summaries = Object.fromEntries(
        slugs.map((slug) => [
          slug,
          { averageRating: null, reviewCount: 0 } satisfies ReviewSummary,
        ]),
      );
      const writtenReviews =
        data.includeWrittenReviews && slugs.length === 1
          ? {
              entries: [],
              page: data.reviewsPage,
              pageSize: REVIEWS_PAGE_SIZE,
              totalCount: 0,
              totalPages: 0,
            }
          : undefined;

      return { summaries, userReviews: {}, writtenReviews };
    }
  });

export const submitReviewServerFn = createServerFn({ method: "POST" })
  .validator(submitReviewInputSchema)
  .handler(async ({ data }): Promise<SubmitReviewResult> => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, error: "unauthorized" };
    }

    const existing = await db
      .select({
        id: review.id,
        body: review.body,
        commentStatus: review.commentStatus,
      })
      .from(review)
      .where(
        and(
          eq(review.userId, session.user.id),
          eq(review.itemType, data.itemType),
          eq(review.itemSlug, data.itemSlug),
        ),
      )
      .limit(1);

    const normalizedBody = normalizeBody(data.body);
    const commentStatus = getSubmittedCommentStatus({
      existingBody: existing[0]?.body,
      existingCommentStatus: existing[0]?.commentStatus,
      nextBody: normalizedBody,
    });

    if (existing.length === 0) {
      const turnstileValidation = await validateTurnstileToken({
        token: data.turnstileToken ?? "",
        remoteIp: getTurnstileRemoteIp(request.headers),
        expectedAction: REVIEW_TURNSTILE_ACTION,
        expectedHostname: getExpectedTurnstileHostname(getRequestHost()),
      });

      if (!turnstileValidation.success) {
        return {
          ok: false,
          error: "verification",
          errorCodes: turnstileValidation.errorCodes,
        };
      }

      await db.insert(review).values({
        body: normalizedBody,
        commentStatus,
        itemSlug: data.itemSlug,
        itemType: data.itemType,
        rating: data.rating,
        userId: session.user.id,
      });
    } else {
      await db
        .update(review)
        .set({ rating: data.rating, body: normalizedBody, commentStatus })
        .where(eq(review.id, existing[0].id));
    }

    return { ok: true };
  });

export const getPendingReviewCommentsServerFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<GetPendingReviewCommentsResult> => {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false, error: "unauthorized" };
  }

  return {
    ok: true,
    comments: await getPendingReviewComments(),
  };
});

export const moderateReviewCommentServerFn = createServerFn({ method: "POST" })
  .validator(moderateReviewCommentInputSchema)
  .handler(async ({ data }): Promise<ModerateReviewCommentResult> => {
    const session = await getAdminSession();
    if (!session) {
      return { ok: false, error: "unauthorized" };
    }

    await updateReviewCommentStatus(data.reviewId, data.commentStatus);

    return { ok: true };
  });

export const deleteReviewServerFn = createServerFn({ method: "POST" })
  .validator(deleteReviewInputSchema)
  .handler(async ({ data }): Promise<DeleteReviewResult> => {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });
    if (!session?.user) {
      return { ok: false, error: "unauthorized" };
    }

    await db
      .delete(review)
      .where(
        and(
          eq(review.userId, session.user.id),
          eq(review.itemType, data.itemType),
          eq(review.itemSlug, data.itemSlug),
        ),
      );

    return { ok: true };
  });
