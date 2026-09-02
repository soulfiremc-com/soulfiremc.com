import type { Offer } from "schema-dts";
import type { Category, Shop } from "@/lib/accounts-data";

const RAVEALTS_STOCK_URL = "https://api.ravealts.com/alts/stock";
const LOCALTS_PRODUCTS_URL = "https://localts.store/v1/products";
const OUT_OF_STOCK_THRESHOLD = 0;
const LIVE_SHOP_REQUEST_TIMEOUT_MS = 5_000;

type LiveStockByCategory = Partial<Record<Category, number>>;

type LiveShopData = {
  stockByCategory?: LiveStockByCategory;
};

export async function getLiveShopData(shop: Shop): Promise<LiveShopData> {
  if (shop.slug !== "ravealts" && shop.slug !== "localts") {
    return {};
  }

  try {
    const response = await fetch(
      shop.slug === "ravealts" ? RAVEALTS_STOCK_URL : LOCALTS_PRODUCTS_URL,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(LIVE_SHOP_REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      return {};
    }

    const payload: unknown = await response.json();
    const stockByCategory =
      shop.slug === "ravealts"
        ? parseRavealtsStockByCategory(payload)
        : parseLocaltsStockByCategory(payload);

    if (!stockByCategory) {
      return {};
    }

    return { stockByCategory };
  } catch {
    return {};
  }
}

function parseLocaltsStockByCategory(
  payload: unknown,
): LiveStockByCategory | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    return undefined;
  }

  let nfaStock = 0;
  let mfaStock = 0;
  let hasNfaMatch = false;
  let hasMfaMatch = false;

  for (const product of payload.products) {
    if (!isRecord(product) || typeof product.stock !== "number") {
      continue;
    }

    const searchableText = [
      product.name,
      product.description,
      product.category,
      product.id,
      product.type,
    ]
      .filter((value) => typeof value === "string")
      .join(" ")
      .toLowerCase();

    if (includesAny(searchableText, ["mfa", "full access", "full-access"])) {
      mfaStock += product.stock;
      hasMfaMatch = true;
      continue;
    }

    if (
      includesAny(searchableText, [
        "nfa",
        "cookie",
        "token",
        "gamepass",
        "hypixel",
      ])
    ) {
      nfaStock += product.stock;
      hasNfaMatch = true;
    }
  }

  if (!hasNfaMatch && !hasMfaMatch) {
    return undefined;
  }

  return {
    ...(hasNfaMatch && { "nfa-accounts": nfaStock }),
    ...(hasMfaMatch && { "mfa-accounts": mfaStock }),
  };
}

export function getListingOffer(
  shop: Shop,
  category: Category,
  listingPriceValue: number,
  liveData?: LiveShopData,
): Offer {
  const stockValue = liveData?.stockByCategory?.[category];

  return {
    "@type": "Offer",
    priceCurrency: "USD",
    price: listingPriceValue.toFixed(2),
    availability:
      typeof stockValue === "number" && stockValue <= OUT_OF_STOCK_THRESHOLD
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    ...(typeof stockValue === "number" && {
      inventoryLevel: {
        "@type": "QuantitativeValue",
        value: stockValue,
      },
    }),
    url: `https://soulfiremc.com/get-accounts/${shop.slug}`,
  };
}

export function getShopAggregateOffer(
  shop: Shop,
  liveData?: LiveShopData,
): Offer | undefined {
  const listings = Object.entries(shop.listings) as [
    Category,
    NonNullable<Shop["listings"][Category]>,
  ][];
  if (listings.length === 0) {
    return undefined;
  }

  const prices = listings.map(([, listing]) => listing.priceValue);
  const totalStock = listings.reduce((total, [category]) => {
    const value = liveData?.stockByCategory?.[category];
    return typeof value === "number" ? total + value : total;
  }, 0);
  const knownStockCount = listings.filter(
    ([category]) => typeof liveData?.stockByCategory?.[category] === "number",
  ).length;

  return {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: Math.min(...prices).toFixed(2),
    highPrice: Math.max(...prices).toFixed(2),
    offerCount: listings.length,
    availability:
      knownStockCount > 0 && totalStock <= OUT_OF_STOCK_THRESHOLD
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    ...(knownStockCount > 0 && {
      inventoryLevel: {
        "@type": "QuantitativeValue",
        value: totalStock,
      },
    }),
    url: `https://soulfiremc.com/get-accounts/${shop.slug}`,
  };
}

function parseRavealtsStockByCategory(
  payload: unknown,
): LiveStockByCategory | undefined {
  const flatMap = flattenNumericValues(payload);

  if (flatMap.size === 0) {
    return undefined;
  }

  const nfaStock = pickByTokens(flatMap, ["nfa", "token", "cookie"]);
  const mfaStock = pickByTokens(flatMap, ["mfa", "full", "fa"]);

  if (nfaStock === undefined && mfaStock === undefined) {
    return undefined;
  }

  return {
    ...(typeof nfaStock === "number" && { "nfa-accounts": nfaStock }),
    ...(typeof mfaStock === "number" && { "mfa-accounts": mfaStock }),
  };
}

function flattenNumericValues(
  payload: unknown,
  prefix = "",
  output = new Map<string, number>(),
): Map<string, number> {
  if (Array.isArray(payload)) {
    payload.forEach((entry, index) => {
      flattenNumericValues(entry, `${prefix}[${index}]`, output);
    });
    return output;
  }

  if (isRecord(payload)) {
    for (const [key, value] of Object.entries(payload)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "number" && Number.isFinite(value)) {
        output.set(path.toLowerCase(), value);
      } else {
        flattenNumericValues(value, path, output);
      }
    }
  }

  return output;
}

function pickByTokens(
  values: Map<string, number>,
  tokens: readonly string[],
): number | undefined {
  const matched = [...values.entries()].filter(([key]) =>
    tokens.some((token) => key.includes(token)),
  );

  if (matched.length === 0) {
    return undefined;
  }

  return matched.reduce((max, [, value]) => Math.max(max, value), 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function includesAny(text: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => text.includes(token));
}
