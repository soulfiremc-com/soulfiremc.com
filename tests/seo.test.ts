import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd, JsonLdScript } from "@/components/json-ld";
import { SHOPS } from "@/lib/accounts-data";
import { PROVIDERS as proxies } from "@/lib/proxies-data";
import {
  createBlogPostingStructuredData,
  getPageMeta,
  jsonLdScript,
  truncateDescription,
  withSiteName,
} from "@/lib/seo";

void test("long meta descriptions end at a word boundary within 160 characters", () => {
  const description =
    "50M+ residential IPs across 195+ countries, plus mobile, static ISP, datacenter, and IPv6 proxies. HTTP(S) and SOCKS5 on all products, with UDP on UDP Residential.";
  const meta = getPageMeta({ title: "Proxy", description, path: "/" });
  const values = meta
    .filter((entry) =>
      ["description", "og:description", "twitter:description"].includes(
        entry.name ?? entry.property ?? "",
      ),
    )
    .map((entry) => entry.content);

  assert.equal(values.length, 3);
  for (const value of values) {
    assert.ok(value && value.length <= 160);
    assert.equal(
      value,
      "50M+ residential IPs across 195+ countries, plus mobile, static ISP, datacenter, and IPv6 proxies. HTTP(S) and SOCKS5 on all products, with UDP on UDP…",
    );
  }
  assert.equal(truncateDescription("Short  text\n"), "Short text");
});

void test("page titles name the site once", () => {
  assert.equal(withSiteName("Auto attack"), "Auto attack - SoulFire");
  assert.equal(
    withSiteName("SoulFire documentation"),
    "SoulFire documentation",
  );
  assert.equal(
    withSiteName("Run SoulFire with Docker Compose"),
    "Run SoulFire with Docker Compose",
  );
});

void test("social previews describe the page and declare the image size", () => {
  const meta = getPageMeta({
    title: "Auto attack - SoulFire",
    description: "Configure targeting.",
    path: "/docs/how-to/kill-aura",
  });
  const value = (key: string) =>
    meta.find((entry) => (entry.property ?? entry.name) === key)?.content;
  assert.equal(value("og:image:alt"), "Auto attack - SoulFire");
  assert.equal(value("twitter:image:alt"), "Auto attack - SoulFire");
  assert.equal(value("og:image:width"), "1200");
  assert.equal(value("og:image:height"), "630");
});

void test("blog posts publish article metadata and BlogPosting data", () => {
  const meta = getPageMeta({
    title: "Post - SoulFire",
    description: "A post.",
    path: "/blog/post",
    ogType: "article",
    publishedTime: "2026-02-04",
  });
  assert.equal(
    meta.find((entry) => entry.property === "article:published_time")?.content,
    "2026-02-04",
  );
  assert.equal(
    getPageMeta({ title: "Home", description: "Home.", path: "/" }).some(
      (entry) => entry.property === "article:published_time",
    ),
    false,
  );

  assert.deepEqual(
    createBlogPostingStructuredData({
      path: "/blog/post",
      title: "Post",
      description: "A post.",
      imageUrl: "/og/blog/post/image.webp",
      author: "Pistonmaster",
      datePublished: "2026-02-04",
      keywords: ["minecraft", "testing"],
    }),
    {
      "@type": "BlogPosting",
      "@id": "https://soulfiremc.com/blog/post#article",
      headline: "Post",
      description: "A post.",
      url: "https://soulfiremc.com/blog/post",
      mainEntityOfPage: { "@id": "https://soulfiremc.com/blog/post#webpage" },
      image: "https://soulfiremc.com/og/blog/post/image.webp",
      author: { "@type": "Person", name: "Pistonmaster" },
      publisher: { "@id": "https://soulfiremc.com/#organization" },
      inLanguage: "en",
      datePublished: "2026-02-04",
      keywords: "minecraft, testing",
    },
  );

  assert.deepEqual(
    createBlogPostingStructuredData({
      path: "/blog/post",
      title: "Post",
      description: "A post.",
      imageUrl: "/og/blog/post/image.webp",
      author: "SoulFire Team",
    }).author,
    { "@id": "https://soulfiremc.com/#organization" },
  );
});

void test("every provider logo has a copy that OG images can embed", () => {
  const logos = [...SHOPS, ...proxies].map((provider) => provider.logo);
  const missing = logos.filter(
    (logo) => !existsSync(new URL(`../src/assets${logo}`, import.meta.url)),
  );
  assert.deepEqual(missing, []);
});

const hostileReview = {
  "@context": "https://schema.org",
  "@type": "Review",
  reviewBody: "</script><script>alert(1)</script><!--",
} as const;

void test("JSON-LD text cannot close its script element", () => {
  const { children } = jsonLdScript(hostileReview);
  assert.ok(!children.includes("<"));
  assert.deepEqual(JSON.parse(children), hostileReview);

  for (const element of [
    createElement(JsonLd, { data: hostileReview }),
    createElement(JsonLdScript, { json: JSON.stringify(hostileReview) }),
  ]) {
    const html = renderToStaticMarkup(element);
    assert.equal(html.match(/<\/script>/gu)?.length, 1);
    const json = /^<script type="application\/ld\+json">(.*)<\/script>$/u.exec(
      html,
    )?.[1];
    assert.deepEqual(JSON.parse(json ?? ""), hostileReview);
  }
});
