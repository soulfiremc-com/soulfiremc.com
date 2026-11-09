"use client";

import { useT, useLocale } from "@/lib/i18n-react";

import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { ReviewTurnstileProvider } from "@/components/review-turnstile-provider";
import { SignInRequiredCredenza } from "@/components/sign-in-required-credenza";
import { CustomTimeAgo } from "@/components/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useReviews } from "@/hooks/use-reviews";
import type { ItemType } from "@/lib/review-core";
import { cn, generateN } from "@/lib/utils";
import { ReviewStarInput, ReviewStars } from "./review-stars";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function handleMutationError(
  error: "unauthorized" | "verification" | null,
  onUnauthorized: () => void,
  t: ReturnType<typeof useT>,
) {
  if (error === "unauthorized") {
    onUnauthorized();
    return;
  }

  if (error === "verification") {
    toast(t("reviews.verificationFailed"), {
      description: t("reviews.errors.reviewVerification"),
    });
  }
}

export function ItemReviewsSection({
  itemType,
  onReviewPageChange,
  reviewPage,
  slug,
}: {
  itemType: ItemType;
  onReviewPageChange: (page: number) => void;
  reviewPage: number;
  slug: string;
}) {
  return (
    <ReviewTurnstileProvider>
      <ItemReviewsSectionContent
        itemType={itemType}
        onReviewPageChange={onReviewPageChange}
        reviewPage={reviewPage}
        slug={slug}
      />
    </ReviewTurnstileProvider>
  );
}

