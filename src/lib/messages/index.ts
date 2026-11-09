import de from "./de.json";
import pl from "./pl.json";
import ru from "./ru.json";
import type { Locale } from "../i18n";

const messages: Partial<Record<Locale, Record<string, string>>> = {
  de,
  pl,
  ru,
};
export function translate(
  locale: Locale,
  message: string,
  values: Record<string, string | number> = {},
) {
  return (messages[locale]?.[message] ?? message).replace(
    /\{(\w+)\}/g,
    (token, key: string) => String(values[key] ?? token),
  );
}
