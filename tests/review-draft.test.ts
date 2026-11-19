import assert from "node:assert/strict";
import test from "node:test";
import { getReviewSummaryStatus } from "@/lib/review-core";
import { saveReviewDraft, takeReviewDraft } from "@/lib/review-draft";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

await test("review drafts restore once for the same item only", () => {
  const storage = memoryStorage();
  saveReviewDraft(
    "account",
    "localts",
    { rating: 3, body: "Fast delivery" },
    storage,
  );

  assert.equal(takeReviewDraft("proxy", "localts", storage), null);
  assert.deepEqual(takeReviewDraft("account", "localts", storage), {
    rating: 3,
    body: "Fast delivery",
  });
  assert.equal(takeReviewDraft("account", "localts", storage), null);
});

await test("review drafts reject invalid stored values", () => {
  const storage = memoryStorage();
  for (const value of [
    "not json",
    JSON.stringify({ rating: 9, body: "Too high" }),
    JSON.stringify({ rating: 2.5, body: "Not whole" }),
    JSON.stringify({ rating: 4 }),
    JSON.stringify(null),
  ]) {
    storage.values.set("review-draft:account:localts", value);
    assert.equal(takeReviewDraft("account", "localts", storage), null);
    assert.equal(storage.values.size, 0);
  }
});

await test("review drafts survive blocked storage without throwing", () => {
  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => {
    saveReviewDraft("proxy", "x", { rating: 5, body: "" }, blocked);
  });
  assert.equal(takeReviewDraft("proxy", "x", blocked), null);
});

await test("review summary status separates loading and failures from no ratings", () => {
  assert.equal(
    getReviewSummaryStatus({ data: undefined, isPending: true }),
    "loading",
  );
  assert.equal(
    getReviewSummaryStatus({ data: undefined, isPending: false }),
    "unavailable",
  );
  assert.equal(
    getReviewSummaryStatus({ data: { unavailable: true }, isPending: false }),
    "unavailable",
  );
  assert.equal(getReviewSummaryStatus({ data: {}, isPending: false }), "ready");
});
