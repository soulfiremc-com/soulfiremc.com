import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./i18n";
import { translate, type MessageKey, type MessageValues } from "./messages";

export const LocaleContext = createContext<Locale>("en");

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useMemo(
    () => (key: MessageKey, values?: MessageValues) =>
      translate(locale, key, values),
    [locale],
  );
}
