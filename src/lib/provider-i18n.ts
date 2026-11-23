import { hrefPath, isProviderPath, localizePath, type Locale } from "./i18n";
import { resolveMessage } from "./messages";

const MONTHS = [
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
];

function parseProviderSince(date: string) {
  const [, monthName, year] =
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/u.exec(date) ??
    [];
  if (monthName === undefined || year === undefined) return undefined;
  return { month: MONTHS.indexOf(monthName), year };
}

/** Converts a catalog date such as "Jul 2025" to an ISO 8601 date ("2025-07"). */
export function providerSinceIsoDate(date: string) {
  const parsed = parseProviderSince(date);
  if (parsed) {
    return `${parsed.year}-${String(parsed.month + 1).padStart(2, "0")}`;
  }
  return /^\d{4}$/u.test(date) ? date : undefined;
}

export function formatProviderSince(date: string, locale: Locale) {
  const parsed = parseProviderSince(date);
  if (!parsed) return date;
  const { month, year } = parsed;
  // A day gives Polish and Russian the month form needed after "since".
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: locale === "en" ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(Number(year), month, 1)));
  return `${parts.find((part) => part.type === "month")?.value} ${year}`;
}

/** Localize our catalog metadata before user-written reviews are added. */
export function localizeProviderData<T>(data: T, locale: Locale): T {
  function visit(value: unknown, key = ""): unknown {
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([childKey, child]) => [
          childKey,
          visit(child, childKey),
        ]),
      );
    if (typeof value !== "string") return value;
    if (key === "inLanguage") return locale;
    if (["name", "description", "category", "text"].includes(key))
      return resolveMessage(locale, value);
    if (value.startsWith("https://soulfiremc.com")) {
      const path = value.slice("https://soulfiremc.com".length) || "/";
      if (isProviderPath(hrefPath(path)) || (key === "item" && path === "/"))
        return `https://soulfiremc.com${localizePath(path, locale)}`;
    }
    return value;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- visit returns a copy with the same shape and translated strings
  return visit(data) as T;
}

export function localizeProviderJsonLd(json: string, locale: Locale) {
  return JSON.stringify(localizeProviderData(JSON.parse(json), locale));
}
