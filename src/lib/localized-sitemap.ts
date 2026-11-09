import { locales, localizePath, splitLocalePath, type Locale } from "./i18n.ts";

export function getSitemapLocalization(
  path: string,
  docs: Record<string, Locale[]>,
) {
  const { path: bare, locale } = splitLocalePath(path);
  const languages = ["/", "/download", "/pricing"].includes(bare)
    ? [...locales]
    : (docs[bare] ?? ["en"]);
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
