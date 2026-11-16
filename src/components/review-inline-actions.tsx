"use client";

import { useT } from "@/lib/i18n-react";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReviewSummary, ReviewSummaryStatus } from "@/lib/review-core";
import type { ReviewMutationResult } from "@/lib/review-mutations";
import { ReviewRemoveDialog } from "./review-remove-dialog";
import { ReviewStarInput } from "./review-stars";
import { ReviewSummaryBadge } from "./review-summary-badge";
import { SignInRequiredCredenza } from "./sign-in-required-credenza";
import { Button } from "./ui/button";

type MutationResult = Promise<ReviewMutationResult> | undefined;

async function handleMutation(
  request: MutationResult,
  onUnauthorized: () => void,
  t: ReturnType<typeof useT>,
  failureTitle:
    | "reviews.errors.ratingSaveFailed"
    | "reviews.errors.removeFailed",
) {
  let result: ReviewMutationResult | undefined;
  try {
    result = await request;
  } catch {
    toast.error(t(failureTitle), {
      description: t("reviews.errors.connectionDescription"),
    });
    return;
  }
  const error = result?.skipped ? null : (result?.error ?? null);
  if (error === "unauthorized") {
    onUnauthorized();
    return;
  }

  if (error === "verification") {
    toast(t("reviews.verificationFailed"), {
      description: t("reviews.errors.ratingVerification"),
    });
  }
}

export function ReviewInlineActions({
  summary,
  summaryStatus = "ready",
  currentRating,
  pending,
  onRate,
  onClear,
}: {
  summary: ReviewSummary;
  summaryStatus?: ReviewSummaryStatus;
  currentRating?: number;
  pending?: boolean;
  onRate: (rating: number) => MutationResult;
  onClear?: () => MutationResult;
}) {
  const t = useT();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const ratingLabelId = useId();
  const starsRef = useRef<HTMLDivElement>(null);

  const handleRate = (rating: number) =>
    handleMutation(
      onRate(rating),
      () => setShowSignInPrompt(true),
      t,
      "reviews.errors.ratingSaveFailed",
    );

  const handleClear = async () => {
    if (!onClear) return;
    await handleMutation(
      onClear(),
      () => setShowSignInPrompt(true),
      t,
      "reviews.errors.removeFailed",
    );
    // The Remove button disappears with the rating, so keep keyboard focus
    // in this card instead of dropping it to the page.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        starsRef.current?.querySelector("button")?.focus();
      }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReviewSummaryBadge
            summary={summary}
            status={summaryStatus}
            compact
          />
          {currentRating ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemove(true)}
              disabled={pending}
              focusableWhenDisabled
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              {t("common.remove")}
            </Button>
          ) : null}
        </div>
        <div ref={starsRef} className="flex flex-wrap items-center gap-2">
          <span
            id={ratingLabelId}
            className="text-xs font-medium text-muted-foreground"
          >
            {t("reviews.yourRating")}
          </span>
          <ReviewStarInput
            labelledBy={ratingLabelId}
            value={currentRating ?? 0}
            onChange={handleRate}
            // The current rating is unknown until reviews load.
            disabled={pending || summaryStatus !== "ready"}
          />
        </div>
      </div>
      <ReviewRemoveDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        onConfirm={() => void handleClear()}
      />
      <SignInRequiredCredenza
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("reviews.signInToLeaveARating")}
        description={t("reviews.youNeedToBeSignedInToRateThis")}
      />
    </>
  );
}
