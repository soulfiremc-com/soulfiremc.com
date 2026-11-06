import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import * as MdxConfig from "./source.config.ts";
import {
  getBlogSitemapPages,
  getRenderedPageSitemap,
  shouldPrerenderPage,
} from "./src/lib/sitemap.ts";
const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-XSS-Protection": "0",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
};
const sitemapHost = "https://soulfiremc.com";
export default defineConfig(() => ({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(
      process.env.VITE_APP_VERSION?.trim() ||
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    ),
  },
  build: { sourcemap: true },
  environments: { ssr: { build: { sourcemap: true } } },
  envPrefix: ["VITE_"],
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/history",
      "@tanstack/query-core",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "@tanstack/react-store",
      "@tanstack/router-core",
      "@tanstack/store",
    ],
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    mdx(MdxConfig),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      sitemap: {
        enabled: true,
        host: sitemapHost,
      },
      pages: [
        ...getBlogSitemapPages(
          readdirSync(MdxConfig.blog.dir, { withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name),
        ),
        {
          path: "/admin",
          prerender: {
            enabled: false,
          },
          sitemap: {
            exclude: true,
          },
        },
      ],
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: false,
        filter: (page) => {
          // Start retains skipped and failed pages in its sitemap input.
          page.sitemap = { ...page.sitemap, exclude: true };
          return shouldPrerenderPage(page.path);
        },
        onSuccess: ({ page, html }) => ({
          sitemap: getRenderedPageSitemap(page.path, html, sitemapHost),
        }),
      },
    }),
    react(),
  ],
  server: {
    headers: securityHeaders,
  },
}));
