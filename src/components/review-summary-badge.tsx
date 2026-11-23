import { useT, useLocale } from "@/lib/i18n-react";
import { MessageSquareText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewSummary, ReviewSummaryStatus } from "@/lib/review-core";
import { cn } from "@/lib/utils";
import { ReviewStars } from "./review-stars";

export function ReviewSummaryBadge({
  summary,
  className,
  status = "ready",
}: {
  summary: ReviewSummary;
  className?: string;
  /** Loading and failed requests must not read as an item without ratings. */
  status?: ReviewSummaryStatus;
}) {
  const t = useT();
  const locale = useLocale();
  if (status === "loading") {
    return (
      <Skeleton className={cn("h-5 w-32", className)}>
        <span className="sr-only">{t("reviews.loadingRatings")}</span>
      </Skeleton>
    );
  }

  if (status === "unavailable") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-2 border-dashed px-3 py-1.5 text-sm text-muted-foreground",
          className,
        )}
      >
        <TriangleAlert className="size-3.5" />
        {t("reviews.ratingsUnavailable")}
      </Badge>
    );
  }

  if (summary.reviewCount === 0 || summary.averageRating === null) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-2 border-dashed px-3 py-1.5 text-sm text-muted-foreground",
          className,
        )}
      >
        <MessageSquareText className="size-3.5" />
        {t("reviews.noRatingsYet")}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-2 bg-background/80 px-3 py-1.5 text-sm shadow-sm",
        className,
      )}
    >
      <ReviewStars value={summary.averageRating} size="md" />
      <span className="font-semibold tabular-nums">
        {summary.averageRating.toLocaleString(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}
      </span>
      <span className="text-muted-foreground">
        {t("reviews.ratings", {
          count: summary.reviewCount.toLocaleString(locale),
        })}
      </span>
    </Badge>
  );
}
