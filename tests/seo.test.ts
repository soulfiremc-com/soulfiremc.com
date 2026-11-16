import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { SHOPS } from "@/lib/accounts-data";
import { PROVIDERS as proxies } from "@/lib/proxies-data";
import {
  createBlogPostingStructuredData,
  getPageMeta,
  truncateDescription,
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
});

void test("every provider logo has a copy that OG images can embed", () => {
  const logos = [...SHOPS, ...proxies].map((provider) => provider.logo);
  const missing = logos.filter(
    (logo) => !existsSync(new URL(`../src/assets${logo}`, import.meta.url)),
  );
  assert.deepEqual(missing, []);
});
