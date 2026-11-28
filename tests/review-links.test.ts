import assert from "node:assert/strict";
import test from "node:test";
import { SHOPS } from "@/lib/accounts-data";
import { PROVIDERS } from "@/lib/proxies-data";
import { getReviewLinkUrl, resolveReviewLink } from "@/lib/review-links";

void test("review links resolve account shops and proxy providers", () => {
  const shop = SHOPS[0];
  const provider = PROVIDERS.find((entry) => entry.slug !== shop?.slug);
  assert.ok(shop);
  assert.ok(provider);
  assert.equal(resolveReviewLink(shop.slug), "account");
  assert.equal(resolveReviewLink(provider.slug), "proxy");
  assert.equal(resolveReviewLink("no-such-shop"), undefined);
  assert.equal(
    getReviewLinkUrl(shop.slug),
    `https://soulfiremc.com/review/${shop.slug}`,
  );
});

void test("account shops and proxy providers keep distinct review link slugs", () => {
  const shopSlugs = new Set(SHOPS.map((shop) => shop.slug));
  assert.deepEqual(
    PROVIDERS.filter((provider) => shopSlugs.has(provider.slug)).map(
      (provider) => provider.slug,
    ),
    [],
  );
});
