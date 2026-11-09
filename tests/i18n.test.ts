import { getRenderedPageSitemap } from "../src/lib/sitemap";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { loader, type VirtualFile } from "fumadocs-core/source";
import {
  docFileInfo,
  i18n,
  locales,
  localeDestination,
  localizeHref,
  localizePath,
  splitLocalePath,
} from "../src/lib/i18n";
import { getSitemapLocalization } from "../src/lib/localized-sitemap";
import { translate } from "../src/lib/messages";
import { getCanonicalLinks, getPageMeta } from "../src/lib/seo";

void test("locale links preserve download choices and anchors without changing service URLs", () => {
  assert.equal(
    localizePath("/download?os=macos&cpu=arm64#build", "pl"),
    "/pl/download?os=macos&cpu=arm64#build",
  );
  assert.equal(
    localizePath("/ru/download?os=linux", "en"),
    "/download?os=linux",
  );
  assert.equal(localizePath("/", "de"), "/de");
  for (const href of [
    "/api/search",
    "/auth/sign-in",
    "/account/settings",
    "/admin",
    "/blog",
    "/privacy-policy",
    "https://example.com/docs",
    "//example.com/docs",
  ]) {
    assert.equal(localizeHref(href, "ru"), href);
  }
  assert.equal(
    localizeHref("/docs/start-here#1-install-the-app", "de"),
    "/de/docs/start-here#1-install-the-app",
  );
  assert.equal(localeDestination("/blog?tag=release", "pl"), "/pl");
  for (const path of [
    "/get-accounts",
    "/get-accounts/localts",
    "/get-proxies",
    "/get-proxies/webshare",
  ]) {
    const href = `${path}?sort=best-rated#reviews`;
    assert.equal(localizeHref(href, "ru"), `/ru${href}`);
    assert.equal(localeDestination(`/de${href}`, "pl"), `/pl${href}`);
    assert.equal(localeDestination(`/de${href}`, "en"), href);
    assert.equal(
      getCanonicalLinks(path, "pl").filter((link) => "hrefLang" in link).length,
      5,
    );
    assert.equal(getSitemapLocalization(`/ru${path}`, {}).exclude, false);
    assert.equal(
      getSitemapLocalization(`/ru${path}`, {}).alternateRefs?.length,
      5,
    );
  }
  assert.deepEqual(splitLocalePath("/pl/docs/"), {
    locale: "pl",
    path: "/docs",
  });
});

void test("doc filenames strip grouping folders and locale suffixes from URLs", () => {
  assert.deepEqual(docFileInfo("(main)/(automation)/sdk/index.ru.mdx"), {
    locale: "ru",
    path: "/docs/sdk",
    slugs: ["sdk"],
  });
  assert.deepEqual(docFileInfo("(main)/start-here/gui-mode.mdx"), {
    locale: "en",
    path: "/docs/start-here/gui-mode",
    slugs: ["start-here", "gui-mode"],
  });
});

function docsSource() {
  const root = join(process.cwd(), "content/docs");
  const files: VirtualFile[] = [];
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.mdx?$/.test(entry.name))
        files.push({
          type: "page",
          path: relative(root, path),
          data: {
            title: /^title: (.+)$/m.exec(readFileSync(path, "utf8"))?.[1],
          },
        });
      else if (/^meta(?:\.(de|pl|ru))?\.json$/.test(entry.name))
        files.push({
          type: "meta",
          path: relative(root, path),
          data: JSON.parse(readFileSync(path, "utf8")),
        });
    }
  }
  walk(root);
  return loader({ baseUrl: "/docs", i18n, source: { files } });
}

void test("Fumadocs resolves the translated onboarding and English fallback in each page tree", () => {
  const source = docsSource();
  for (const locale of locales) {
    for (const slugs of [[], ["start-here"], ["start-here", "gui-mode"]]) {
      const page = source.getPage(slugs, locale);
      assert.ok(page);
      assert.equal(docFileInfo(page.path).locale, locale);
      assert.equal(
        page.url,
        localizePath(`/docs/${slugs.join("/")}`.replace(/\/$/, ""), locale),
      );
      assert.ok(source.getPageTree(locale).children.length);
    }
    const fallback = source.getPage(["server", "docker"], locale);
    assert.ok(fallback);
    assert.equal(docFileInfo(fallback.path).locale, "en");
  }
});

