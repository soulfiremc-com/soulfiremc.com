"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ExternalLink,
  Inbox,
  type LucideIcon,
  ShieldAlert,
  X,
} from "lucide-react";
import { type SubmitEvent, useCallback } from "react";
import { toast } from "sonner";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { ItemType } from "@/lib/review-core";
import {
  type GetPendingReviewCommentsResult,
  getPendingReviewCommentsServerFn,
  moderateReviewCommentServerFn,
} from "@/lib/reviews-actions";
import { generateN } from "@/lib/utils";

const pendingReviewCommentsQueryKey = ["admin", "pending-reviews"] as const;

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getItemTypeLabel(itemType: ItemType) {
  switch (itemType) {
    case "account":
      return "Account";
    case "proxy":
      return "Proxy";
    case "resource":
      return "Resource";
  }
}

function getItemPath(itemType: ItemType, itemSlug: string) {
  switch (itemType) {
    case "account":
      return `/get-accounts/${itemSlug}`;
    case "proxy":
      return `/get-proxies/${itemSlug}`;
    case "resource":
      return `/resources/${itemSlug}`;
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
  description,
  icon: Icon,
  title,
}: {
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
    </Empty>
  );
}

export function ReviewModeration() {
  const queryClient = useQueryClient();
  const pendingReviews = useQuery({
    queryKey: pendingReviewCommentsQueryKey,
    queryFn: () => getPendingReviewCommentsServerFn(),
  });
  const moderation = useMutation({
    mutationFn: async ({
      commentStatus,
      reviewId,
    }: {
      commentStatus: "approved" | "rejected";
      reviewId: string;
    }) => {
      const result = await moderateReviewCommentServerFn({
        data: { commentStatus, reviewId },
      });

      if (!result.ok) {
        throw new Error("Your account does not have admin access.");
      }
    },
    onError: (error) => {
      toast("Could not moderate comment", {
        description: error.message,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData<GetPendingReviewCommentsResult>(
        pendingReviewCommentsQueryKey,
        (current) =>
          current?.ok
            ? {
                ...current,
                comments: current.comments.filter(
                  (comment) => comment.id !== variables.reviewId,
                ),
              }
            : current,
      );
      toast(
        variables.commentStatus === "approved"
          ? "Comment approved"
          : "Comment rejected",
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

      const reviewId = new FormData(event.currentTarget).get("reviewId");
      const commentStatus = submitter.value;
      if (
        typeof reviewId !== "string" ||
        (commentStatus !== "approved" && commentStatus !== "rejected")
      ) {
        return;
      }

      moderateReview({ reviewId, commentStatus });
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Review moderation
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve written comments before they appear on public reviews.
        </p>
      </div>

      {pendingReviews.isPending ? (
        <ReviewModerationSkeleton />
      ) : pendingReviews.isError ? (
        <ReviewModerationState
          icon={ShieldAlert}
          title="Could not load comments"
          description="Refresh the page and try again."
        />
      ) : !result?.ok ? (
        <ReviewModerationState
          icon={ShieldAlert}
          title="Admin access required"
          description="Your account cannot moderate review comments."
        />
      ) : result.comments.length === 0 ? (
        <ReviewModerationState
          icon={Inbox}
          title="No pending comments"
          description="New written comments will appear here for review."
        />
      ) : (
        <div className="grid gap-4">
          {result.comments.map((comment) => (
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

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {getItemTypeLabel(comment.itemType)}
                    </Badge>
                    <a
                      href={getItemPath(comment.itemType, comment.itemSlug)}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {comment.itemSlug}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ReviewStars value={comment.rating} size="sm" />
                  <span className="tabular-nums">
                    {comment.rating.toFixed(1)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <CustomTimeAgo date={comment.createdAt} />
                </div>
                <p className="rounded-md border bg-muted/20 p-3 text-sm leading-6">
                  {comment.body}
                </p>
              </CardContent>

              <CardFooter>
                <form className="flex gap-2" onSubmit={moderateComment}>
                  <input type="hidden" name="reviewId" value={comment.id} />
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
                    Approve
                  </Button>
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
                    Reject
                  </Button>
                </form>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
