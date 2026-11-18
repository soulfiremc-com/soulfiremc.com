import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { LocaleContext } from "@/lib/i18n-react";

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
