import { createElement } from "react";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createProviderFaqJsonLd,
  providerFaqs,
} from "@/components/provider-faq";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { ReviewStarInput } from "@/components/review-stars";
import {
  PROVIDERS as accounts,
  BADGE_CONFIG as accountBadges,
  CATEGORY_CONFIG,
} from "@/lib/accounts-data";
import {
  PROVIDERS as proxies,
  BADGE_CONFIG as proxyBadges,
} from "@/lib/proxies-data";
import { LocaleProvider } from "@/lib/i18n-react";
import { translate } from "@/lib/messages";
import { getAccountPageImage, getProxyPageImage } from "@/lib/og";
import { formatProviderSince, localizeProviderData } from "@/lib/provider-i18n";
import { getPageMeta } from "@/lib/seo";

void test("all provider descriptions, offer details, badges and FAQs have translations", () => {
  const messages = new Set<string>();
  for (const provider of [...accounts, ...proxies]) {
    for (const field of [
      "summary",
      "price",
      "priceDetails",
      "couponDiscount",
      "linkDiscountMessage",
    ] as const) {
      const value = (provider as Record<string, unknown>)[field];
      if (typeof value === "string" && /[a-z]/i.test(value))
        messages.add(value);
    }
    for (const image of provider.gallery ?? []) messages.add(image.alt);
  }
  for (const badge of [
    ...Object.values(accountBadges),
    ...Object.values(proxyBadges),
    ...Object.values(CATEGORY_CONFIG),
  ]) {
    messages.add(badge.label);
    messages.add(badge.description);
  }
  for (const items of Object.values(providerFaqs))
    for (const item of items) {
      messages.add(item.question);
      messages.add(item.answer);
    }
  for (const locale of ["de", "pl", "ru"] as const) {
    const catalog = JSON.parse(
      readFileSync(`src/lib/messages/${locale}.json`, "utf8"),
    );
    for (const message of messages)
      assert.ok(catalog[message], `${locale}: ${message}`);
  }
});

void test("provider metadata localizes IDs, navigation and descriptions while retaining offers and identities", () => {
  const source = {
    "@id": "https://soulfiremc.com/get-accounts#provider-list",
    inLanguage: "en-US",
    itemListElement: [
      {
        name: "nav.home",
        item: "https://soulfiremc.com",
      },
      {
        name: "Localts",
        description: accounts.find((p) => p.slug === "localts")!.summary,
        url: "https://soulfiremc.com/get-accounts/localts#reviews",
        offers: {
          price: "4.50",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: "https://localts.store/?ref=soulfire",
        },
      },
    ],
    isPartOf: { "@id": "https://soulfiremc.com/#website" },
  };
  const result = localizeProviderData(source, "de");
  assert.equal(
    result["@id"],
    "https://soulfiremc.com/de/get-accounts#provider-list",
  );
  assert.equal(result.inLanguage, "de");
  assert.equal(result.itemListElement[0].item, "https://soulfiremc.com/de");
  assert.equal(result.itemListElement[0].name, "Startseite");
  assert.equal(result.itemListElement[1].name, "Localts");
  assert.notEqual(
    result.itemListElement[1].description,
    source.itemListElement[1].description,
  );
  assert.equal(
    result.itemListElement[1].url,
    "https://soulfiremc.com/de/get-accounts/localts#reviews",
  );
  assert.deepEqual(
    result.itemListElement[1].offers,
    source.itemListElement[1].offers,
  );
  assert.deepEqual(result.isPartOf, source.isPartOf);
  assert.equal(source.inLanguage, "en-US");
});

void test("FAQ structured data translates full answers and their guide links", () => {
  for (const kind of ["accounts", "proxies"] as const)
    for (const locale of ["de", "pl", "ru"] as const) {
      const faq = createProviderFaqJsonLd(kind, locale);
      assert.equal(faq.inLanguage, locale);
      assert.equal(faq.mainEntity.length, providerFaqs[kind].length);
      assert.notEqual(faq.mainEntity[0].name, providerFaqs[kind][0].question);
      const answer = faq.mainEntity[0].acceptedAnswer.text;
      assert.ok(
        answer.includes(
          `https://soulfiremc.com/${locale}/docs/how-to/import-${kind}`,
        ),
      );
      assert.ok(!answer.includes("{guide}"));
    }
});

void test("rating labels and numeric formatting follow the page language", () => {
  const html = renderToStaticMarkup(
    createElement(LocaleProvider, {
      locale: "de",
      children: [
        createElement(ReviewSummaryBadge, {
          key: "summary",
          summary: { averageRating: 4.5, reviewCount: 3 },
        }),
        createElement(ReviewStarInput, {
          key: "input",
          value: 3,
          onChange: () => {},
        }),
      ],
    }),
  );
  assert.match(html, /4,5/);
  assert.match(html, /Bewertungen: 3/);
  assert.match(html, /Bewertung setzen: 3\/5/);
  assert.ok(!html.includes("ratings"));
});

void test("localized catalog and provider previews have distinct image URLs", () => {
  for (const locale of ["de", "pl", "ru"] as const) {
    assert.equal(
      getAccountPageImage("localts", locale).url,
      `/og/accounts/${locale}/localts/image.webp`,
    );
    assert.equal(
      getProxyPageImage("webshare", locale).url,
      `/og/proxies/${locale}/webshare/image.webp`,
    );
    const meta = getPageMeta({
      title: translate(locale, "providers.proxies.meta.title"),
      description: translate(locale, "common.getProxies"),
      path: "/get-proxies",
      locale,
    });
    assert.equal(
      meta[0].title,
      translate(locale, "providers.proxies.meta.title"),
    );
    assert.equal(
      meta.find((m) => m.property === "og:image")?.content,
      `https://soulfiremc.com/og/site/${locale}/get-proxies/image.webp`,
    );
  }
  assert.equal(
    getAccountPageImage("localts").url,
    "/og/accounts/localts/image.webp",
  );
});

void test("provider start dates use localized month forms without changing year-only dates", () => {
  assert.equal(formatProviderSince("May 2026", "de"), "Mai 2026");
  assert.equal(formatProviderSince("May 2026", "pl"), "maja 2026");
  assert.equal(formatProviderSince("May 2026", "ru"), "мая 2026");
  assert.equal(formatProviderSince("May 2026", "en"), "May 2026");
  assert.equal(formatProviderSince("2018", "ru"), "2018");
});
