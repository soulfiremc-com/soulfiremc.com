"use client";

import { useT, useLocale } from "@/lib/i18n-react";

import { Star } from "lucide-react";
import type { CSSProperties } from "react";
import { cn, generateN } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

function sizeClass(size: Size) {
  switch (size) {
    case "lg":
      return "block h-5 w-5 shrink-0";
    case "md":
      return "block h-4.5 w-4.5 shrink-0";
    default:
      return "block h-4 w-4 shrink-0";
  }
}

export function ReviewStars({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: Size;
  className?: string;
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
      role="img"
      aria-label={label}
      // Fit the stars so a stretching flex parent cannot widen the fill area.
      className={cn("relative inline-flex w-fit items-center", className)}
      title={label}
    >
      <div className="flex items-center gap-0.5 text-rating-muted/70">
        {generateN(5).map((i) => (
          <Star key={i} className={sizeClass(size)} />
        ))}
      </div>
      <div
        className="absolute inset-0 w-(--rating-width) overflow-hidden text-rating"
        style={{ "--rating-width": width } as CSSProperties}
      >
        <div className="flex items-center gap-0.5">
          {generateN(5).map((i) => (
            <Star key={i} className={cn(sizeClass(size), "fill-current")} />
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
  size = "sm",
  className,
  labelledBy,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: Size;
  className?: string;
  labelledBy?: string;
}) {
  const t = useT();
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={cn("-m-1 inline-flex items-center", className)}
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
              !active && "text-rating-muted/70",
            )}
            aria-label={t("reviews.setRating5", { count: starValue })}
            aria-pressed={value === starValue}
          >
            <Star className={cn(sizeClass(size), active && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
