"use client";

import { MessageSquareText } from "lucide-react";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_REVIEW_PATH } from "@/lib/auth-ui-config";

const LazyReviewModeration = lazy(async () => {
  const { ReviewModeration } = await import("./review-moderation");
  return { default: ReviewModeration };
});

function ReviewModerationTab() {
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

export const reviewModerationAdminTab = {
  id: "reviews",
  path: ADMIN_REVIEW_PATH,
  label: (
    <span className="inline-flex items-center gap-1">
      <MessageSquareText className="text-muted-foreground" />
      Reviews
    </span>
  ),
  component: ReviewModerationTab,
};
