"use client";

import { MessageSquareText } from "lucide-react";
import { useQueryState } from "nuqs";
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
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { useReviews } from "@/hooks/use-reviews";
import type {
  ItemType,
  PaginatedPublicReviewRecords,
  ReviewSummary,
} from "@/lib/review-core";
import { reviewsPageParser } from "@/lib/reviews-search-params";
import { cn } from "@/lib/utils";
import { ReviewStarInput, ReviewStars } from "./review-stars";

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function handleMutationError(
  error: "unauthorized" | "verification" | null,
  onUnauthorized: () => void,
) {
  if (error === "unauthorized") {
    onUnauthorized();
    return;
  }

  if (error === "verification") {
    toast("Verification failed", {
      description:
        "Cloudflare Turnstile could not verify this review. Please try again.",
    });
  }
}

export function ItemReviewsSection({
  itemType,
  slug,
  initialSummary,
  initialWrittenReviews,
}: {
  itemType: ItemType;
  slug: string;
  initialSummary: ReviewSummary;
  initialWrittenReviews: PaginatedPublicReviewRecords;
}) {
  return (
    <ReviewTurnstileProvider>
      <ItemReviewsSectionContent
        itemType={itemType}
        slug={slug}
        initialSummary={initialSummary}
        initialWrittenReviews={initialWrittenReviews}
      />
    </ReviewTurnstileProvider>
  );
}

function ItemReviewsSectionContent({
  itemType,
  slug,
  initialSummary,
  initialWrittenReviews,
}: {
  itemType: ItemType;
  slug: string;
  initialSummary: ReviewSummary;
  initialWrittenReviews: PaginatedPublicReviewRecords;
}) {
  const [reviewPage, setReviewPage] = useQueryState(
    "reviewsPage",
    reviewsPageParser,
  );
  const activeReviewPage = Math.max(1, reviewPage);
  const reviewSlugs = useMemo(() => [slug], [slug]);
  const initialSummaryMap = useMemo(
    () => ({ [slug]: initialSummary }),
    [initialSummary, slug],
  );
  const initialWrittenReviewMap = useMemo(
    () => ({ [slug]: initialWrittenReviews }),
    [initialWrittenReviews, slug],
  );
  const {
    summaries,
    userReviews,
    writtenReviews,
    loading,
    pendingBySlug,
    upsertReview,
    deleteReview,
  } = useReviews(itemType, reviewSlugs, {
    initialSummaries: initialSummaryMap,
    includeWrittenReviews: true,
    initialWrittenReviews: initialWrittenReviewMap,
    writtenReviewsPage: activeReviewPage,
  });

  const summary = summaries[slug] ?? initialSummary;
  const currentReview = userReviews[slug];
  const reviewPageData = writtenReviews[slug] ?? initialWrittenReviews;
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

  useEffect(() => {
    if (reviewPage < 1) {
      void setReviewPage(1);
    }
  }, [reviewPage, setReviewPage]);

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
  const reviewCountLabel = useMemo(() => {
    if (summary.reviewCount === 0) {
      return "No ratings yet";
    }

    return `${summary.reviewCount} rating${summary.reviewCount === 1 ? "" : "s"} collected`;
  }, [summary.reviewCount]);

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
    handleMutationError(result.error, () => setShowSignInPrompt(true));
    if (!result.error) {
      toast(
        submittedForReview
          ? "Review submitted for moderation"
          : currentReview
            ? "Review updated"
            : "Review saved",
      );
    }
  };

  const removeReview = async () => {
    const result = await deleteReview(slug);
    handleMutationError(result.error, () => setShowSignInPrompt(true));
    if (!result.error) {
      toast("Review removed");
    }
  };

  const goToReviewPage = (page: number) => {
    void setReviewPage(page);
  };

  return (
    <>
      <section className="flex flex-col gap-6" id={reviewsId}>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Ratings & reviews</h2>
          <p className="text-sm text-muted-foreground">
            Ratings affect the average immediately. Written comments are
            reviewed before publication.
          </p>
        </div>

        <Card className="gap-4 px-6 py-5">
          <CardContent>
            {summary.averageRating !== null ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold tracking-tight tabular-nums">
                    {summary.averageRating.toFixed(1)}
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
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Average
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {summary.averageRating.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Total Ratings
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
                  <div className="text-lg font-semibold">No ratings yet</div>
                  <p className="text-sm text-muted-foreground">
                    Be the first person to leave a rating and written review.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm text-muted-foreground">
                  <MessageSquareText className="size-4" />
                  Waiting for the first rating
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-5 p-6">
          <CardHeader className="px-0">
            <CardTitle>Your review</CardTitle>
            <CardDescription>
              Leave a star rating, optionally add context, and decide whether
              your profile is shown publicly.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 px-0 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <Field>
              <FieldLabel>Rating</FieldLabel>
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
                Written review
              </FieldLabel>
              <FieldDescription>
                Optional, and reviewed before publication.
              </FieldDescription>
              <Textarea
                id={`review-body-${slug}`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={pending}
                rows={6}
                maxLength={2000}
                placeholder="What stood out? Delivery speed, support quality, stability, setup experience..."
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
              {currentReview ? "Update review" : "Submit review"}
            </Button>
            {currentReview ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeReview}
                disabled={pending}
              >
                Remove review
              </Button>
            ) : null}
          </CardFooter>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Latest reviews</h3>
              {reviewPageData.totalCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Showing {visibleRangeStart}-{visibleRangeEnd} of{" "}
                  {reviewPageData.totalCount} review
                  {reviewPageData.totalCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>

            {reviewPageData.totalPages > 1 ? (
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={`#${reviewsId}`}
                      aria-disabled={!hasPreviousPage || loading}
                      className={cn(
                        (!hasPreviousPage || loading) &&
                          "pointer-events-none opacity-50",
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (hasPreviousPage && !loading) {
                          goToReviewPage(reviewPageData.page - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="flex h-9 min-w-24 items-center justify-center px-2 text-sm text-muted-foreground">
                      Page {reviewPageData.page} of {reviewPageData.totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href={`#${reviewsId}`}
                      aria-disabled={!hasNextPage || loading}
                      className={cn(
                        (!hasNextPage || loading) &&
                          "pointer-events-none opacity-50",
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        if (hasNextPage && !loading) {
                          goToReviewPage(reviewPageData.page + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>

          {hasWrittenReviews ? (
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
                            {entry.rating.toFixed(1)}
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
                      Review pending.
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
                <EmptyTitle>No reviews yet</EmptyTitle>
                <EmptyDescription>
                  Ratings without comments will still appear here and count
                  toward the average above.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </section>
      <SignInRequiredCredenza
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title="Sign in to leave a review"
        description="You need to be signed in to rate and review this listing."
      />
    </>
  );
}