function ItemReviewsSectionContent({
  itemType,
  onReviewPageChange,
  reviewPage,
  slug,
}: {
  itemType: ItemType;
  onReviewPageChange: (page: number) => void;
  reviewPage: number;
  slug: string;
}) {
  const t = useT();
  const locale = useLocale();
  const reviewSlugs = useMemo(() => [slug], [slug]);
  const {
    summaries,
    userReviews,
    writtenReviews,
    loading,
    pendingBySlug,
    upsertReview,
    deleteReview,
  } = useReviews(itemType, reviewSlugs, {
    includeWrittenReviews: true,
    writtenReviewsPage: reviewPage,
  });

  const summary = summaries[slug];
  const currentReview = userReviews[slug];
  const reviewPageData = writtenReviews[slug];
  const visibleReviews = reviewPageData.entries;
  const pending = pendingBySlug[slug] ?? false;

  const [rating, setRating] = useState(currentReview?.rating ?? 5);
  const [body, setBody] = useState(currentReview?.body ?? "");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const reviewsId = useId();

  useEffect(() => {
    setRating(currentReview?.rating ?? 5);
    setBody(currentReview?.body ?? "");
  }, [currentReview]);

  const hasWrittenReviews = visibleReviews.length > 0;
  const hasPreviousPage = reviewPageData.page > 1;
  const hasNextPage = reviewPageData.page < reviewPageData.totalPages;
  const visibleRangeStart =
    reviewPageData.totalCount === 0
      ? 0
      : (reviewPageData.page - 1) * reviewPageData.pageSize + 1;
  const visibleRangeEnd =
    reviewPageData.totalCount === 0
      ? 0
      : visibleRangeStart + visibleReviews.length - 1;
  const reviewCountLabel =
    summary.reviewCount === 0
      ? t("reviews.noRatingsYet")
      : t("reviews.ratingsCollected", {
          count: summary.reviewCount.toLocaleString(locale),
        });

  const saveReview = async () => {
    const normalizedBody = body.trim();
    const submittedForReview =
      normalizedBody.length > 0 &&
      (currentReview?.commentStatus !== "approved" ||
        (currentReview.body?.trim() ?? "") !== normalizedBody);
    const result = await upsertReview(slug, {
      rating,
      body,
    });
    handleMutationError(result.error, () => setShowSignInPrompt(true), t);
    if (!result.error) {
      toast(
        t(
          submittedForReview
            ? "reviews.reviewSubmittedForModeration"
            : currentReview
              ? "reviews.reviewUpdated"
              : "reviews.reviewSaved",
        ),
      );
    }
  };

  const removeReview = async () => {
    const result = await deleteReview(slug);
    handleMutationError(result.error, () => setShowSignInPrompt(true), t);
    if (!result.error) {
      toast(t("reviews.reviewRemoved"));
    }
  };

  return (
    <>
      <section className="flex flex-col gap-6" id={reviewsId}>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">
            {t("reviews.ratingsReviews")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("reviews.moderation.description")}
          </p>
        </div>

        <Card className="gap-4 px-6 py-5">
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <Skeleton className="h-12 w-20" />
                  <div className="flex flex-col gap-2 pb-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                  {generateN(2).map((skeletonId) => (
                    <Skeleton key={skeletonId} className="h-20 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : summary.averageRating !== null ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold tracking-tight tabular-nums">
                    {summary.averageRating.toLocaleString(locale, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </span>
                  <div className="flex flex-col gap-1 pb-1">
                    <ReviewStars value={summary.averageRating} size="lg" />
                    <p className="text-sm text-muted-foreground">
                      {reviewCountLabel}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-64">
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-review text-muted-foreground">
                      {t("reviews.average")}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {summary.averageRating.toLocaleString(locale, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-review text-muted-foreground">
                      {t("reviews.totalRatings")}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {summary.reviewCount}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="text-lg font-semibold">
                    {t("reviews.noRatingsYet")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("reviews.beTheFirstPersonToLeaveARatingAnd")}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground">
                  <MessageSquareText className="size-4" />
                  {t("reviews.waitingForTheFirstRating")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-5 p-6">
          <CardHeader className="px-0">
            <CardTitle>{t("reviews.yourReview")}</CardTitle>
            <CardDescription>
              {t("reviews.leaveAStarRatingAndOptionallyAddContextYour")}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 px-0 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <Field>
              <FieldLabel>{t("reviews.rating")}</FieldLabel>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <ReviewStarInput
                  value={rating}
                  onChange={setRating}
                  disabled={pending}
                  size="lg"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor={`review-body-${slug}`}>
                {t("reviews.writtenReview")}
              </FieldLabel>
              <FieldDescription>
                {t("reviews.optionalAndReviewedBeforePublication")}
              </FieldDescription>
              <Textarea
                id={`review-body-${slug}`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={pending}
                rows={6}
                maxLength={2000}
                placeholder={t("reviews.comment.placeholder")}
                className="min-h-40 resize-y"
              />
              <div className="flex justify-end text-xs text-muted-foreground">
                {body.length}/2000
              </div>
            </Field>
          </CardContent>

          <CardFooter className="flex-wrap gap-2 px-0">
            <Button
              type="button"
              onClick={saveReview}
              disabled={pending || loading}
            >
              {currentReview
                ? t("reviews.updateReview")
                : t("reviews.submitReview")}
            </Button>
            {currentReview ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeReview}
                disabled={pending}
              >
                {t("reviews.removeReview")}
              </Button>
            ) : null}
          </CardFooter>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">
                {t("reviews.latestReviews")}
              </h3>
              {reviewPageData.totalCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("reviews.showingReviewsOf", {
                    start: visibleRangeStart,
                    end: visibleRangeEnd,
                    count: reviewPageData.totalCount,
                  })}
                </p>
              ) : null}
            </div>

            {reviewPageData.totalPages > 1 ? (
              <Pagination
                aria-label={t("reviews.reviewPages")}
                className="mx-0 w-auto justify-start sm:justify-end"
              >
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      aria-label={t("reviews.previousPage")}
                      href={`#${reviewsId}`}
                      aria-disabled={!hasPreviousPage || loading}
                      className={cn(
                        (!hasPreviousPage || loading) && "pointer-events-none",
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (hasPreviousPage && !loading) {
                          onReviewPageChange(reviewPageData.page - 1);
                        }
                      }}
                    >
                      <ChevronLeft />
                      <span className="hidden sm:block">
                        {t("common.previous")}
                      </span>
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="flex h-9 min-w-24 items-center justify-center px-2 text-sm text-muted-foreground">
                      {t("reviews.pageOf", {
                        page: reviewPageData.page,
                        pages: reviewPageData.totalPages,
                      })}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      aria-label={t("reviews.nextPage")}
                      href={`#${reviewsId}`}
                      aria-disabled={!hasNextPage || loading}
                      className={cn(
                        (!hasNextPage || loading) && "pointer-events-none",
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (hasNextPage && !loading) {
                          onReviewPageChange(reviewPageData.page + 1);
                        }
                      }}
                    >
                      <span className="hidden sm:block">
                        {t("common.next")}
                      </span>
                      <ChevronRight />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>

          {loading ? (
            <div className="grid gap-4">
              {generateN(3).map((skeletonId) => (
                <Card key={skeletonId} className="gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-44" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </Card>
              ))}
            </div>
          ) : hasWrittenReviews ? (
            <div className="grid gap-4">
              {visibleReviews.map((entry) => (
                <Card key={entry.id} className="gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        {entry.authorImage ? (
                          <AvatarImage
                            src={entry.authorImage}
                            alt={entry.authorName}
                          />
                        ) : null}
                        <AvatarFallback>
                          {initial(entry.authorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{entry.authorName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <ReviewStars value={entry.rating} size="sm" />
                          <span className="tabular-nums">
                            {entry.rating.toLocaleString(locale, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </span>
                          <span>·</span>
                          <CustomTimeAgo date={entry.createdAt} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {entry.body ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {entry.body}
                    </p>
                  ) : entry.commentStatus === "pending" ? (
                    <p className="text-sm italic text-muted-foreground/80">
                      {t("reviews.reviewPending")}
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <Empty className="items-start border text-left">
              <EmptyHeader className="items-start text-left">
                <EmptyMedia variant="icon">
                  <MessageSquareText />
                </EmptyMedia>
                <EmptyTitle>{t("reviews.noReviewsYet")}</EmptyTitle>
                <EmptyDescription>
                  {t(
                    "reviews.ratingsWithoutCommentsWillStillAppearHereAndCount",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </section>
      <SignInRequiredCredenza
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("reviews.signInToLeaveAReview")}
        description={t("reviews.youNeedToBeSignedInToRateAnd")}
      />
    </>
  );
}
