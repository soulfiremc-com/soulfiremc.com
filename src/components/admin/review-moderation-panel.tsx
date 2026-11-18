"use client";

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const LazyReviewModeration = lazy(async () => {
  const { ReviewModeration } = await import("./review-moderation");
  return { default: ReviewModeration };
});

export function ReviewModerationTab() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LazyReviewModeration />
    </Suspense>
  );
}
