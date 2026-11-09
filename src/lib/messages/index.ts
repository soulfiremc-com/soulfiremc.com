import en from "./en.json";
import de from "./de.json";
import pl from "./pl.json";
import ru from "./ru.json";
import type { Locale } from "../i18n";

export type MessageKey = keyof typeof en;
export type MessageValues = Record<string, string | number>;

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  de,
  pl,
  ru,
};

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(en, value);
}

/** Resolve keyed catalog values while preserving raw external text. */
export function resolveMessage(locale: Locale, value: string) {
  return isMessageKey(value) ? translate(locale, value) : value;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  values: MessageValues = {},
) {
  return (messages[locale][key] ?? en[key]).replace(
    /\{(\w+)\}/g,
    (token, key: string) => String(values[key] ?? token),
  );
}
