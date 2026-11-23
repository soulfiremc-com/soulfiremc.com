import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDERS } from "@/lib/accounts-data";
import { resolveMessage } from "@/lib/messages";

// Reads the lowest USD account price from a shown price such as
// "$4.00-$5.50" or "10-15¢". A per-credit price such as "0.8-1¢/credit" has
// no account price.
function lowestShownPrice(price: string): number | undefined {
  if (price.includes("/")) return undefined;
  const match = /^(\$)?(\d+(?:\.\d+)?)/u.exec(price);
  if (!match) return undefined;
  const amount = Number(match[2]);
  return match[1] ? amount : amount / 100;
}

await test("sortable account prices match the price each card shows", () => {
  for (const provider of PROVIDERS) {
    const shown = resolveMessage("en", provider.price);
    assert.equal(
      provider.priceValue,
      lowestShownPrice(shown),
      `${provider.slug} ${provider.category} shows "${shown}"`,
    );
  }
});
