"use client";

import { Schema } from "effect";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  Inbox,
  type LucideIcon,
  RotateCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { type ReactNode, type SubmitEvent, useCallback } from "react";
import { toast } from "sonner";
import { AdminRemoveReviewButton } from "@/components/admin-remove-review-button";
import { ReviewStars } from "@/components/review-stars";
import { CustomTimeAgo } from "@/components/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { type Locale, localizePath } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n-react";
import type { MessageKey } from "@/lib/messages";
import type { ItemType } from "@/lib/review-core";
import {
  type GetPendingReviewCommentsResult,
  getPendingReviewCommentsServerFn,
  moderateReviewCommentServerFn,
} from "@/lib/reviews-actions";
import { generateN } from "@/lib/utils";

const pendingReviewCommentsQueryKey = ["admin", "pending-reviews"] as const;

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class ModerationAccessError extends Schema.TaggedError<
  ModerationAccessError,
  { readonly brand: unique symbol }
>()("ModerationAccessError", {}) {}
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class ModerationStaleError extends Schema.TaggedError<
  ModerationStaleError,
  { readonly brand: unique symbol }
>()("ModerationStaleError", {}) {}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

const itemTypeLabelKeys = {
  account: "admin.reviews.itemType.account",
  proxy: "admin.reviews.itemType.proxy",
  resource: "admin.reviews.itemType.resource",
} as const satisfies Record<ItemType, MessageKey>;

function getItemPath(itemType: ItemType, itemSlug: string, locale: Locale) {
  switch (itemType) {
    case "account": {
      return localizePath(`/get-accounts/${itemSlug}`, locale);
    }
    case "proxy": {
      return localizePath(`/get-proxies/${itemSlug}`, locale);
    }
    case "resource": {
      return null;
    }
    default: {
      return itemType satisfies never;
    }
  }
}

