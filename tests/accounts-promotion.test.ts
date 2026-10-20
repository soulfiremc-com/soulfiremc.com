import assert from "node:assert/strict";
import test from "node:test";
import { isProviderPromoted, PROVIDERS } from "@/lib/accounts-data";

await test("promotion ends exactly at its expiry", () => {
  const expiry = Date.UTC(2026, 11, 28, 13, 42, 46);
  const provider = { promotedUntil: new Date(expiry).toISOString() };

  assert.equal(isProviderPromoted(provider, expiry - 1), true);
  assert.equal(isProviderPromoted(provider, expiry), false);
  assert.equal(isProviderPromoted(provider, expiry + 1), false);
  assert.equal(isProviderPromoted({}, expiry - 1), false);
});

await test("both LocalTS categories expire three calendar months after promotion began", () => {
  const providers = PROVIDERS.filter((provider) => provider.slug === "localts");
  const expiry = Date.UTC(2026, 11, 28, 13, 42, 46);

  assert.equal(providers.length, 2);
  for (const provider of providers) {
    assert.equal(isProviderPromoted(provider, expiry - 1), true);
    assert.equal(isProviderPromoted(provider, expiry), false);
  }
});
