import assert from "node:assert/strict";
import test from "node:test";
import {
  compareProviderPrices,
  getShopBySlug,
  type Shop,
} from "@/lib/accounts-data";
import {
  getListingOffer,
  getLiveShopData,
  getShopAggregateOffer,
} from "@/lib/accounts-offers";

await test("live stock requests include cancellation and normalize category counts", async (t) => {
  const shop = getShopBySlug("ravealts");
  assert.ok(shop);

  t.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init?: RequestInit) => {
      assert.ok(init?.signal instanceof AbortSignal);
      return Response.json({ mfa: 8 });
    },
  );

  const result = await getLiveShopData(shop);
  assert.deepEqual(result.stockByCategory, { "mfa-accounts": 8 });
});

await test("marketplace offers do not invent a numeric price", () => {
  const shop = getShopBySlug("gameboost");
  assert.ok(shop);

  const offer = getListingOffer(shop, "mfa-accounts", undefined);
  assert.equal(offer.price, undefined);
  assert.equal(offer.priceCurrency, undefined);
  assert.equal(offer.url, "https://soulfiremc.com/get-accounts/gameboost");
  assert.equal(getShopAggregateOffer(shop), undefined);
});

await test("free and priced accounts retain their USD offers", () => {
  const shop = getShopBySlug("fastalts");
  assert.ok(shop);

  const freeOffer = getListingOffer(shop, "mfa-accounts", 0);
  assert.equal(freeOffer.price, "0.00");
  assert.equal(freeOffer.priceCurrency, "USD");

  const pricedOffer = getListingOffer(shop, "mfa-accounts", 18.99);
  assert.equal(pricedOffer.price, "18.99");
  assert.equal(pricedOffer.priceCurrency, "USD");
});

await test("aggregate prices exclude categories without a numeric price", () => {
  const shop: Shop = {
    slug: "mixed-pricing",
    name: "Mixed pricing",
    url: "https://example.com/accounts",
    listings: {
      "nfa-accounts": {
        summary: "A free account.",
        badges: [],
        price: "Free",
        priceValue: 0,
      },
      "mfa-accounts": {
        summary: "Accounts priced by individual sellers.",
        badges: [],
        price: "Varies by seller",
      },
    },
  };

  const aggregate = getShopAggregateOffer(shop, {
    stockByCategory: { "nfa-accounts": 0, "mfa-accounts": 8 },
  });
  assert.ok(aggregate);
  assert.equal(aggregate.lowPrice, "0.00");
  assert.equal(aggregate.highPrice, "0.00");
  assert.equal(aggregate.offerCount, 1);
  assert.equal(aggregate.availability, "https://schema.org/OutOfStock");
});

await test("price sorting keeps unknown prices last in both directions", () => {
  const providers = [
    { slug: "variable", priceValue: undefined },
    { slug: "paid", priceValue: 18.99 },
    { slug: "free", priceValue: 0 },
    { slug: "budget", priceValue: 6.99 },
    { slug: "another-variable", priceValue: undefined },
  ];

  assert.deepEqual(
    providers
      .slice()
      .sort((a, b) => compareProviderPrices(a, b, "price-asc"))
      .map((provider) => provider.slug),
    ["free", "budget", "paid", "variable", "another-variable"],
  );
  assert.deepEqual(
    providers
      .slice()
      .sort((a, b) => compareProviderPrices(a, b, "price-desc"))
      .map((provider) => provider.slug),
    ["paid", "budget", "free", "variable", "another-variable"],
  );
});

await test("missing or failed stock lookups do not claim availability", async (t) => {
  const shop = getShopBySlug("localts");
  assert.ok(shop);
  assert.equal(
    getListingOffer(shop, "nfa-accounts", 0.12).availability,
    undefined,
  );
  assert.equal(getShopAggregateOffer(shop)?.availability, undefined);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 503 }),
  );
  const liveData = await getLiveShopData(shop);
  assert.equal(
    getListingOffer(shop, "nfa-accounts", 0.12, liveData).availability,
    undefined,
  );
});

await test("aggregate stock remains unknown when only an empty category is known", () => {
  const shop = getShopBySlug("localts");
  assert.ok(shop);
  const partial = { stockByCategory: { "nfa-accounts": 0 } };
  assert.equal(
    getListingOffer(shop, "nfa-accounts", 0.12, partial).availability,
    "https://schema.org/OutOfStock",
  );
  assert.equal(
    getListingOffer(shop, "mfa-accounts", 5, partial).availability,
    undefined,
  );
  assert.equal(getShopAggregateOffer(shop, partial)?.availability, undefined);
  assert.equal(getShopAggregateOffer(shop, partial)?.inventoryLevel, undefined);
  assert.equal(
    getShopAggregateOffer(shop, {
      stockByCategory: { "nfa-accounts": 0, "mfa-accounts": 2 },
    })?.availability,
    "https://schema.org/InStock",
  );
  assert.equal(
    getShopAggregateOffer(shop, {
      stockByCategory: { "nfa-accounts": 0, "mfa-accounts": 0 },
    })?.availability,
    "https://schema.org/OutOfStock",
  );
});
