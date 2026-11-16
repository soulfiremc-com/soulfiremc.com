import {
  type AuthLocale,
  type AuthPlugin,
  localization,
} from "@better-auth-ui/core";

import type { Locale } from "@/lib/i18n";
import { isMessageKey, translate } from "@/lib/messages";

type MessageTree = { [key: string]: string | MessageTree };

/**
 * Better Auth UI message `auth.signIn` lives at catalog key
 * `authUi.auth.signIn`, and plugin messages use the plugin ID as the section.
 * Snake case event names become kebab case, for example
 * `authUi.dash.eventLabels.user-banned`.
 */
function localizeTree<T>(tree: T, path: string, locale: Locale): T {
  return Object.fromEntries(
    Object.entries(tree as MessageTree).map(([name, value]) => {
      const key = `${path}.${name.replaceAll("_", "-")}`;
      if (typeof value !== "string")
        return [name, localizeTree(value, key, locale)];
      return [name, isMessageKey(key) ? translate(locale, key) : value];
    }),
  ) as T;
}

/** Better Auth UI messages for the page language, read from the site catalog. */
export function authUiLocale(
  locale: Locale,
  plugins: readonly AuthPlugin[],
): AuthLocale {
  return {
    languageTag: locale,
    direction: "ltr",
    localization: localizeTree(localization, "authUi", locale),
    plugins: Object.fromEntries(
      plugins.map((plugin) => [
        plugin.id,
        localizeTree(plugin.localization ?? {}, `authUi.${plugin.id}`, locale),
      ]),
    ),
  };
}
