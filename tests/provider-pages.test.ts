import assert from "node:assert/strict";
import test from "node:test";
import { Schema } from "effect";
import { defined } from "./support/defined";
import { decodeJsonRecord } from "./support/json";
import { localizePath, locales } from "@/lib/i18n";
import { translate } from "@/lib/messages";

const baseUrl = process.env["SITE_TEST_URL"];
const decodeFaqPage = Schema.decodeUnknownSync(
  Schema.Struct({
    inLanguage: Schema.String,
    mainEntity: Schema.Array(
      Schema.Struct({ acceptedAnswer: Schema.Struct({ text: Schema.String }) }),
    ),
  }),
);

const host = "https://soulfiremc.com";

function attribute(tag: string, name: string) {
  return new RegExp(`\\b${name}="([^"]*)"`, "iu").exec(tag)?.[1];
}

void test(
  "provider pages serve localized content, canonical metadata and reciprocal language links",
  { skip: !baseUrl, timeout: 60_000 },
  async () => {
    for (const locale of locales)
      for (const kind of ["accounts", "proxies"] as const) {
        const slug = kind === "accounts" ? "localts" : "webshare";
        for (const suffix of ["", `/${slug}`]) {
          const path = localizePath(`/get-${kind}${suffix}`, locale);
          const response = await fetch(new URL(path, baseUrl), {
            signal: AbortSignal.timeout(15_000),
          });
          assert.equal(response.status, 200, path);
          const html = await response.text();
          assert.equal(
            attribute(/<html\b[^>]*>/u.exec(html)?.[0] ?? "", "lang"),
            locale,
            path,
          );
          const links = html.match(/<link\b[^>]*>/gu) ?? [];
          const canonical = links.find(
            (tag) => attribute(tag, "rel") === "canonical",
          );
          assert.equal(
            attribute(canonical ?? "", "href"),
            `${host}${path}`,
            path,
          );
          const alternates = links.filter(
            (tag) =>
              attribute(tag, "rel") === "alternate" &&
              attribute(tag, "hreflang"),
          );
          assert.equal(alternates.length, 5, path);
          for (const lang of [...locales, "x-default"]) {
            const link = alternates.find(
              (tag) => attribute(tag, "hreflang") === lang,
            );
            assert.equal(
              attribute(link ?? "", "href"),
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
              `${host}${localizePath(`/get-${kind}${suffix}`, lang === "x-default" ? "en" : (lang as typeof locale))}`,
            );
          }
          const meta = html.match(/<meta\b[^>]*>/gu) ?? [];
          const image = meta.find(
            (tag) => attribute(tag, "property") === "og:image",
          );
          const imagePath = suffix
            ? `/og/${kind}/${locale === "en" ? "" : `${locale}/`}${slug}/image.webp`
            : `/og/site/${locale === "en" ? "" : `${locale}/`}get-${kind}/image.webp`;
          assert.equal(
            attribute(image ?? "", "content"),
            `${host}${imagePath}`,
            path,
          );
          assert.ok(
            html.includes(
              translate(locale, suffix ? "reviews.writtenReview" : "faq.title"),
            ),
            path,
          );
          assert.ok(
            html.includes(translate(locale, "payments.payments")),
            path,
          );
          const schema = [
            ...html.matchAll(
              /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gu,
            ),
          ].map((match) => decodeJsonRecord(defined(match[1])));
          const page = schema.find(
            (data) => data["@type"] === (suffix ? "WebPage" : "CollectionPage"),
          );
          assert.equal(page?.["inLanguage"], locale, path);
          assert.equal(page["url"], `${host}${path}`, path);
          if (!suffix) {
            const faq = decodeFaqPage(
              schema.find((data) => data["@type"] === "FAQPage"),
            );
            assert.equal(faq.inLanguage, locale, path);
            assert.ok(
              defined(faq.mainEntity[0]).acceptedAnswer.text.includes(
                localizePath(`/docs/how-to/import-${kind}`, locale),
              ),
            );
          }
        }
      }
    const english = await fetch(
      new URL("/en/get-accounts?sort=best-rated", baseUrl),
      { redirect: "manual" },
    );
    assert.equal(english.status, 308);
    assert.equal(
      english.headers.get("location"),
      "/get-accounts?sort=best-rated",
    );
    assert.equal(
      (await fetch(new URL("/pl/get-proxies/not-a-real-provider", baseUrl)))
        .status,
      404,
    );
  },
);
