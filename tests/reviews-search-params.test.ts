import assert from "node:assert/strict";
import test from "node:test";
import { Schema } from "effect";
import { reviewsSearchSchema } from "@/lib/reviews-search-params";

void test("review pagination retains positive integer pages", () => {
  const decode = Schema.decodeUnknownSync(reviewsSearchSchema);
  assert.deepEqual(decode({ reviewsPage: 3, extra: true }), { reviewsPage: 3 });
});

void test("review pagination falls back for missing and malformed values", () => {
  const decode = Schema.decodeUnknownSync(reviewsSearchSchema);
  for (const input of [
    {},
    ...[undefined, null, "2", 0, -1, 1.5, Infinity].map((reviewsPage) => ({
      reviewsPage,
    })),
  ]) {
    assert.deepEqual(decode(input), { reviewsPage: 1 });
  }
});
