import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import * as MdxConfig from "./source.config";

const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-XSS-Protection": "0",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
};

type Changefreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

const TOP_LEVEL_LANDING_PAGES = new Set([
  "/blog",
  "/docs",
  "/download",
  "/get-accounts",
  "/get-proxies",
  "/pricing",
  "/resources",
]);

const LEGAL_PAGES = new Set([
  "/cookie-policy",
  "/imprint",
  "/privacy-policy",
  "/terms-of-service",
]);

function getSitemapSettings(path: string): {
  priority: number;
  changefreq: Changefreq;
} {
  if (path === "/") return { priority: 1.0, changefreq: "weekly" };
  if (TOP_LEVEL_LANDING_PAGES.has(path))
    return { priority: 0.9, changefreq: "weekly" };
  if (path.startsWith("/blog/"))
    return { priority: 0.7, changefreq: "monthly" };
  if (path.startsWith("/docs/openapi/"))
    return { priority: 0.3, changefreq: "monthly" };
  if (path.startsWith("/docs/"))
    return { priority: 0.7, changefreq: "monthly" };
  if (
    path.startsWith("/get-accounts/") ||
    path.startsWith("/get-proxies/") ||
    path.startsWith("/resources/")
  )
    return { priority: 0.6, changefreq: "monthly" };
  if (LEGAL_PAGES.has(path)) return { priority: 0.3, changefreq: "yearly" };
  return { priority: 0.5, changefreq: "monthly" };
}

export default defineConfig(() => ({
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
        host: "https://soulfiremc.com",
      },
      pages: [
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
        filter: ({ path }: { path: string }) =>
          !(
            path.startsWith("/_") ||
            path.startsWith("/api") ||
            path.startsWith("/og") ||
            path.startsWith("//") ||
            (path !== "/" && path.endsWith("/")) ||
            path.includes("://") ||
            path === "/discord" ||
            path === "/github" ||
            path === "/donate" ||
            path === "/demo-video" ||
            path === "/admin"
          ),
        onSuccess: ({ page }: { page: { path: string } }) => ({
          sitemap: getSitemapSettings(page.path),
        }),
      },
    }),
    react(),
  ],
  server: {
    headers: securityHeaders,
  },
}));
