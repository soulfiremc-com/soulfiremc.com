import assert from "node:assert/strict";
import test from "node:test";
import { reviewsSearchSchema } from "@/lib/reviews-search-params";
import { searchStringArraySchema } from "@/lib/search-param-parsers";

const filterSchema = searchStringArraySchema([
  "residential",
  "datacenter",
] as const);

test("search array validation accepts native and legacy delimited values", () => {
  assert.deepEqual(filterSchema.parse(["residential", "datacenter"]), [
    "residential",
    "datacenter",
  ]);
  assert.deepEqual(filterSchema.parse("residential,datacenter"), [
    "residential",
    "datacenter",
  ]);
});

test("search array validation falls back for missing or invalid filters", () => {
  assert.deepEqual(filterSchema.parse(undefined), []);
  assert.deepEqual(filterSchema.parse(["residential", "unknown"]), []);
});

test("review pagination normalizes invalid search values", () => {
  assert.deepEqual(reviewsSearchSchema.parse({}), { reviewsPage: 1 });
  assert.deepEqual(reviewsSearchSchema.parse({ reviewsPage: "3" }), {
    reviewsPage: 3,
  });
  assert.deepEqual(reviewsSearchSchema.parse({ reviewsPage: "0" }), {
    reviewsPage: 1,
  });
});
