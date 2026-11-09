import { splitLocalePath } from "../src/lib/i18n";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import { fromJSON } from "seroval";

const baseUrl = process.env.SITE_TEST_URL;

type Metadata = {
  result: { url: string; title: string; type: string; pageTree: unknown };
};

function collectUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectUrls);
  if (!value || typeof value !== "object") return [];
  const own =
    "url" in value && typeof value.url === "string" ? [value.url] : [];
  return [...own, ...Object.values(value).flatMap(collectUrls)];
}

void test(
  "docs navigation and search are served from static assets",
  { skip: !baseUrl, timeout: 30_000 },
  async () => {
    async function metadata(path: string) {
      const document = await fetch(new URL(path, baseUrl), {
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(document.status, 200, path);
      path = new URL(document.url).pathname;
      await document.body?.cancel();
      const { path: bare, locale } = splitLocalePath(path);
      const slugs =
        bare === "/docs"
          ? []
          : bare.slice("/docs/".length).split("/").map(decodeURIComponent);
      const hash = JSON.stringify([locale, ...slugs])
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_");
      const key = createHash("sha1")
        .update(`docs-metadata__${hash}`)
        .digest("hex");
      const response = await fetch(
        new URL(`/__tsr/staticServerFnCache/${key}.json`, baseUrl),
        { signal: AbortSignal.timeout(15_000) },
      );
      assert.equal(response.status, 200, path);
      assert.ok(
        response.headers.has("etag"),
        `Metadata is not a static asset: ${path}`,
      );
      const data = fromJSON(await response.json()) as Metadata;
      assert.equal(data.result.url, path);
      assert.ok(data.result.title);
      return data.result;
    }

    const root = await metadata("/docs");
    const urls = collectUrls(root.pageTree);
    const guide = urls.find(
      (url) =>
        url.startsWith("/docs/") &&
        !url.startsWith("/docs/openapi") &&
        !/[?#]/.test(url),
    );
    assert.ok(guide, "Documentation navigation must contain a guide");
    assert.equal((await metadata(guide)).type, "docs");
    const api = urls.find(
      (url) => url.startsWith("/docs/openapi/") && !/[?#]/.test(url),
    );
    assert.ok(api, "Documentation navigation must contain API reference pages");
    assert.equal((await metadata(api)).type, "openapi");

    const index = await fetch(new URL("/api/search", baseUrl), {
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(index.status, 200);
    assert.ok(index.headers.has("etag"), "Search index must be a static asset");
    assert.match(index.headers.get("content-type") ?? "", /application\/json/);
    const client = oramaStaticClient({
      from: new URL("/api/search", baseUrl).href,
      locale: "en",
    });
    const results = await client.search("server");
    assert.ok(results.length > 0);
    assert.ok(results.every((result) => result.url.startsWith("/docs")));
    for (const [locale, query] of [
      ["de", "Erste"],
      ["pl", "Pierwsze"],
      ["ru", "Подключите"],
    ]) {
      assert.equal(
        (await metadata(`/${locale}/docs/start-here/gui-mode`)).type,
        "docs",
      );
      assert.equal(
        (await metadata(`/${locale}/docs/server/docker`)).type,
        "docs",
      );
      const localizedClient = oramaStaticClient({
        from: new URL(`/api/search-index/${locale}`, baseUrl).href,
        locale,
      });
      const localizedResults = await localizedClient.search(query);
      assert.ok(localizedResults.length > 0, locale);
      assert.ok(
        localizedResults.every((result) =>
          result.url.startsWith(`/${locale}/docs`),
        ),
        locale,
      );
    }
  },
);
