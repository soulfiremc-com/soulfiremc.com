import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAccountProviders,
  sortAccountProviders,
} from "@/lib/account-provider-list";
import { PROVIDERS, type Provider } from "@/lib/accounts-data";
import { emptyReviewSummary } from "@/lib/review-core";

const now = Date.parse("2026-11-06T12:00:00Z");
const promoted = PROVIDERS.find(
  (provider) =>
    provider.slug === "localts" && provider.category === "nfa-accounts",
)!;
const free: Provider = {
  ...promoted,
  slug: "free",
  name: "Free",
  priceValue: 0,
  promotedUntil: undefined,
  badges: ["free"],
};
const paid: Provider = {
  ...free,
  slug: "paid",
  name: "Paid",
  priceValue: 1,
  badges: ["instant-delivery"],
};

await test("free and feature filters exclude promoted providers that do not match", () => {
  assert.deepEqual(
    filterAccountProviders([promoted, free, paid], undefined, ["free"]),
    [free],
  );
  assert.deepEqual(
    filterAccountProviders([promoted, free, paid], "mfa-accounts", ["free"]),
    [],
  );
  assert.deepEqual(
    filterAccountProviders([promoted, free, paid], undefined, [
      "free",
      "instant-delivery",
    ]),
    [],
  );
});

await test("explicit price sorting includes promoted listings and preserves the input", () => {
  const providers = [paid, promoted, free];
  assert.deepEqual(
    sortAccountProviders(providers, "price-asc", {}, now).map(
      (provider) => provider.slug,
    ),
    ["free", "localts", "paid"],
  );
  assert.deepEqual(
    sortAccountProviders(providers, "price-desc", {}, now).map(
      (provider) => provider.slug,
    ),
    ["paid", "localts", "free"],
  );
  assert.deepEqual(providers, [paid, promoted, free]);
});

await test("promotion affects default ordering but not an explicit rating sort", () => {
  const summaries = {
    localts: { ...emptyReviewSummary(), averageRating: 2, reviewCount: 100 },
    free: { ...emptyReviewSummary(), averageRating: 5, reviewCount: 20 },
  };
  assert.equal(
    sortAccountProviders([free, promoted], "default", summaries, now)[0].slug,
    "localts",
  );
  assert.equal(
    sortAccountProviders([promoted, free], "best-rated", summaries, now)[0]
      .slug,
    "free",
  );
});
