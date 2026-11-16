import assert from "node:assert/strict";
import test from "node:test";
import {
  isSameReviewItems,
  type ItemType,
  normalizeReviewSlugs,
  reviewsQueryKey,
} from "@/lib/review-core";

function reviewKey({
  itemType = "account",
  slugs = ["localts"],
  includeWrittenReviews = true,
  reviewsPage = 1,
  viewerId,
}: {
  itemType?: ItemType;
  slugs?: string[];
  includeWrittenReviews?: boolean;
  reviewsPage?: number;
  viewerId?: string;
}) {
  return reviewsQueryKey({
    itemType,
    slugs: normalizeReviewSlugs(slugs),
    includeWrittenReviews,
    reviewsPage,
    viewerId,
  });
}

void test("review pages and viewers of the same item share placeholder data", () => {
  assert.equal(
    isSameReviewItems(
      reviewKey({}),
      reviewKey({ slugs: [" localts "], reviewsPage: 2, viewerId: "user-1" }),
    ),
    true,
  );
});

void test("reviews of other items never become placeholder data", () => {
  for (const other of [
    reviewKey({ slugs: ["ravealts"] }),
    reviewKey({ itemType: "proxy" }),
    reviewKey({ slugs: ["localts", "ravealts"] }),
    reviewKey({ includeWrittenReviews: false }),
  ]) {
    assert.equal(isSameReviewItems(reviewKey({}), other), false);
  }
});
