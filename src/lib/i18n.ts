import { defineI18n } from "fumadocs-core/i18n";

export const locales = ["en", "de", "pl", "ru"] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  de: "Deutsch",
  pl: "Polski",
};
export const i18n = defineI18n({
  defaultLanguage: "en",
  languages: [...locales],
  hideLocale: "default-locale",
  fallbackLanguage: "en",
});

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/** The URL owns the locale, including during SSR. Never use a module global. */
export function splitLocalePath(pathname: string): {
  locale: Locale;
  path: string;
} {
  const [first, ...rest] = pathname.replace(/^\//, "").split("/");
  return isLocale(first)
    ? { locale: first, path: `/${rest.join("/")}`.replace(/\/$/, "") || "/" }
    : { locale: "en", path: pathname.replace(/\/$/, "") || "/" };
}

export function localizePath(path: string, locale: Locale): string {
  const url = new URL(path, "https://soulfiremc.com");
  const bare = splitLocalePath(url.pathname).path;
  const localized =
    locale === "en" ? bare : `/${locale}${bare === "/" ? "" : bare}`;
  return `${localized}${url.search}${url.hash}`;
}

export function isProviderPath(path: string) {
  return /^\/get-(accounts|proxies)(?:\/|$)/.test(path);
}

/** Legal text and service endpoints remain at their existing English URLs. */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const path = splitLocalePath(href.split(/[?#]/)[0]).path;
  return path === "/" ||
    ["/download", "/pricing", "/docs"].includes(path) ||
    path.startsWith("/docs/") ||
    isProviderPath(path)
    ? localizePath(href, locale)
    : href;
}

/** Parse Fumadocs' dot convention without treating the locale as a slug. */
export function docFileInfo(file: string) {
  const match = /^(.*?)(?:\.(en|de|pl|ru))?\.mdx?$/.exec(
    file.replaceAll("\\", "/"),
  );
  if (!match) throw new Error(`Invalid documentation file: ${file}`);
  const locale = (match[2] ?? "en") as Locale;
  const slug = match[1]
    .replace(/(^|\/)\([^/]+\)/g, "")
    .replace(/^\//, "")
    .replace(/(^|\/)index$/, "");
  const path = `/docs/${slug}`.replace(/\/$/, "");
  return { locale, path, slugs: slug.split("/").filter(Boolean) };
}

/** English-only pages switch to the chosen language's home page. */
export function localeDestination(href: string, locale: Locale) {
  const target = localizeHref(href, locale);
  const path = splitLocalePath(href.split(/[?#]/)[0]).path;
  return target === href &&
    !["/", "/download", "/pricing", "/docs"].includes(
      splitLocalePath(href.split(/[?#]/)[0]).path,
    ) &&
    !path.startsWith("/docs/") &&
    !isProviderPath(path)
    ? localizePath("/", locale)
    : target;
}
