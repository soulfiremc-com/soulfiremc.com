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
  return providers.toSorted((a, b) => {
    // "Featured" shows promoted shops first, then the curated order of the
    // data. It ignores reviews, so the list doesn't move when they load.
    if (sort === "default") {
      return (
        Number(isProviderPromoted(b, now)) - Number(isProviderPromoted(a, now))
      );
    }
    return (
      (sort === "price-asc" || sort === "price-desc"
        ? compareProviderPrices(a, b, sort)
        : compareReviewSummaries(summaries[a.slug], summaries[b.slug], sort)) ||
      a.name.localeCompare(b.name)
    );
  });
}

export type AccountFilterCounts = {
  categories: Record<Category, number>;
  badges: Record<FilterableBadge, number>;
};

/**
 * Count the results each filter option would show, given the other active
 * filters. Category options keep the selected features, and feature options
 * add to them, because features combine with AND.
 */
export function countAccountFilterOptions(
  providers: Provider[],
  categories: readonly Category[],
  filterBadges: readonly FilterableBadge[],
  category: Category | undefined,
  badges: FilterableBadge[],
): AccountFilterCounts {
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries loses the key type of the counted categories and badges
    categories: Object.fromEntries(
      categories.map((option) => [
        option,
        filterAccountProviders(providers, option, badges).length,
      ]),
    ) as Record<Category, number>,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.fromEntries loses the key type of the counted categories and badges
    badges: Object.fromEntries(
      filterBadges.map((badge) => [
        badge,
        filterAccountProviders(providers, category, [
          ...new Set([...badges, badge]),
        ]).length,
      ]),
    ) as Record<FilterableBadge, number>,
  };
}