void test("canonical and reciprocal hreflang links omit query data and use English x-default", () => {
  for (const locale of locales) {
    const links = getCanonicalLinks("/download?os=linux#build", locale);
    assert.equal(
      links.find((link) => link.rel === "canonical")?.href,
      `https://soulfiremc.com${localizePath("/download", locale)}`,
    );
    const alternatives = links.filter((link) => "hrefLang" in link);
    assert.equal(alternatives.length, 5);
    assert.equal(
      alternatives.find((link) => link.hrefLang === "x-default")?.href,
      "https://soulfiremc.com/download",
    );
    assert.ok(alternatives.every((link) => !/[?#]/.test(link.href)));
  }
  const fallback = getCanonicalLinks("/ru/docs/server/docker", "en", ["en"]);
  assert.deepEqual(fallback, [
    { rel: "canonical", href: "https://soulfiremc.com/docs/server/docker" },
  ]);
});

void test("localized metadata includes translated titles, descriptions and OG locale", () => {
  for (const locale of ["de", "pl", "ru"] as const) {
    const meta = getPageMeta({
      title: "Download SoulFire",
      description: "Pick your OS and CPU to grab the right SoulFire build.",
      path: "/download",
      locale,
    });
    assert.equal(meta[0].title, translate(locale, "Download SoulFire"));
    assert.notEqual(
      meta.find((value) => value.name === "description")?.content,
      "Pick your OS and CPU to grab the right SoulFire build.",
    );
    assert.equal(
      meta.find((value) => value.property === "og:url")?.content,
      `https://soulfiremc.com/${locale}/download`,
    );
    assert.equal(
      meta.find((value) => value.property === "og:image")?.content,
      `https://soulfiremc.com/og/site/${locale}/download/image.webp`,
    );
  }
});

void test("sitemap excludes fallback clones and advertises only real translations", () => {
  const docs = {
    "/docs": [...locales],
    "/docs/server/docker": ["en" as const],
  };
  for (const locale of locales) {
    const result = getSitemapLocalization(localizePath("/docs", locale), docs);
    assert.equal(result.exclude, false);
    assert.equal(result.alternateRefs?.length, 5);
  }
  assert.equal(
    getSitemapLocalization("/ru/docs/server/docker", docs).exclude,
    true,
  );
  assert.equal(
    getSitemapLocalization("/docs/server/docker", docs).alternateRefs,
    undefined,
  );
});

void test("translation catalogs keep the same complete messages and interpolation tokens", () => {
  const catalogs = ["de", "pl", "ru"].map(
    (locale) =>
      JSON.parse(
        readFileSync(`src/lib/messages/${locale}.json`, "utf8"),
      ) as Record<string, string>,
  );
  for (const catalog of catalogs) {
    assert.deepEqual(
      Object.keys(catalog).sort(),
      Object.keys(catalogs[0]).sort(),
    );
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(value.trim());
      assert.deepEqual(
        (key.match(/\{\w+\}/g) ?? []).sort(),
        (value.match(/\{\w+\}/g) ?? []).sort(),
        key,
      );
    }
  }
  assert.equal(
    translate("pl", "Selected: {os} · {cpu}", { os: "Linux", cpu: "ARM64" }),
    "Wybrano: Linux · ARM64",
  );
  assert.equal(
    translate("de", "An untranslated identifier"),
    "An untranslated identifier",
  );
});

void test("localized sitemap keeps canonical checks and English page priorities", () => {
  const host = "https://soulfiremc.com";
  assert.deepEqual(
    getRenderedPageSitemap(
      "/de/download",
      '<head><link rel="canonical" href="https://soulfiremc.com/de/download" /></head>',
      host,
    ),
    { exclude: false, priority: 0.9, changefreq: "daily" },
  );
  assert.deepEqual(
    getRenderedPageSitemap(
      "/ru/docs/server/docker",
      '<head><link rel="canonical" href="https://soulfiremc.com/docs/server/docker" /></head>',
      host,
    ),
    { exclude: true },
  );
});
