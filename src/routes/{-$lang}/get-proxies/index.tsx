import { translate } from "@/lib/messages";
import { isLocale } from "@/lib/i18n";
import {
  formatProviderSince,
  localizeProviderJsonLd,
} from "@/lib/provider-i18n";
import { useT, useLocale } from "@/lib/i18n-react";
import { TranslatedMessage } from "@/components/translated-message";
import {
  ProviderFaq,
  createProviderFaqJsonLd,
} from "@/components/provider-faq";
import { Schema, Effect, Option } from "effect";
import { usePrerenderedSearch } from "@/hooks/use-prerendered-search";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Calendar,
  ExternalLink,
  Filter,
  ImageIcon,
  Star,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { CouponCode } from "@/components/coupon-code";
import { Image } from "@/components/image";
import { PaymentMethods } from "@/components/payment-methods";
import { ReviewInlineActions } from "@/components/review-inline-actions";
import { ReviewTurnstileProvider } from "@/components/review-turnstile-provider";
import { SiteShell } from "@/components/site-shell";
import { SocialLinkButtons } from "@/components/social-link-buttons";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReviews } from "@/hooks/use-reviews";
import {
  BADGE_CONFIG,
  type Badge,
  FILTER_BADGES,
  type FilterableBadge,
  PROVIDERS,
  type Provider,
} from "@/lib/proxies-data";
import {
  compareReviewSummaries,
  getAggregateRatingJsonLd,
  type ReviewSummary,
  type UserReviewRecord,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const BADGES = [
  "residential",
  "datacenter",
  "isp",
  "mobile",
  "free-tier",
  "unlimited-bandwidth",
  "budget-friendly",
  "enterprise",
  "high-quality",
] as const;

const SORT_OPTIONS = ["default", "best-rated"] as const;

const proxiesSearchSchema = Schema.Struct({
  badges: Schema.mutable(Schema.Array(Schema.Literals(BADGES)))
    .pipe(Schema.catchDecoding(() => Effect.succeed(Option.some([]))))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed([]))),
  sort: Schema.Literals(SORT_OPTIONS)
    .pipe(Schema.catchDecoding(() => Effect.succeed(Option.some("default"))))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed("default"))),
});

const SORT_CONFIG = {
  default: {
    label: "providers.sort.default",
    icon: <ArrowDownWideNarrow className="h-3 w-3" />,
  },
  "best-rated": {
    label: "providers.sort.best-rated",
    icon: <Star className="h-3 w-3 fill-current" />,
  },
} as const;

