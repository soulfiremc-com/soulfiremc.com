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
  const rating = Math.max(0, Math.min(5, value));
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
      className="inline-flex w-fit items-center gap-0.5"
      title={label}
    >
      {generateN(5).map((i) => {
        // Clip each star on its own so the gaps between stars do not shift
        // the partial fill.
        const fill = Math.max(0, Math.min(1, rating - i + 1));
        return (
          <span key={i} className="relative">
            <Star
              className={cn(
                sizeClasses[size],
                "fill-current text-rating-muted opacity-40",
              )}
            />
            {fill > 0 && (
              <Star
                className={cn(
                  sizeClasses[size],
                  "absolute inset-0 fill-current text-rating [clip-path:inset(0_var(--star-empty)_0_0)]",
                )}
                style={{ "--star-empty": `${(1 - fill) * 100}%` }}
              />
            )}
          </span>
        );
      })}
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
