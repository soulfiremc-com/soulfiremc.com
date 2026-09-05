import assert from "node:assert/strict";
import test from "node:test";
import { compareReviewSummaries } from "@/lib/review-core";

test("review sorting switches priority between rating and count", () => {
  const popular = { averageRating: 3, reviewCount: 20 };
  const highlyRated = { averageRating: 5, reviewCount: 2 };

  assert.ok(compareReviewSummaries(popular, highlyRated, "default") < 0);
  assert.ok(compareReviewSummaries(popular, highlyRated, "best-rated") > 0);
});

test("review sorting breaks ties using the other metric", () => {
  const first = { averageRating: 4, reviewCount: 10 };
  assert.ok(
    compareReviewSummaries(
      first,
      { averageRating: 3, reviewCount: 10 },
      "default",
    ) < 0,
  );
  assert.ok(
    compareReviewSummaries(
      first,
      { averageRating: 4, reviewCount: 5 },
      "best-rated",
    ) < 0,
  );
  assert.equal(compareReviewSummaries(first, first, "default"), 0);
});

test("missing summaries sort with unrated entries", () => {
  const unrated = { averageRating: null, reviewCount: 0 };
  const rated = { averageRating: 1, reviewCount: 1 };

  for (const sort of ["default", "best-rated"] as const) {
    assert.equal(compareReviewSummaries(undefined, unrated, sort), 0);
    assert.ok(compareReviewSummaries(rated, undefined, sort) < 0);
    assert.ok(compareReviewSummaries(undefined, rated, sort) > 0);
  }
});
