import {
  locales,
  localizePath,
  splitLocalePath,
  isProviderPath,
  type Locale,
} from "./i18n.ts";

/** Site pages outside the docs that every locale translates. */
export const localizedSitePages = [
  "/",
  "/download",
  "/pricing",
  "/get-accounts",
  "/get-proxies",
];

/** The locales a page exists in. `docs` lists translated docs by bare path. */
export function getPageLanguages(
  bare: string,
  docs: Record<string, Locale[]>,
): readonly Locale[] {
  if (localizedSitePages.includes(bare) || isProviderPath(bare)) return locales;
  return docs[bare] ?? ["en"];
}

export function getSitemapLocalization(
  path: string,
  docs: Record<string, Locale[]>,
) {
  const { path: bare, locale } = splitLocalePath(path);
  const languages = getPageLanguages(bare, docs);
  return {
    exclude: locale !== "en" && !languages.includes(locale),
    alternateRefs:
      languages.length > 1
        ? [
            ...languages.map((language) => ({
              hreflang: language,
              href: `https://soulfiremc.com${localizePath(bare, language)}`,
            })),
            { hreflang: "x-default", href: `https://soulfiremc.com${bare}` },
          ]
        : undefined,
  };
}
