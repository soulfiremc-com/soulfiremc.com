import {
  locales,
  splitLocalePath,
  hrefPath,
  localizePath,
  isProviderPath,
  type Locale,
} from "./i18n";
import {
  absoluteUrl,
  defaultSocialImageUrl,
  siteDescription,
  siteName,
  siteUrl,
} from "./site";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

const maxDescriptionLength = 160;

/** Shortens text at a word boundary so search snippets do not cut it mid-word. */
export function truncateDescription(
  text: string,
  maxLength = maxDescriptionLength,
) {
  const normalized = text.replaceAll(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength / 2 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\-–(]+$/u, "")}…`;
}

export function getPageMeta({
  title,
  description,
  path,
  imageUrl = defaultSocialImageUrl,
  imageAlt = `${siteName} social preview`,
  ogType = "website",
  publishedTime,
  locale = splitLocalePath(path).locale,
}: {
  title: string;
  description: string;
  path: string;
  imageAlt?: string;
  imageUrl?: string;
  ogType?: "article" | "website";
  publishedTime?: string;
  locale?: Locale;
}) {
  const localizedPath = localizePath(path, locale);
  const summary = truncateDescription(description);
  let absoluteImageUrl = absoluteUrl(imageUrl);
  const bare = splitLocalePath(localizedPath).path;
  if (
    locale !== "en" &&
    ["/", "/download", "/pricing", "/get-accounts", "/get-proxies"].includes(
      bare,
    )
  ) {
    const name = bare === "/" ? "home" : bare.slice(1);
    absoluteImageUrl = absoluteUrl(`/og/site/${locale}/${name}/image.webp`);
  }
  return [
    { title },
    { name: "description", content: summary },
    { property: "og:type", content: ogType },
    {
      property: "og:locale",
      content: { en: "en_US", de: "de_DE", pl: "pl_PL", ru: "ru_RU" }[locale],
    },
    { property: "og:site_name", content: siteName },
    { property: "og:title", content: title },
    { property: "og:description", content: summary },
    { property: "og:url", content: absoluteUrl(localizedPath) },
    { property: "og:image", content: absoluteImageUrl },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:image:type", content: "image/webp" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: summary },
    { name: "twitter:image", content: absoluteImageUrl },
    { name: "twitter:image:alt", content: imageAlt },
    ...(ogType === "article" && publishedTime
      ? [{ property: "article:published_time", content: publishedTime }]
      : []),
  ];
}

export function getLanguageAlternates(
  path: string,
  languages: readonly Locale[],
) {
  return [
    ...languages.map((language) => ({
      language,
      href: absoluteUrl(localizePath(path, language)),
    })),
    { language: "x-default", href: absoluteUrl(localizePath(path, "en")) },
  ];
}

export function getCanonicalLinks(
  path: string,
  locale = splitLocalePath(path).locale,
  languages?: readonly Locale[],
) {
  const bare = splitLocalePath(hrefPath(path)).path;
  const available =
    languages ??
    (["/", "/download", "/pricing"].includes(bare) || isProviderPath(bare)
      ? locales
      : ["en"]);
  return [
    {
      rel: "canonical" as const,
      href: absoluteUrl(localizePath(bare, locale)),
    },
    ...(available.length > 1
      ? getLanguageAlternates(bare, available).map(({ language, href }) => ({
          rel: "alternate" as const,
          hrefLang: language,
          href,
        }))
      : []),
  ];
}

/**
 * Makes serialized JSON safe as the raw text of a script element. A string
 * value such as a review body that contains `</script>` would otherwise end
 * the element and let the rest of the value run as HTML.
 */
export function escapeScriptJson(json: string) {
  return json.replaceAll("<", String.raw`\u003c`);
}

export function jsonLdScript(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: escapeScriptJson(JSON.stringify(data)),
  };
}

export function createStructuredDataGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function createBreadcrumbStructuredData(
  path: string,
  items: BreadcrumbItem[],
) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function createWebPageStructuredData({
  path,
  title,
  description,
  type = "WebPage",
  imageUrl,
  withBreadcrumb = false,
  locale = splitLocalePath(path).locale,
}: {
  path: string;
  title: string;
  description: string;
  type?: string;
  imageUrl?: string;
  withBreadcrumb?: boolean;
  locale?: Locale;
}) {
  const localizedPath = localizePath(path, locale);
  return {
    inLanguage: locale,
    "@type": type,
    "@id": `${absoluteUrl(localizedPath)}#webpage`,
    url: absoluteUrl(localizedPath),
    name: title,
    description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    breadcrumb: withBreadcrumb
      ? { "@id": `${absoluteUrl(localizedPath)}#breadcrumb` }
      : undefined,
    primaryImageOfPage: imageUrl
      ? {
          "@type": "ImageObject",
          url: absoluteUrl(imageUrl),
        }
      : undefined,
  };
}

export function createBlogPostingStructuredData({
  path,
  title,
  description,
  imageUrl,
  author,
  datePublished,
  keywords,
}: {
  path: string;
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  datePublished?: string;
  keywords?: readonly string[];
}) {
  const url = absoluteUrl(path);
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    image: absoluteUrl(imageUrl),
    author: { "@type": "Person", name: author },
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en",
    ...(datePublished ? { datePublished } : {}),
    ...(keywords && keywords.length > 0
      ? { keywords: keywords.join(", ") }
      : {}),
  };
}

export function getOrganizationStructuredData() {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.png"),
      contentUrl: absoluteUrl("/logo.png"),
    },
    sameAs: [
      // The real invite, not this site's own redirect to it.
      import.meta.env.VITE_DISCORD_LINK ?? absoluteUrl("/discord"),
      "https://github.com/soulfiremc-com/SoulFire",
    ],
  };
}

export function getWebsiteStructuredData() {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: siteName,
    description: siteDescription,
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: [...locales],
  };
}

export {
  absoluteUrl,
  defaultSocialImageUrl,
  siteDescription,
  siteName,
  siteUrl,
};
