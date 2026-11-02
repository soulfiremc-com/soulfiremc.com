import assert from "node:assert/strict";
import test from "node:test";
import {
  getBlogSitemapPages,
  getRenderedPageSitemap,
  shouldPrerenderPage,
} from "@/lib/sitemap";

const host = "https://soulfiremc.com";
const page = (path: string, extraHead = "") =>
  `<html><head><link rel="canonical" href="${host}${path}"/>${extraHead}</head><body><h1>Page</h1></body></html>`;

void test("blog pages are seeded independently of crawl discovery", () => {
  assert.deepEqual(
    getBlogSitemapPages([
      "stress-testing.mdx",
      "authentication.md",
      "stress-testing.md",
      "index.mdx",
      "meta.json",
      "cover.png",
    ]),
    [
      { path: "/blog" },
      { path: "/blog/authentication" },
      { path: "/blog/stress-testing" },
    ],
  );
  assert.deepEqual(getBlogSitemapPages([]), [{ path: "/blog" }]);
});

void test("prerendering accepts canonical page paths and excludes aliases and non-pages", () => {
  for (const path of [
    "/",
    "/blog",
    "/blog/stress-testing-minecraft-servers",
    "/docs/sdk/typescript",
    "/get-accounts/localts",
    "/privacy-policy",
  ]) {
    assert.equal(shouldPrerenderPage(path), true, path);
  }
  for (const path of [
    "/blog/",
    "/get-accounts/",
    "/get-accounts?sort=price",
    "/docs#setup",
    "/docs/../blog",
    "/docs/%2e%2e/blog",
    "//elsewhere.test/blog",
    "https://elsewhere.test/blog",
    "/discord",
    "/github",
    "/donate",
    "/demo-video",
    "/admin",
    "/admin/reviews",
    "/auth/sign-in",
    "/account",
    "/account/settings",
    "/api/search",
    "/og/site/blog/image.webp",
    "/_shell",
    "/sf-openapi.json",
    "/blog/feed.xml",
    "/llms.txt",
    "/docs/index.mdx",
  ]) {
    assert.equal(shouldPrerenderPage(path), false, path);
  }
});

void test("successful canonical HTML preserves page priorities", () => {
  for (const [path, priority, changefreq] of [
    ["/", 1, "daily"],
    ["/blog", 0.9, "daily"],
    ["/blog/stress-testing-minecraft-servers", 0.7, "weekly"],
    ["/docs/sdk", 0.7, "weekly"],
    ["/docs/openapi/instances", 0.3, "weekly"],
    ["/get-accounts/localts", 0.6, "weekly"],
    ["/privacy-policy", 0.5, "weekly"],
  ] as const) {
    assert.deepEqual(getRenderedPageSitemap(path, page(path), host), {
      exclude: false,
      priority,
      changefreq,
    });
  }
});

void test("redirect destinations, non-HTML responses and noncanonical pages stay excluded", () => {
  for (const [path, html] of [
    ["/blog/", page("/blog")],
    ["/get-accounts/", page("/get-accounts")],
    ["/old-guide", page("/docs/new-guide")],
    ["/sf-openapi.json", '{"openapi":"3.1.0"}'],
    ["/missing", "<html><head></head><body>Not found</body></html>"],
    ["/blog", page("/blog#section")],
    ["/blog", page("/blog?filter=news")],
    ["/blog", page("/blog").replace(host, "https://elsewhere.test")],
    ["/blog", page("/blog", '<link rel="canonical" href="/blog"/>')],
  ]) {
    assert.deepEqual(getRenderedPageSitemap(path, html, host), {
      exclude: true,
    });
  }
});

void test("noindex pages are excluded regardless of metadata attribute order", () => {
  for (const meta of [
    '<meta name="robots" content="noindex, follow"/>',
    "<META content='INDEX, NOINDEX' name='ROBOTS'>",
    '<meta content="none" name="googlebot"/>',
  ]) {
    assert.deepEqual(
      getRenderedPageSitemap("/blog", page("/blog", meta), host),
      {
        exclude: true,
      },
    );
  }
  assert.deepEqual(
    getRenderedPageSitemap(
      "/blog",
      "<html><head><link href='/blog' rel='canonical'><meta content='index, follow' name='robots'></head></html>",
      host,
    ),
    { exclude: false, priority: 0.9, changefreq: "daily" },
  );
});
