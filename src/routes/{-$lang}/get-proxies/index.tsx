import { translate, type MessageKey } from "@/lib/messages";
import { isLocale } from "@/lib/i18n";
import { localizeProviderJsonLd } from "@/lib/provider-i18n";
import { useT, useLocale } from "@/lib/i18n-react";
import { TranslatedMessage } from "@/components/translated-message";
import { ProviderFaq } from "@/components/provider-faq";
import { createProviderFaqJsonLd } from "@/lib/provider-faq-data";
import { Schema, Effect } from "effect";
import { usePrerenderedSearch } from "@/hooks/use-prerendered-search";
import { usePrerenderedSearchOrder } from "@/hooks/use-prerendered-search-order";
import { noop, useSuspenseQuery } from "@tanstack/react-query";
import {
  CatchBoundary,
  createFileRoute,
  Link,
  stripSearchParams,
  useHydrated,
} from "@tanstack/react-router";
import {
  ArrowDownWideNarrow,
  BookOpen,
  ExternalLink,
  Filter,
  Star,
} from "lucide-react";
import { memo, Suspense, useEffect, useState } from "react";
import { CouponCode } from "@/components/coupon-code";
import {
  ProxyProviderBadge,
  ProxyProviderLogo,
  ProxyTypeList,
} from "@/components/proxy-provider";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { ReviewTurnstileProvider } from "@/components/review-turnstile-provider";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReviews } from "@/hooks/use-reviews";
import {
  BADGE_CONFIG,
  BADGES,
  type Badge,
  FEATURE_BADGES,
  FILTER_BADGES,
  filterProviders,
  isProxyTypeBadge,
  PROVIDERS,
  PROXY_TYPE_BADGES,
  type Provider,
} from "@/lib/proxies-data";
import {
  compareReviewSummaries,
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  type ReviewSummary,
  type ReviewSummaryStatus,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { JsonLdScript } from "@/components/json-ld";
import { isOneOf } from "@/lib/is-one-of";

const SORT_OPTIONS = ["default", "best-rated"] as const;

const proxiesSearchSchema = Schema.Struct({
  badges: Schema.mutable(Schema.Array(Schema.Literals(BADGES))).pipe(
    Schema.catchDecoding(() => Effect.succeedSome([])),
    Schema.withDecodingDefaultType(Effect.succeed([])),
  ),
  sort: Schema.Literals(SORT_OPTIONS).pipe(
    Schema.catchDecoding(() => Effect.succeedSome("default")),
    Schema.withDecodingDefaultType(Effect.succeed("default" as const)),
  ),
});

const PENDING_SEARCH_STYLE_ID = "get-proxies-pending-search";

// The prerendered HTML always lists every provider in the default order. When
// the URL has filters, hide that list before the first paint so applying the
// filters after hydration does not shift the page. The animation reveals the
// list if the app never hydrates.
const hidePrerenderedResultsScript = `(()=>{const s=new URLSearchParams(location.search);if(!s.has("badges")&&!s.has("sort"))return;const e=document.createElement("style");e.id="${PENDING_SEARCH_STYLE_ID}";e.textContent="[data-provider-results]{visibility:hidden;animation:provider-results-reveal 0s 5s forwards}@keyframes provider-results-reveal{to{visibility:visible}}";document.head.append(e)})()`;

const SORT_CONFIG = {
  default: {
    label: "providers.sort.default",
    icon: <ArrowDownWideNarrow className="size-3" />,
  },
  "best-rated": {
    label: "providers.sort.best-rated",
    icon: <Star className="size-3 fill-current" />,
  },
} as const;

// Memoized so a filter change renders only the cards that it adds.
const ProviderCard = memo(function ProviderCard({
  provider,
  reviewSummary,
  reviewSummaryStatus,
}: {
  provider: Provider;
  reviewSummary: ReviewSummary;
  reviewSummaryStatus: ReviewSummaryStatus;
}) {
  const t = useT();
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardContent className="flex flex-col gap-3">
        {/* The logo sits beside the name, so narrow screens give the rest of
          the card the full width. */}
        <div className="flex items-center gap-4">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-16">
            <ProxyProviderLogo provider={provider} size="card" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl font-semibold">
              <Link
                to="/{-$lang}/get-proxies/$slug"
                params={{ slug: provider.slug }}
                className="hover:underline"
              >
                {provider.name}
              </Link>
            </h2>
            <ProxyTypeList types={provider.badges.filter(isProxyTypeBadge)} />
          </div>
        </div>
        {provider.badges.some((badge) => !isProxyTypeBadge(badge)) && (
          <div className="flex flex-wrap gap-2">
            {provider.badges
              .filter((badge) => !isProxyTypeBadge(badge))
              .map((badge) => (
                <ProxyProviderBadge key={badge} badge={badge} />
              ))}
          </div>
        )}
        <p className="text-muted-foreground">{t(provider.summary)}</p>
        {provider.couponCode && (
          <CouponCode
            code={provider.couponCode}
            discount={provider.couponDiscount}
          />
        )}
        {/* The list compares providers. Payment methods, contact links,
          and rating live on each provider's own page. */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            render={
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {t("common.getProxies")}
                <ExternalLink data-icon="inline-end" />
              </a>
            }
            nativeButton={false}
          />
          <ReviewSummaryBadge
            summary={reviewSummary}
            status={reviewSummaryStatus}
          />
        </div>
      </CardContent>
    </Card>
  );
});

function MainContent() {
  const t = useT();
  const { summaries, summaryStatus } = useReviews("proxy", proxyReviewSlugs);
  const search = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeSync(proxiesSearchSchema)({}),
  );
  const { sort } = search;
  // Older links can name a badge that every provider has. It cannot narrow
  // the list, so ignore it.
  const badges = search.badges.filter((badge) => FILTER_BADGES.includes(badge));
  const navigate = Route.useNavigate();
  const hydrated = useHydrated();
  const orderSummaries = usePrerenderedSearchOrder(
    summaries,
    JSON.stringify([
      badges,
      sort,
      // A rating sort from a shared link applies once the reviews arrive.
      sort === "best-rated" && summaryStatus === "loading",
    ]),
  );

  useEffect(() => {
    if (hydrated) {
      document.querySelector(`#${PENDING_SEARCH_STYLE_ID}`)?.remove();
    }
  }, [hydrated]);

  const clearFilters = () => {
    void navigate({
      search: (previous) => ({ ...previous, badges: [], sort: "default" }),
      replace: true,
      resetScroll: false,
    });
  };

  const matchingProviders = filterProviders(PROVIDERS, badges);
  // "Featured" keeps the curated data order and ignores reviews.
  const filteredProviders =
    sort === "default"
      ? matchingProviders
      : matchingProviders.toSorted(
          (a, b) =>
            compareReviewSummaries(
              orderSummaries[a.slug],
              orderSummaries[b.slug],
              sort,
            ) || a.name.localeCompare(b.name),
        );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters = badges.length > 0 || sort !== "default";

  const badgeGroup = (label: MessageKey, groupBadges: readonly Badge[]) => {
    const options = groupBadges.filter((badge) =>
      FILTER_BADGES.includes(badge),
    );
    if (options.length === 0) {
      return null;
    }
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">{t(label)}</span>
        <ToggleGroup
          aria-label={t(label)}
          multiple
          value={badges.filter((badge) => options.includes(badge))}
          onValueChange={(value) => {
            const selected = new Set(
              value.filter((badge) => isOneOf(badge, BADGES)),
            );
            void navigate({
              search: (previous) => ({
                ...previous,
                badges: FILTER_BADGES.filter((badge) =>
                  options.includes(badge)
                    ? selected.has(badge)
                    : previous.badges.includes(badge),
                ),
              }),
              replace: true,
              resetScroll: false,
            });
          }}
          spacing={2}
          className="flex-wrap"
        >
          {options.map((badge) => {
            const config = BADGE_CONFIG[badge];
            const isActive = badges.includes(badge);
            const count = isActive
              ? matchingProviders.length
              : filterProviders(matchingProviders, [badge]).length;
            return (
              <ToggleGroupItem
                key={badge}
                value={badge}
                size="sm"
                disabled={count === 0 && !isActive}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs",
                  isActive
                    ? cn(
                        config.className /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
                        "ring-2 ring-current ring-offset-2 ring-offset-background",
                      )
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {t(config.label)}
                <span aria-hidden="true" className="tabular-nums">
                  {count}
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
    );
  };

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex min-h-7 items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("providers.accounts.filters")}
          </span>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("providers.accounts.clear")}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("providers.accounts.resultCount", {
            count: filteredProviders.length,
            total: PROVIDERS.length,
          })}
        </p>
      </div>
      {badgeGroup("providers.proxies.proxyType", PROXY_TYPE_BADGES)}
      {badgeGroup("providers.proxies.features", FEATURE_BADGES)}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t("providers.proxies.sort")}
        </span>
        <ToggleGroup
          aria-label={t("providers.proxies.sort")}
          value={[sort]}
          onValueChange={([value]) => {
            if (isOneOf(value, SORT_OPTIONS)) {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  sort: value,
                }),
                replace: true,
                resetScroll: false,
              });
            }
          }}
          spacing={2}
          className="flex-wrap"
        >
          {SORT_OPTIONS.map((option) => {
            const config = SORT_CONFIG[option];
            return (
              <ToggleGroupItem
                key={option}
                value={option}
                size="sm"
                className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:ring-2 data-pressed:ring-primary data-pressed:ring-offset-2 data-pressed:ring-offset-background"
              >
                {config.icon}
                {t(config.label)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-6 lg:flex-row">
      {/* Mobile filter toggle */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setFiltersOpen(!filtersOpen);
        }}
        aria-expanded={filtersOpen}
        aria-controls="proxy-filters-mobile"
        className="self-start lg:hidden"
      >
        <Filter data-icon="inline-start" />
        {t("providers.accounts.filters")}
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {badges.length + (sort !== "default" ? 1 : 0)}
          </span>
        )}
      </Button>

      {/* Mobile filter panel */}
      {filtersOpen && (
        <div
          id="proxy-filters-mobile"
          className="rounded-lg border p-4 lg:hidden"
        >
          {filterContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-20 lg:self-start">{filterContent}</div>
      </aside>

      {/* Main content */}
      <script
        // oxlint-disable-next-line react/no-danger -- this inline script must run before hydration
        dangerouslySetInnerHTML={{ __html: hidePrerenderedResultsScript }}
      />
      <div className="flex-1" data-provider-results>
        <output className="sr-only">
          {t("providers.accounts.resultCount", {
            count: filteredProviders.length,
            total: PROVIDERS.length,
          })}
        </output>
        {filteredProviders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                {t("providers.accounts.noProvidersFound")}
              </EmptyTitle>
              <EmptyDescription>
                {t("providers.filters.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.slug}
                provider={provider}
                reviewSummary={summaries[provider.slug] ?? emptyReviewSummary()}
                reviewSummaryStatus={summaryStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GetProxiesClient() {
  const t = useT();
  const locale = useLocale();
  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-10 px-4 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("common.getProxies")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("providers.proxies.introduction")}
        </p>
        <p className="text-sm text-muted-foreground">
          <BookOpen className="inline size-4 align-text-bottom" />{" "}
          <TranslatedMessage
            text="providers.proxies.forMoreInformationOnHowToUseProxiesWith"
            values={{
              guide: (
                <Link
                  to="/{-$lang}/docs/$"
                  params={{
                    lang: locale === "en" ? undefined : locale,
                    _splat: "how-to/import-proxies",
                  }}
                  className="underline hover:text-foreground"
                >
                  {t("faq.proxyGuide")}
                </Link>
              ),
            }}
          />
        </p>
      </div>

      <ReviewTurnstileProvider>
        <Suspense>
          <MainContent />
        </Suspense>
      </ReviewTurnstileProvider>

      <ProviderFaq kind="proxies" />

      <div className="mx-auto flex max-w-5xl flex-col gap-2 border-t pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>{t("providers.proxies.disclosure")}</strong>{" "}
          {t("providers.proxies.disclosure.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          <TranslatedMessage
            text="providers.corrections.description"
            values={{
              github: (
                <a
                  href="https://github.com/soulfiremc-com/soulfiremc.com/edit/main/src/lib/proxies-data.tsx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  GitHub
                </a>
              ),
              discord: (
                <Link to="/discord" className="underline hover:text-foreground">
                  Discord
                </Link>
              ),
            }}
          />
        </p>
      </div>
    </main>
  );
}

const proxyReviewSlugs = PROVIDERS.map((provider) => provider.slug);
const proxyReviewsQueryOptions = reviewsQueryOptions({
  itemType: "proxy",
  slugs: proxyReviewSlugs,
});

function createProxiesItemListJsonLd(
  reviewSummaries?: Record<string, ReviewSummary>,
) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://soulfiremc.com/get-proxies#provider-list",
    name: "common.proxyProvidersForSoulfire",
    description: "providers.proxies.social.description",
    numberOfItems: PROVIDERS.length,
    itemListElement: PROVIDERS.map((provider, index) => {
      const reviewSummary = reviewSummaries?.[provider.slug];
      const aggregateRating = reviewSummary
        ? getAggregateRatingJsonLd(reviewSummary)
        : undefined;

      return {
        "@type": "ListItem",
        position: index + 1,
        url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
        item: {
          "@type": "Product",
          name: provider.name,
          description: provider.summary,
          url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
          ...(aggregateRating ? { aggregateRating } : {}),
        },
      };
    }),
  });
}

function ProxiesItemListStructuredData() {
  const locale = useLocale();
  const { data } = useSuspenseQuery(proxyReviewsQueryOptions);

  return (
    <JsonLdScript
      json={localizeProviderJsonLd(
        createProxiesItemListJsonLd(data.summaries),
        locale,
      )}
    />
  );
}

const proxiesPageData = (() => {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": "https://soulfiremc.com/get-proxies#breadcrumb",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "nav.home",
        item: "https://soulfiremc.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "common.getProxies",
        item: "https://soulfiremc.com/get-proxies",
      },
    ],
  };

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "common.getProxies",
    description: "providers.proxies.directory.description",
    url: "https://soulfiremc.com/get-proxies",
    inLanguage: "en-US",
    isPartOf: {
      "@type": "WebSite",
      name: "SoulFire",
      url: "https://soulfiremc.com",
    },
    breadcrumb: {
      "@id": "https://soulfiremc.com/get-proxies#breadcrumb",
    },
    mainEntity: {
      "@id": "https://soulfiremc.com/get-proxies#provider-list",
    },
  };

  return {
    breadcrumbJsonLd: JSON.stringify(breadcrumbJsonLd),

    itemListJsonLd: createProxiesItemListJsonLd(),
    pageJsonLd: JSON.stringify(pageJsonLd),
  };
})();

export const Route = createFileRoute("/{-$lang}/get-proxies/")({
  validateSearch: Schema.toStandardSchemaV1(proxiesSearchSchema),
  search: {
    middlewares: [stripSearchParams({ badges: [], sort: "default" })],
  },
  loader: ({ context }) => {
    void context.queryClient.query(proxyReviewsQueryOptions).catch(noop);
  },
  head: ({ params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    return {
      meta: getPageMeta({
        locale,
        title: translate(locale, "providers.proxies.meta.title"),
        description: translate(locale, "providers.proxies.meta.description"),
        path: "/get-proxies",
        imageUrl: "/og/site/get-proxies/image.webp",
        imageAlt: translate(
          locale,
          "providers.proxies.soulfireProxyProvidersPagePreview",
        ),
      }),
      links: getCanonicalLinks("/get-proxies", locale),
    };
  },
  component: GetProxiesPage,
});

function GetProxiesPage() {
  const locale = useLocale();
  const staticItemListJsonLd = (
    <JsonLdScript
      json={localizeProviderJsonLd(proxiesPageData.itemListJsonLd, locale)}
    />
  );
  return (
    <SiteShell>
      <JsonLdScript
        json={localizeProviderJsonLd(proxiesPageData.pageJsonLd, locale)}
      />
      {/* A failed review request must not replace the page with an error. */}
      <CatchBoundary
        getResetKey={() => locale}
        errorComponent={() => staticItemListJsonLd}
      >
        <Suspense fallback={staticItemListJsonLd}>
          <ProxiesItemListStructuredData />
        </Suspense>
      </CatchBoundary>
      <JsonLdScript
        json={JSON.stringify(createProviderFaqJsonLd("proxies", locale))}
      />
      <JsonLdScript
        json={localizeProviderJsonLd(proxiesPageData.breadcrumbJsonLd, locale)}
      />
      <GetProxiesClient />
    </SiteShell>
  );
}
