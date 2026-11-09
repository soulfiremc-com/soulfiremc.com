import { useT, useLocale } from "@/lib/i18n-react";
import { MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReviewSummary } from "@/lib/review-core";
import { cn } from "@/lib/utils";
import { ReviewStars } from "./review-stars";

export function ReviewSummaryBadge({
  summary,
  className,
  compact = false,
}: {
  summary: ReviewSummary;
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
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
      <ReviewStars value={summary.averageRating} size={compact ? "sm" : "md"} />
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
