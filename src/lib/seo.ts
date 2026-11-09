import {
  locales,
  splitLocalePath,
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

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function getPageMeta({
  title,
  description,
  path,
  imageUrl = defaultSocialImageUrl,
  imageAlt = `${siteName} social preview`,
  ogType = "website",
  locale = splitLocalePath(path).locale,
}: {
  title: string;
  description: string;
  path: string;
  imageAlt?: string;
  imageUrl?: string;
  ogType?: "article" | "website";
  locale?: Locale;
}) {
  path = localizePath(path, locale);
  imageUrl = absoluteUrl(imageUrl);
  const bare = splitLocalePath(path).path;
  if (
    locale !== "en" &&
    ["/", "/download", "/pricing", "/get-accounts", "/get-proxies"].includes(
      bare,
    )
  ) {
    const name = bare === "/" ? "home" : bare.slice(1);
    imageUrl = absoluteUrl(`/og/site/${locale}/${name}/image.webp`);
  }
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: ogType },
    {
      property: "og:locale",
      content: { en: "en_US", de: "de_DE", pl: "pl_PL", ru: "ru_RU" }[locale],
    },
    { property: "og:site_name", content: siteName },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: absoluteUrl(path) },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:image:type", content: "image/webp" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt },
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
  const bare = splitLocalePath(path.split(/[?#]/)[0]).path;
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

export function jsonLdScript(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data),
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
  path = localizePath(path, locale);
  return {
    inLanguage: locale,
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    breadcrumb: withBreadcrumb
      ? { "@id": `${absoluteUrl(path)}#breadcrumb` }
      : undefined,
    primaryImageOfPage: imageUrl
      ? {
          "@type": "ImageObject",
          url: absoluteUrl(imageUrl),
        }
      : undefined,
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
      absoluteUrl("/discord"),
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
