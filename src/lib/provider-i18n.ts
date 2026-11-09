import { isProviderPath, localizePath, type Locale } from "./i18n";
import { resolveMessage } from "./messages";

export function formatProviderSince(date: string, locale: Locale) {
  const match =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(date);
  if (!match) return date;
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].indexOf(match[1]);
  // A day gives Polish and Russian the month form needed after "since".
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: locale === "en" ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(Number(match[2]), month, 1)));
  return `${parts.find((part) => part.type === "month")?.value} ${match[2]}`;
}

/** Localize our catalog metadata before user-written reviews are added. */
export function localizeProviderData<T>(data: T, locale: Locale): T {
  function visit(value: unknown, key = ""): unknown {
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, visit(child, key)]),
      );
    if (typeof value !== "string") return value;
    if (key === "inLanguage") return locale;
    if (["name", "description", "category", "text"].includes(key))
      return resolveMessage(locale, value);
    if (value.startsWith("https://soulfiremc.com")) {
      const path = value.slice("https://soulfiremc.com".length) || "/";
      if (
        isProviderPath(path.split(/[?#]/)[0]) ||
        (key === "item" && path === "/")
      )
        return `https://soulfiremc.com${localizePath(path, locale)}`;
    }
    return value;
  }
  return visit(data) as T;
}

export function localizeProviderJsonLd(json: string, locale: Locale) {
  return JSON.stringify(localizeProviderData(JSON.parse(json), locale));
}
