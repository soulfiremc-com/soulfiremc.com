"use client";

import { useT } from "@/lib/i18n-react";

import { useState } from "react";
import { toast } from "sonner";
import type { ReviewSummary } from "@/lib/review-core";
import type { ReviewMutationResult } from "@/lib/review-mutations";
import { ReviewStarInput } from "./review-stars";
import { ReviewSummaryBadge } from "./review-summary-badge";
import { SignInRequiredCredenza } from "./sign-in-required-credenza";
import { Button } from "./ui/button";

type MutationResult = Promise<ReviewMutationResult> | undefined;

async function handleMutation(
  request: MutationResult,
  onUnauthorized: () => void,
  t: ReturnType<typeof useT>,
) {
  let result: ReviewMutationResult | undefined;
  try {
    result = await request;
  } catch {
    toast.error(t("reviews.errors.ratingSaveFailed"), {
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
  currentRating,
  pending,
  onRate,
  onClear,
}: {
  summary: ReviewSummary;
  currentRating?: number;
  pending?: boolean;
  onRate: (rating: number) => MutationResult;
  onClear?: () => MutationResult;
}) {
  const t = useT();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const handleRate = (rating: number) =>
    handleMutation(onRate(rating), () => setShowSignInPrompt(true), t);

  const handleClear = () => {
    if (!onClear) return;
    return handleMutation(onClear(), () => setShowSignInPrompt(true), t);
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReviewSummaryBadge summary={summary} compact />
          {currentRating ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={pending}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              {t("common.remove")}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("reviews.yourRating")}
          </span>
          <ReviewStarInput
            value={currentRating ?? 0}
            onChange={handleRate}
            disabled={pending}
          />
        </div>
      </div>
      <SignInRequiredCredenza
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("reviews.signInToLeaveARating")}
        description={t("reviews.youNeedToBeSignedInToRateThis")}
      />
    </>
  );
}
