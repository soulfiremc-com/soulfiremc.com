import { splitLocalePath } from "./i18n.ts";
const DAILY_PAGES = new Set([
  "/",
  "/blog",
  "/docs",
  "/download",
  "/get-accounts",
  "/get-proxies",
  "/pricing",
]);

const REDIRECT_PAGES = new Set([
  "/discord",
  "/github",
  "/donate",
  "/demo-video",
]);

export function shouldPrerenderPage(path: string) {
  try {
    if (new URL(path, "https://soulfiremc.com").pathname !== path) return false;
  } catch {
    return false;
  }

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    (path === "/" || !path.endsWith("/")) &&
    !/[?#]/u.test(path) &&
    !path.includes("://") &&
    !/^\/(?:_|api(?:\/|$)|og(?:\/|$)|admin(?:\/|$)|auth(?:\/|$)|account(?:\/|$))/u.test(
      path,
    ) &&
    !/\.(?:json|xml|txt|mdx?|ya?ml|webp|png|jpe?g|gif|svg|ico|pdf|zip|exe|dmg|js|css|map)$/iu.test(
      path,
    ) &&
    !REDIRECT_PAGES.has(path)
  );
}

export function getBlogSitemapPages(filenames: readonly string[]) {
  return [
    { path: "/blog" },
    ...[
      ...new Set(
        filenames
          .filter((filename) => /\.(?:md|mdx)$/u.test(filename))
          .map((filename) => filename.replace(/\.(?:md|mdx)$/u, ""))
          .filter((slug) => slug !== "index")
          .map((slug) => `/blog/${slug}`),
      ),
    ]
      .toSorted()
      .map((path) => ({ path })),
  ];
}

function getAttribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"))?.[2];
}

function isIndexableCanonicalPage(path: string, html: string, host: string) {
  if (!shouldPrerenderPage(path)) return false;

  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1];
  if (!head) return false;

  for (const [tag] of head.matchAll(/<meta\b[^>]*>/giu)) {
    const name = getAttribute(tag, "name")?.toLowerCase();
    if (
      (name === "robots" || name === "googlebot") &&
      /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/iu.test(
        getAttribute(tag, "content") ?? "",
      )
    ) {
      return false;
    }
  }

  const canonicalLinks = [...head.matchAll(/<link\b[^>]*>/giu)]
    .map(([tag]) => tag)
    .filter((tag) => getAttribute(tag, "rel")?.toLowerCase() === "canonical");
  const [canonicalLink] = canonicalLinks;
  if (canonicalLinks.length !== 1 || canonicalLink === undefined) return false;

  const href = getAttribute(canonicalLink, "href");
  if (!href) return false;

  try {
    return new URL(href, host).href === new URL(path, host).href;
  } catch {
    return false;
  }
}

export function getRenderedPageSitemap(
  path: string,
  html: string,
  host: string,
) {
  if (!isIndexableCanonicalPage(path, html, host)) return { exclude: true };

  const barePath = splitLocalePath(path).path;
  let priority = 0.5;
  let changefreq: "daily" | "weekly" = "weekly";
  if (barePath === "/") {
    priority = 1;
    changefreq = "daily";
  } else if (DAILY_PAGES.has(barePath)) {
    priority = 0.9;
    changefreq = "daily";
  } else if (barePath.startsWith("/docs/openapi/")) {
    priority = 0.3;
  } else if (barePath.startsWith("/blog/") || barePath.startsWith("/docs/")) {
    priority = 0.7;
  } else if (
    barePath.startsWith("/get-accounts/") ||
    barePath.startsWith("/get-proxies/")
  ) {
    priority = 0.6;
  }

  return { exclude: false, priority, changefreq };
}
