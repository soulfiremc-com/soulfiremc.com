import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createGetUrl, getSlugs } from "fumadocs-core/source";
import { docsFunctionId, staticDocsMetadata } from "./scripts/static-docs.ts";
import { execFileSync } from "node:child_process";
import { cloudflare } from "@cloudflare/vite-plugin";
import posthog from "@posthog/rollup-plugin";
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
function getDocsPrerenderPages() {
  const directory = resolve(MdxConfig.docs.dir);
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => ({
      path: createGetUrl("/docs")(
        getSlugs(
          relative(directory, join(entry.parentPath, entry.name)).replaceAll(
            "\\",
            "/",
          ),
        ),
      ),
    }));
}

export default defineConfig(({ command }) => ({
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
      serverFns: { generateFunctionId: docsFunctionId },
      sitemap: {
        enabled: true,
        host: sitemapHost,
      },
      pages: [
        ...getDocsPrerenderPages(),
        {
          path: "/api/search",
          prerender: { enabled: true, outputPath: "/api/search" },
          sitemap: { exclude: true },
        },
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
        failOnError: true,
        crawlLinks: true,
        autoSubfolderIndex: false,
        filter: (page) => {
          // Start retains skipped and failed pages in its sitemap input.
          page.sitemap = { ...page.sitemap, exclude: true };
          return page.path === "/api/search" || shouldPrerenderPage(page.path);
        },
        onSuccess: ({ page, html }) => ({
          sitemap: getRenderedPageSitemap(page.path, html, sitemapHost),
        }),
      },
    }),
    staticDocsMetadata(),
    react(),
    ...(command === "build" && process.env.POSTHOG_PERSONAL_API_KEY
      ? [
          {
            ...posthog({
              personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
              projectId: "101553",
              host: "https://eu.posthog.com",
              sourcemaps: {
                enabled: true,
                releaseName: "soulfiremc.com",
                releaseVersion:
                  process.env.GITHUB_SHA ??
                  execFileSync("git", ["rev-parse", "HEAD"], {
                    encoding: "utf8",
                  }).trim(),
                deleteAfterUpload: false,
              },
            }),
            applyToEnvironment: (environment: { name: string }) =>
              environment.name === "client",
          },
        ]
      : []),
  ],
  server: {
    headers: securityHeaders,
  },
}));
