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
  return (locales as readonly (string | undefined)[]).includes(value);
}

/** The URL owns the locale, including during SSR. Never use a module global. */
export function splitLocalePath(pathname: string): {
  locale: Locale;
  path: string;
} {
  const [first, ...rest] = pathname.replace(/^\//u, "").split("/");
  return isLocale(first)
    ? { locale: first, path: `/${rest.join("/")}`.replace(/\/$/u, "") || "/" }
    : { locale: "en", path: pathname.replace(/\/$/u, "") || "/" };
}

export function localizePath(path: string, locale: Locale): string {
  const url = new URL(path, "https://soulfiremc.com");
  const bare = splitLocalePath(url.pathname).path;
  const localized =
    locale === "en" ? bare : `/${locale}${bare === "/" ? "" : bare}`;
  return `${localized}${url.search}${url.hash}`;
}

export function isProviderPath(path: string) {
  return /^\/get-(accounts|proxies)(?:\/|$)/u.test(path);
}

/** The path part of a link, without its query string or fragment. */
export function hrefPath(href: string) {
  return href.replace(/[?#][\s\S]*$/u, "");
}

/** Legal text and service endpoints remain at their existing English URLs. */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const path = splitLocalePath(hrefPath(href)).path;
  return path === "/" ||
    ["/download", "/pricing", "/docs"].includes(path) ||
    path.startsWith("/docs/") ||
    isProviderPath(path)
    ? localizePath(href, locale)
    : href;
}

/** Format in UTC with the URL locale so server and browser output match. */
export function formatLocaleDate(date: Date | string | number, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(date));
}

/** Whole euro amounts, such as "€5" in English and "5 €" in German. */
export function formatEuro(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse Fumadocs' dot convention without treating the locale as a slug. */
export function docFileInfo(file: string) {
  const match = /^(.*?)(?:\.(en|de|pl|ru))?\.mdx?$/u.exec(
    file.replaceAll("\\", "/"),
  );
  if (!match) throw new Error(`Invalid documentation file: ${file}`);
  const [, base = "", localeSuffix] = match;
  const locale = isLocale(localeSuffix) ? localeSuffix : "en";
  const slug = base
    .replaceAll(/(^|\/)\([^/]+\)/gu, "")
    .replace(/^\//u, "")
    .replace(/(^|\/)index$/u, "");
  const path = `/docs/${slug}`.replace(/\/$/u, "");
  return { locale, path, slugs: slug.split("/").filter(Boolean) };
}

/** English-only pages switch to the chosen language's home page. */
export function localeDestination(href: string, locale: Locale) {
  const target = localizeHref(href, locale);
  const path = splitLocalePath(hrefPath(href)).path;
  return target === href &&
    !["/", "/download", "/pricing", "/docs"].includes(
      splitLocalePath(hrefPath(href)).path,
    ) &&
    !path.startsWith("/docs/") &&
    !isProviderPath(path)
    ? localizePath("/", locale)
    : target;
}
