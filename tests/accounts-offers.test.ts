import assert from "node:assert/strict";
import test from "node:test";
import { getShopBySlug } from "@/lib/accounts-data";
import { getLiveShopData } from "@/lib/accounts-offers";

test("live stock requests include cancellation and normalize category counts", async (t) => {
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
