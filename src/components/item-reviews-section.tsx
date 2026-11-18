"use client";

import { useT, useLocale } from "@/lib/i18n-react";

import { useLocation } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  RotateCw,
  TriangleAlert,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ReviewRemoveDialog } from "@/components/review-remove-dialog";
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
import {
  type ReviewDraft,
  saveReviewDraft,
  takeReviewDraft,
} from "@/lib/review-draft";
import type { ReviewMutationResult } from "@/lib/review-mutations";
import { cn, generateN } from "@/lib/utils";
import { ReviewStarInput, ReviewStars } from "./review-stars";

const REVIEWS_SECTION_ID = "reviews";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function handleMutationError(
  error: ReviewMutationResult["error"],
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

function ReviewPageLink({
  children,
  href,
  label,
  onNavigate,
}: {
  children: ReactNode;
  href: string | undefined;
  label: string;
  onNavigate: () => void;
}) {
  if (!href) {
    return (
      <Button type="button" variant="ghost" aria-label={label} disabled>
        {children}
      </Button>
    );
  }

  return (
    <PaginationLink
      size="default"
      aria-label={label}
      href={href}
      onClick={(event) => {
        // Let modified clicks open the page URL in a new tab or window.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        onNavigate();
      }}
    >
      {children}
    </PaginationLink>
  );
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
      {/* Reset form state when the page switches to another item. */}
      <ItemReviewsSectionContent
        key={`${itemType}:${slug}`}
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
    refreshing,
    failed,
    retrying,
    retryReviews,
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
  const [confirmRemove, setConfirmRemove] = useState(false);
  // A draft saved before sign-in replaces the stored review until it is saved.
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const ratingLabelId = useId();
  const location = useLocation();
  const reviewPageHref = (page: number) => {
    const search = new URLSearchParams(location.searchStr);
    if (page > 1) {
      search.set("reviewsPage", String(page));
    } else {
      search.delete("reviewsPage");
    }
    const query = search.toString();
    // A real URL keeps pagination working before hydration and in new tabs.
    return `${location.pathname}${query ? `?${query}` : ""}#${REVIEWS_SECTION_ID}`;
  };
  const changeReviewPage = (page: number) => {
    if (!loading && !refreshing) {
      onReviewPageChange(page);
    }
  };

  useEffect(() => {
    // Reading removes the draft, so a repeated effect run must not clear it.
    const restored = takeReviewDraft(itemType, slug);
    if (restored) setDraft(restored);
  }, [itemType, slug]);

  useEffect(() => {
    const source = draft ?? currentReview;
    setRating(source?.rating ?? 5);
    setBody(source?.body ?? "");
  }, [currentReview, draft]);

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
    let result: ReviewMutationResult;
    try {
      result = await upsertReview(slug, {
        rating,
        body,
      });
    } catch {
      toast.error(t("reviews.errors.saveFailed"), {
        description: t("reviews.errors.connectionDescription"),
      });
      return;
    }
    if (result.skipped) return;
    handleMutationError(
      result.error,
      () => {
        saveReviewDraft(itemType, slug, { rating, body });
        setShowSignInPrompt(true);
      },
      t,
    );
    if (!result.error) {
      setDraft(null);
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

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const removeReview = async () => {
    let result: ReviewMutationResult;
    try {
      result = await deleteReview(slug);
    } catch {
      toast.error(t("reviews.errors.removeFailed"), {
        description: t("reviews.errors.connectionDescription"),
      });
      return;
    }
    if (result.skipped) return;
    handleMutationError(result.error, () => setShowSignInPrompt(true), t);
    if (!result.error) {
      setDraft(null);
      toast(t("reviews.reviewRemoved"));
      // The Remove button disappears with the review, so move keyboard focus
      // to the submit button instead of dropping it to the page.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!active || active === document.body) saveButtonRef.current?.focus();
      });
    }
  };

  return (
    <>
      <section
        className="flex scroll-mt-20 flex-col gap-6"
        id={REVIEWS_SECTION_ID}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">
            {t("reviews.ratingsReviews")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("reviews.moderation.description")}
          </p>
        </div>

        <Card className="gap-4 py-5">
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
            ) : failed ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="flex flex-col gap-1">
                    <div className="text-lg font-semibold">
                      {t("reviews.errors.loadFailed")}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("reviews.errors.connectionDescription")}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={retryReviews}
                  disabled={retrying}
                >
                  <RotateCw data-icon="inline-start" />
                  {t("errors.tryAgain")}
                </Button>
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
                    <div className="text-xs tracking-review text-muted-foreground uppercase">
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
                    <div className="text-xs tracking-review text-muted-foreground uppercase">
                      {t("reviews.totalRatings")}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {summary.reviewCount.toLocaleString(locale)}
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
              <FieldLabel id={ratingLabelId}>{t("reviews.rating")}</FieldLabel>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <ReviewStarInput
                  value={rating}
                  onChange={setRating}
                  disabled={pending}
                  size="lg"
                  labelledBy={ratingLabelId}
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
              {currentReview?.body &&
              currentReview.commentStatus !== "approved" ? (
                <FieldDescription>
                  {t(
                    currentReview.commentStatus === "rejected"
                      ? "reviews.commentRejectedNotice"
                      : "reviews.commentPendingNotice",
                  )}
                </FieldDescription>
              ) : null}
            </Field>
          </CardContent>

          <CardFooter className="flex-wrap gap-2 px-0">
            <Button
              ref={saveButtonRef}
              type="button"
              onClick={saveReview}
              disabled={pending || loading || refreshing || failed}
              // Saving disables the button. Keep focus here for keyboard users.
              focusableWhenDisabled
            >
              {currentReview
                ? t("reviews.updateReview")
                : t("reviews.submitReview")}
            </Button>
            {currentReview ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmRemove(true)}
                disabled={pending || refreshing}
                focusableWhenDisabled
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
                    start: visibleRangeStart.toLocaleString(locale),
                    end: visibleRangeEnd.toLocaleString(locale),
                    count: reviewPageData.totalCount.toLocaleString(locale),
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
                    <ReviewPageLink
                      label={t("reviews.previousPage")}
                      href={
                        hasPreviousPage && !refreshing
                          ? reviewPageHref(reviewPageData.page - 1)
                          : undefined
                      }
                      onNavigate={() =>
                        changeReviewPage(reviewPageData.page - 1)
                      }
                    >
                      <ChevronLeft />
                      <span className="hidden sm:block">
                        {t("common.previous")}
                      </span>
                    </ReviewPageLink>
                  </PaginationItem>
                  <PaginationItem>
                    <span
                      aria-current="page"
                      className="flex h-9 min-w-24 items-center justify-center px-2 text-sm text-muted-foreground tabular-nums"
                    >
                      {t("reviews.pageOf", {
                        page: reviewPageData.page,
                        pages: reviewPageData.totalPages,
                      })}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <ReviewPageLink
                      label={t("reviews.nextPage")}
                      href={
                        hasNextPage && !refreshing
                          ? reviewPageHref(reviewPageData.page + 1)
                          : undefined
                      }
                      onNavigate={() =>
                        changeReviewPage(reviewPageData.page + 1)
                      }
                    >
                      <span className="hidden sm:block">
                        {t("common.next")}
                      </span>
                      <ChevronRight />
                    </ReviewPageLink>
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
          ) : failed ? (
            <p className="text-sm text-muted-foreground">
              {t("reviews.errors.loadFailed")}
            </p>
          ) : hasWrittenReviews ? (
            <div
              aria-busy={refreshing}
              className={cn(
                "grid gap-4 transition-opacity",
                refreshing && "opacity-60",
              )}
            >
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
                          <span aria-hidden>·</span>
                          <CustomTimeAgo date={entry.createdAt} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {entry.body ? (
                    <p className="text-sm leading-6 break-words whitespace-pre-line text-muted-foreground">
                      {entry.body}
                    </p>
                  ) : entry.commentStatus === "pending" ? (
                    <p className="text-sm text-muted-foreground/80 italic">
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
      <ReviewRemoveDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        onConfirm={() => void removeReview()}
      />
      <SignInRequiredCredenza
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("reviews.signInToLeaveAReview")}
        description={t("reviews.youNeedToBeSignedInToRateAnd")}
        returnHash={REVIEWS_SECTION_ID}
      />
    </>
  );
}
