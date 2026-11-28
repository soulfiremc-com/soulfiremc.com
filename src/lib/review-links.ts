import { getShopBySlug } from "@/lib/accounts-data";
import { getProviderBySlug } from "@/lib/proxies-data";

/** The short link a shop sends its customers to collect reviews. */
export function getReviewLinkUrl(slug: string) {
  return `https://soulfiremc.com/review/${slug}`;
}

/**
 * Find the listing a review link points to. Account shops and proxy
 * providers share one link namespace, so their slugs must stay unique.
 */
export function resolveReviewLink(slug: string) {
  if (getShopBySlug(slug)) return "account" as const;
  if (getProviderBySlug(slug)) return "proxy" as const;
  return undefined;
}