function ProviderBadge({ badge }: { badge: Badge }) {
  const t = useT();
  const config = BADGE_CONFIG[badge];
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <UiBadge
            variant="outline"
            className={cn(
              "cursor-help border-transparent",
              config.className /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
            )}
          >
            {config.icon}
            {t(config.label)}
          </UiBadge>
        }
      />
      <HoverCardContent className="w-64 text-sm">
        <p>{t(config.description)}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  const t = useT();
  if (provider.logo) {
    return (
      <Image
        src={provider.logo}
        alt={t("providers.accounts.logo", { provider: provider.name })}
        fill
        sizes="48px"
        breakpoints={[48, 96, 144]}
        className="size-full object-contain p-2"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary">
      {provider.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ProviderCard({
  provider,
  reviewSummary,
  userReview,
  reviewPending,
  onRate,
  onClearRating,
}: {
  provider: Provider;
  reviewSummary: ReviewSummary;
  userReview?: UserReviewRecord;
  reviewPending: boolean;
  onRate: (
    slug: string,
    rating: number,
  ) => Promise<{ error: "unauthorized" | "verification" | null }>;
  onClearRating: (
    slug: string,
  ) => Promise<{ error: "unauthorized" | "verification" | null }>;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ProviderLogo provider={provider} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              <Link
                to="/{-$lang}/get-proxies/$slug"
                params={{ slug: provider.slug }}
                className="hover:underline"
              >
                {provider.name}
              </Link>
            </h3>
            {provider.startDate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {t("providers.accounts.since", {
                  date: formatProviderSince(provider.startDate, locale),
                })}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {provider.badges.map((badge) => (
                <ProviderBadge key={badge} badge={badge} />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">{t(provider.summary)}</p>
          {provider.gallery && provider.gallery.length > 0 && (
            <Link
              to="/{-$lang}/get-proxies/$slug"
              params={{ slug: provider.slug }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              {t("providers.accounts.photos", {
                count: provider.gallery.length,
              })}
            </Link>
          )}
          {provider.couponCode && (
            <CouponCode
              code={provider.couponCode}
              discount={provider.couponDiscount}
            />
          )}
          <PaymentMethods methods={provider.paymentMethods} />
          <div className="flex flex-wrap gap-2">
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
            <SocialLinkButtons links={provider.socialLinks} />
          </div>
          <ReviewInlineActions
            summary={reviewSummary}
            currentRating={userReview?.rating}
            pending={reviewPending}
            onRate={(rating) => onRate(provider.slug, rating)}
            onClear={() => onClearRating(provider.slug)}
          />
        </div>
      </div>
    </Card>
  );
}

function MainContent() {
  const t = useT();
  const providers = PROVIDERS;
  const { summaries, userReviews, pendingBySlug, upsertReview, deleteReview } =
    useReviews("proxy", proxyReviewSlugs);
  const { badges, sort } = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeUnknownSync(proxiesSearchSchema)({}),
  );
  const navigate = Route.useNavigate();

  const clearFilters = () => {
    void navigate({
      search: (previous) => ({ ...previous, badges: [], sort: "default" }),
      replace: true,
      resetScroll: false,
    });
  };

  const filteredProviders = useMemo(() => {
    const filtered =
      badges.length === 0
        ? providers
        : providers.filter((provider) =>
            badges.every((filter) => provider.badges.includes(filter)),
          );

    return [...filtered].sort((a, b) => {
      return (
        compareReviewSummaries(summaries[a.slug], summaries[b.slug], sort) ||
        a.name.localeCompare(b.name)
      );
    });
  }, [badges, sort, summaries]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t("providers.proxies.filterByType")}
        </span>
        {(badges.length > 0 || sort !== "default") && (
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
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t("providers.accounts.sort")}
        </span>
        <ToggleGroup
          value={[sort]}
          onValueChange={([value]) => {
            if (value) {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  sort: value as (typeof SORT_OPTIONS)[number],
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
            const isActive = sort === option;
            return (
              <ToggleGroupItem
                key={option}
                value={option}
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {config.icon}
                {t(config.label)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
      <ToggleGroup
        multiple
        value={badges}
        onValueChange={(value) =>
          void navigate({
            search: (previous) => ({
              ...previous,
              badges: value as FilterableBadge[],
            }),
            replace: true,
            resetScroll: false,
          })
        }
        spacing={2}
        className="flex-wrap"
      >
        {FILTER_BADGES.map((badge) => {
          const config = BADGE_CONFIG[badge];
          const isActive = badges.includes(badge);
          return (
            <ToggleGroupItem
              key={badge}
              value={badge}
              size="sm"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs",
                isActive
                  ? cn(
                      config.className /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
                      "ring-2 ring-offset-2 ring-offset-background ring-current",
                    )
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {t(config.label)}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-(--fd-layout-width) mx-auto w-full">
      {/* Mobile filter toggle */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setFiltersOpen(!filtersOpen)}
        className="self-start lg:hidden"
      >
        <Filter data-icon="inline-start" />
        {t("providers.accounts.filters")}
        {(badges.length > 0 || sort !== "default") && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {badges.length + (sort !== "default" ? 1 : 0)}
          </span>
        )}
      </Button>

      {/* Mobile filter panel */}
      {filtersOpen && (
        <div className="lg:hidden rounded-lg border p-4">{filterContent}</div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-20 lg:self-start">{filterContent}</div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.name}
                provider={provider}
                reviewSummary={summaries[provider.slug]}
                userReview={userReviews[provider.slug]}
                reviewPending={pendingBySlug[provider.slug] ?? false}
                onRate={(slug, rating) => upsertReview(slug, { rating })}
                onClearRating={deleteReview}
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
          <BookOpen className="inline h-4 w-4 align-text-bottom" />{" "}
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: localizeProviderJsonLd(
          createProxiesItemListJsonLd(data.summaries),
          locale,
        ),
      }}
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
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(proxyReviewsQueryOptions);
  },
  component: GetProxiesPage,
});

function GetProxiesPage() {
  const locale = useLocale();
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: localizeProviderJsonLd(proxiesPageData.pageJsonLd, locale),
        }}
      />
      <Suspense
        fallback={
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: localizeProviderJsonLd(
                proxiesPageData.itemListJsonLd,
                locale,
              ),
            }}
          />
        }
      >
        <ProxiesItemListStructuredData />
      </Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createProviderFaqJsonLd("proxies", locale)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: localizeProviderJsonLd(
            proxiesPageData.breadcrumbJsonLd,
            locale,
          ),
        }}
      />
      <GetProxiesClient />
    </SiteShell>
  );
}
