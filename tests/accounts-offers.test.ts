import assert from "node:assert/strict";
import test from "node:test";
import { getShopBySlug } from "@/lib/accounts-data";
import { getLiveShopData } from "@/lib/accounts-offers";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("getLiveShopData bounds live stock requests", async () => {
  const shop = getShopBySlug("ravealts");
  assert.ok(shop);

  const requestSignals: AbortSignal[] = [];
  globalThis.fetch = async (_input, init) => {
    if (init?.signal) requestSignals.push(init.signal);
    return Response.json({ mfa: 8 });
  };

  const result = await getLiveShopData(shop);

  assert.deepEqual(result.stockByCategory, {
    "mfa-accounts": 8,
  });
  assert.equal(requestSignals.length, 1);
});
