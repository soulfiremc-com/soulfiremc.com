"use client";

import { MessageSquareText } from "lucide-react";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n-react";

const LazyReviewModeration = lazy(async () => {
  const { ReviewModeration } = await import("./review-moderation");
  return { default: ReviewModeration };
});

export function ReviewModerationTabLabel() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1">
      <MessageSquareText className="text-muted-foreground" />
      {t("admin.reviews.tab")}
    </span>
  );
}

export function ReviewModerationTab() {
  const t = useT();
  // Keep the heading visible while the moderation list code loads.
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("admin.reviews.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.reviews.description")}
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LazyReviewModeration />
      </Suspense>
    </section>
  );
}
