import {
  compareProviderPrices,
  isProviderPromoted,
  type Category,
  type FilterableBadge,
  type Provider,
  type SortOption,
} from "@/lib/accounts-data";
import { compareReviewSummaries, type ReviewSummary } from "@/lib/review-core";

export function filterAccountProviders(
  providers: Provider[],
  category: Category | undefined,
  badges: FilterableBadge[],
): Provider[] {
  return providers.filter(
    (provider) =>
      (!category || provider.category === category) &&
      badges.every((badge) => provider.badges.includes(badge)),
  );
}

export function sortAccountProviders(
  providers: Provider[],
  sort: SortOption,
  summaries: Record<string, ReviewSummary>,
  now: number,
): Provider[] {
  return providers.slice().sort((a, b) => {
    if (sort === "default") {
      const promotionOrder =
        Number(isProviderPromoted(b, now)) - Number(isProviderPromoted(a, now));
      if (promotionOrder !== 0) return promotionOrder;
    }
    return (
      (sort === "price-asc" || sort === "price-desc"
        ? compareProviderPrices(a, b, sort)
        : compareReviewSummaries(summaries[a.slug], summaries[b.slug], sort)) ||
      a.name.localeCompare(b.name)
    );
  });
}