function ReviewModerationSkeleton() {
  return (
    <div className="grid gap-4">
      {generateN(2).map((skeletonId) => (
        <Card key={skeletonId} className="gap-5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
          <CardFooter className="gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function ReviewModerationState({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Empty className="min-h-64 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export function ReviewModeration() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const pendingReviews = useQuery({
    queryKey: pendingReviewCommentsQueryKey,
    queryFn: () => getPendingReviewCommentsServerFn(),
  });
  const dropFromQueue = useCallback(
    (reviewId: string) => {
      queryClient.setQueryData<GetPendingReviewCommentsResult>(
        pendingReviewCommentsQueryKey,
        (current) =>
          current?.ok
            ? {
                ...current,
                comments: current.comments.filter(
                  (comment) => comment.id !== reviewId,
                ),
              }
            : current,
      );
    },
    [queryClient],
  );
  const moderation = useMutation({
    mutationFn: async ({
      body,
      commentStatus,
      reviewId,
    }: {
      body: string;
      commentStatus: "approved" | "rejected";
      reviewId: string;
    }) => {
      const result = await moderateReviewCommentServerFn({
        data: { body, commentStatus, reviewId },
      });

      if (!result.ok) {
        throw result.error === "stale"
          ? ModerationStaleError.make()
          : ModerationAccessError.make();
      }
    },
    onError: (error) => {
      if (error instanceof ModerationStaleError) {
        toast.error(t("admin.reviews.stale.title"), {
          description: t("admin.reviews.stale.description"),
        });
        void queryClient.invalidateQueries({
          queryKey: pendingReviewCommentsQueryKey,
        });
        return;
      }
      // Request and validation errors are not useful to show as raw text.
      toast.error(t("admin.reviews.moderateFailed"), {
        description: t(
          error instanceof ModerationAccessError
            ? "admin.reviews.noAdminAccess"
            : "reviews.errors.connectionDescription",
        ),
      });
    },
    onSuccess: (_, variables) => {
      dropFromQueue(variables.reviewId);
      // Public review pages cache comments, so refresh them after moderation.
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast(
        t(
          variables.commentStatus === "approved"
            ? "admin.reviews.approved"
            : "admin.reviews.rejected",
        ),
      );
    },
  });
  const moderateReview = moderation.mutate;

  const moderateComment = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitter = event.nativeEvent.submitter;

      if (!(submitter instanceof HTMLButtonElement)) {
        return;
      }

      const formData = new FormData(event.currentTarget);
      const reviewId = formData.get("reviewId");
      const body = formData.get("body");
      const commentStatus = submitter.value;
      if (
        typeof reviewId !== "string" ||
        typeof body !== "string" ||
        (commentStatus !== "approved" && commentStatus !== "rejected")
      ) {
        return;
      }

      moderateReview({ body, commentStatus, reviewId });
    },
    [moderateReview],
  );

  const pendingReviewId = moderation.isPending
    ? moderation.variables.reviewId
    : undefined;
  const pendingReviewStatus = moderation.isPending
    ? moderation.variables.commentStatus
    : undefined;
  const result = pendingReviews.data;

  return pendingReviews.isPending ? (
    <ReviewModerationSkeleton />
  ) : pendingReviews.isError ? (
    <ReviewModerationState
      icon={ShieldAlert}
      title={t("admin.reviews.loadFailed")}
      description={t("reviews.errors.connectionDescription")}
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => void pendingReviews.refetch()}
          disabled={pendingReviews.isFetching}
        >
          <RotateCw data-icon="inline-start" />
          {t("errors.tryAgain")}
        </Button>
      }
    />
  ) : !result?.ok ? (
    <ReviewModerationState
      icon={ShieldAlert}
      title={t("admin.reviews.accessRequired.title")}
      description={t("admin.reviews.accessRequired.description")}
    />
  ) : result.comments.length === 0 ? (
    <ReviewModerationState
      icon={Inbox}
      title={t("admin.reviews.empty.title")}
      description={t("admin.reviews.empty.description")}
    />
  ) : (
    <div className="grid gap-4">
      {result.comments.map((comment) => {
        const itemPath = getItemPath(
          comment.itemType,
          comment.itemSlug,
          locale,
        );
        return (
          <Card key={comment.id} className="gap-5">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    {comment.authorImage ? (
                      <AvatarImage
                        src={comment.authorImage}
                        alt={comment.authorName}
                      />
                    ) : null}
                    <AvatarFallback>
                      {getInitial(comment.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {comment.authorName}
                    </CardTitle>
                    {comment.authorEmail ? (
                      <p className="truncate text-sm text-muted-foreground">
                        {comment.authorEmail}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {t(itemTypeLabelKeys[comment.itemType])}
                  </Badge>
                  {comment.ratingHeld ? (
                    <Badge variant="secondary">
                      {t("admin.reviews.ratingHeld")}
                    </Badge>
                  ) : null}
                  {comment.invited ? (
                    <Badge variant="outline">{t("reviews.invite.label")}</Badge>
                  ) : null}
                  {itemPath ? (
                    <a
                      href={itemPath}
                      className="inline-flex min-w-0 items-center gap-1 text-sm break-all text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {comment.itemSlug}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {comment.itemSlug}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <ReviewStars value={comment.rating} size="sm" />
                <span aria-hidden="true">·</span>
                <CustomTimeAgo date={comment.createdAt} />
              </div>
              {comment.ratingHeld ? (
                <p className="text-sm text-muted-foreground">
                  {t("admin.reviews.ratingHeldDescription")}
                </p>
              ) : null}
              {comment.body ? (
                <p className="rounded-md border bg-muted/20 p-3 text-sm/6 wrap-break-word whitespace-pre-line">
                  {comment.body}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("admin.reviews.noComment")}
                </p>
              )}
            </CardContent>

            <CardFooter>
              <form className="flex flex-wrap gap-2" onSubmit={moderateComment}>
                <input type="hidden" name="reviewId" value={comment.id} />
                <input type="hidden" name="body" value={comment.body ?? ""} />
                <Button
                  type="submit"
                  name="commentStatus"
                  value="approved"
                  disabled={moderation.isPending}
                >
                  {pendingReviewId === comment.id &&
                  pendingReviewStatus === "approved" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Check data-icon="inline-start" />
                  )}
                  {t("admin.reviews.approve")}
                </Button>
                {/* A held rating is approved or removed as a whole. */}
                {comment.ratingHeld ? null : (
                  <Button
                    type="submit"
                    name="commentStatus"
                    value="rejected"
                    variant="outline"
                    disabled={moderation.isPending}
                  >
                    {pendingReviewId === comment.id &&
                    pendingReviewStatus === "rejected" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <X data-icon="inline-start" />
                    )}
                    {t("admin.reviews.reject")}
                  </Button>
                )}
                <AdminRemoveReviewButton
                  reviewId={comment.id}
                  size="default"
                  onRemoved={() => {
                    dropFromQueue(comment.id);
                  }}
                />
              </form>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
