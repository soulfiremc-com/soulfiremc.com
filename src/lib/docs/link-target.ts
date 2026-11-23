import { localizeHref, type Locale } from "@/lib/i18n";

/**
 * TanStack Router treats a `#` in `to` as part of the path, so a link such as
 * `/docs/troubleshooting#collect` would preload a page that does not exist.
 * Pass the fragment as `hash` instead.
 */
export function docsLinkTarget(href: string, locale: Locale) {
  const localized = localizeHref(href, locale);
  const hashIndex = localized.indexOf("#");
  return hashIndex === -1
    ? { to: localized, hash: undefined }
    : {
        to: localized.slice(0, hashIndex),
        hash: localized.slice(hashIndex + 1),
      };
}
