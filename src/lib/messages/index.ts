import { createIsomorphicFn } from "@tanstack/react-start";
import en from "./en.json";
import de from "./de.json";
import pl from "./pl.json";
import ru from "./ru.json";
import type { Locale } from "../i18n";

export type MessageKey = keyof typeof en;
export type MessageValues = Record<string, string | number>;
type Catalog = Partial<Record<MessageKey, string>>;
type LazyLocale = Exclude<Locale, "en">;

// The server renders every locale, so it keeps all catalogs in memory. The
// compiler drops this branch from the browser build, which leaves only English
// there and loads the page locale on demand.
const bundledCatalogs = createIsomorphicFn()
  .server((): Partial<Record<LazyLocale, Catalog>> => ({ de, pl, ru }))
  .client((): Partial<Record<LazyLocale, Catalog>> => ({}));

const catalogs: Partial<Record<Locale, Catalog>> = {
  en,
  ...bundledCatalogs(),
};

const catalogLoaders: Record<LazyLocale, () => Promise<{ default: Catalog }>> =
  {
    de: () => import("./de.json"),
    pl: () => import("./pl.json"),
    ru: () => import("./ru.json"),
  };

const pendingLoads = new Map<Locale, Promise<void>>();

/**
 * Load a locale's catalog before rendering it. Returns undefined when the
 * catalog is already available, so callers can skip an await.
 */
export function loadMessages(locale: Locale): Promise<void> | undefined {
  if (locale === "en" || catalogs[locale]) return undefined;
  let pending = pendingLoads.get(locale);
  if (!pending) {
    pending = importCatalog(locale);
    pendingLoads.set(locale, pending);
  }
  return pending;
}

async function importCatalog(locale: LazyLocale) {
  try {
    catalogs[locale] = (await catalogLoaders[locale]()).default;
  } finally {
    // The catalog is cached after success, and a failed load can retry.
    pendingLoads.delete(locale);
  }
}

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(en, value);
}

/** Resolve keyed catalog values while preserving raw external text. */
export function resolveMessage(locale: Locale, value: string) {
  return isMessageKey(value) ? translate(locale, value) : value;
}

/** English fills keys that are missing or whose catalog has not loaded. */
export function translate(
  locale: Locale,
  key: MessageKey,
  values: MessageValues = {},
) {
  return (catalogs[locale]?.[key] ?? en[key]).replaceAll(
    /\{(\w+)\}/gu,
    (token, name: string) => String(values[name] ?? token),
  );
}
