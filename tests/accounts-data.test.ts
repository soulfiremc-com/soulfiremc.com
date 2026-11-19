import assert from "node:assert/strict";
import test from "node:test";
import { PROVIDERS } from "@/lib/accounts-data";
import { resolveMessage } from "@/lib/messages";

// Reads the lowest USD amount from a shown price such as "$4.00-$5.50",
// "10-15¢" or "0.8-1¢/credit".
function lowestShownPrice(price: string): number | undefined {
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
