const OG_FILE_NAME = "image.webp";

function createOgImage(basePath: string, segments: string[]) {
  const fullSegments = [...segments, OG_FILE_NAME];

  return {
    segments: fullSegments,
    url: `${basePath}/${fullSegments.join("/")}`,
  };
}

export function stripOgSuffix(slug: string[]) {
  return slug.at(-1) === OG_FILE_NAME ? slug.slice(0, -1) : slug;
}

export function getDocsPageImage(page: { slugs: string[] }) {
  return createOgImage("/og/docs", page.slugs);
}

export function getBlogPageImage(page: { slugs: string[] }) {
  return createOgImage("/og/blog", page.slugs);
}

export function getProxyPageImage(slug: string) {
  return createOgImage("/og/proxies", [slug]);
}

export function getAccountPageImage(slug: string) {
  return createOgImage("/og/accounts", [slug]);
}

export function getResourcePageImage(slug: string) {
  return createOgImage("/og/resources", [slug]);
}

export function labelize(value: string) {
  return value
    .split(/[-/]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
