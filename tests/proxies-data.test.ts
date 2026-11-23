import assert from "node:assert/strict";
import test from "node:test";
import {
  filterProviders,
  PROVIDERS,
  PROXY_TYPE_BADGES,
} from "@/lib/proxies-data";

void test("proxy provider filters require every selected badge", () => {
  const bedrockWithFreeTier = filterProviders(PROVIDERS, [
    "bedrock-udp",
    "free-tier",
  ]).map((provider) => provider.slug);

  assert.deepEqual(bedrockWithFreeTier, [
    "flameproxies",
    "loopway",
    "serpproxies",
  ]);
  assert.equal(filterProviders(PROVIDERS, []).length, PROVIDERS.length);
});

void test("proxy provider cards list proxy types before features", () => {
  for (const provider of PROVIDERS) {
    const types = provider.badges.filter((badge) =>
      PROXY_TYPE_BADGES.some((type) => type === badge),
    );
    assert.ok(types.length > 0, `${provider.slug} lists no proxy type`);
    assert.deepEqual(
      provider.badges.slice(0, types.length),
      types,
      provider.slug,
    );
    assert.equal(new Set(provider.badges).size, provider.badges.length);
  }
});
