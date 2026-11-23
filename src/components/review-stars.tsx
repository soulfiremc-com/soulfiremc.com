"use client";

import { useT, useLocale } from "@/lib/i18n-react";

import { Star } from "lucide-react";
import { cn, generateN } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  lg: "block h-5 w-5 shrink-0",
  md: "block h-4.5 w-4.5 shrink-0",
  sm: "block h-4 w-4 shrink-0",
};

export function ReviewStars({
  value,
  size = "sm",
}: {
  value: number;
  size?: Size;
}) {
  const t = useT();
  const locale = useLocale();
  const width = `${Math.max(0, Math.min(5, value)) * 20}%`;
  const label = t("reviews.outOf5Stars", {
    rating: value.toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  });

  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the elements and their label form one labelled image
      role="img"
      aria-label={label}
      // Fit the stars so a stretching flex parent cannot widen the fill area.
      className="relative inline-flex w-fit items-center"
      title={label}
    >
      <div className="flex items-center gap-0.5 text-rating-muted">
        {generateN(5).map((i) => (
          <Star key={i} className={sizeClasses[size]} />
        ))}
      </div>
      <div
        className="absolute inset-0 w-(--rating-width) overflow-hidden text-rating"
        style={{ "--rating-width": width }}
      >
        <div className="flex items-center gap-0.5">
          {generateN(5).map((i) => (
            <Star key={i} className={cn(sizeClasses[size], "fill-current")} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReviewStarInput({
  value,
  onChange,
  disabled,
  labelledBy,
}: {
  /** The selected rating, or 0 when nothing is selected yet. */
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const t = useT();
  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a labelled group of star buttons; fieldset would add form semantics and min-content sizing
      role="group"
      aria-labelledby={labelledBy}
      className="-m-1 inline-flex w-fit items-center"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const active = starValue <= value;

        return (
          <button
            key={starValue}
            type="button"
            // aria-disabled keeps the focused star focusable while a rating
            // saves, so keyboard users do not lose their place.
            onClick={() => {
              if (!disabled) onChange(starValue);
            }}
            aria-disabled={disabled || undefined}
            className={cn(
              "rounded-sm p-1 text-rating transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:scale-100",
              !active && "text-rating-muted",
            )}
            aria-label={t("reviews.setRating5", { count: starValue })}
            aria-pressed={value === starValue}
          >
            <Star className={cn(sizeClasses.lg, active && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
