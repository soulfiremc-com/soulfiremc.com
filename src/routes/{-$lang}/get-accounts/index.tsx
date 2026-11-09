import { translate, resolveMessage, type MessageKey } from "@/lib/messages";
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
import { SiDiscord, SiTrustpilot } from "@icons-pack/react-simple-icons";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  stripSearchParams,
  useHydrated,
} from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  ExternalLink,
  Filter,
  Globe,
  ImageIcon,
  Info,
  Users,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { CouponCode } from "@/components/coupon-code";
import { Image } from "@/components/image";
import { PaymentMethods } from "@/components/payment-methods";
import { ProviderThemeDecoration } from "@/components/provider-theme-decoration";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReviews } from "@/hooks/use-reviews";
import {
  BADGE_CONFIG,
  type Badge,
  CATEGORY_CONFIG,
  type Category,
  FILTER_BADGES,
  FILTER_CATEGORIES,
  type FilterableBadge,
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDER_THEMES,
  PROVIDERS,
  type Provider,
  SORT_CONFIG,
  type SortOption,
} from "@/lib/accounts-data";
import {
  filterAccountProviders,
  sortAccountProviders,
} from "@/lib/account-provider-list";
import { getListingOffer, getShopAggregateOffer } from "@/lib/accounts-offers";
import {
  accountsDiscordInvitesQueryOptions,
  allAccountLiveShopDataQueryOptions,
  type LiveShopDataBySlug,
} from "@/lib/accounts-queries";
import {
  getAggregateRatingJsonLd,
  type ReviewSummary,
  type UserReviewRecord,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

function PriceInfoBadge({ details }: { details: MessageKey }) {
  const t = useT();
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <span className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground transition-colors">
            <Info className="size-3.5" />
            <span className="sr-only">
              {t("providers.accounts.pricingDetails.label")}
            </span>
          </span>
        }
      />
      <HoverCardContent className="w-64 text-sm">
        <p className="font-medium mb-1">
          {t("providers.accounts.pricingDetails.heading")}
        </p>
        <p className="text-muted-foreground">{t(details)}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function DiscordMemberBadge({ providerSlug }: { providerSlug: string }) {
  const t = useT();
  const locale = useLocale();
  const { data: discordInvites } = useSuspenseQuery(
    accountsDiscordInvitesQueryOptions,
  );
  const info = discordInvites[providerSlug] ?? null;

  if (!info?.approximate_member_count) {
    return (
      <UiBadge
        variant="outline"
        className="border-transparent bg-discord/10 text-discord/50"
      >
        <Users />
        {t("providers.accounts.unknown")}
      </UiBadge>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <UiBadge
            variant="outline"
            className="cursor-help border-transparent bg-discord/10 text-discord"
          >
            <Users />
            {new Intl.NumberFormat(locale, {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(info.approximate_member_count)}
          </UiBadge>
        }
      />
      <HoverCardContent className="w-auto text-sm">
        {info.guild?.name && <p className="font-medium">{info.guild.name}</p>}
        <p>
          {t("providers.accounts.members", {
            count: info.approximate_member_count.toLocaleString(locale),
          })}
        </p>
        {info.approximate_presence_count && (
          <p className="text-success">
            {t("providers.accounts.online", {
              count: info.approximate_presence_count.toLocaleString(locale),
            })}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function LinkDiscountNotice({ message }: { message: MessageKey }) {
  const t = useT();
  return (
    <div className="rounded-lg bg-offer/10 p-3">
      <p className="text-sm font-medium text-offer">{t(message)}</p>
    </div>
  );
}

const CATEGORIES = ["nfa-accounts", "mfa-accounts"] as const;

const BADGES = [
  "free",
  "high-quality",
  "instant-delivery",
  "replacement-warranty",
  "lifetime-warranty",
  "12h-warranty",
  "bulk-discount",
] as const;

const SORT_OPTIONS = [
  "default",
  "best-rated",
  "price-asc",
  "price-desc",
] as const;

const accountsSearchSchema = Schema.Struct({
  category: Schema.optional(Schema.Literals(CATEGORIES)).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined))),
  ),
  badges: Schema.mutable(Schema.Array(Schema.Literals(BADGES)))
    .pipe(Schema.catchDecoding(() => Effect.succeed(Option.some([]))))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed([]))),
  sort: Schema.Literals(SORT_OPTIONS)
    .pipe(Schema.catchDecoding(() => Effect.succeed(Option.some("default"))))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed("default"))),
});

function ProviderBadge({
  badge,
  classNameOverride,
}: {
  badge: Badge;
  classNameOverride?: string;
}) {
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
              /* oxlint-disable shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
              classNameOverride ?? config.className,
              /* oxlint-enable shadcn/require-static-classes */
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
  const discordInviteUrl = getDiscordInviteUrl(provider);
  const theme = provider.theme ? PROVIDER_THEMES[provider.theme] : undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        /* oxlint-disable shadcn/require-static-classes -- Provider themes are a finite class map. */
        theme && ["ring-2", theme.ring, theme.bg, theme.cardShadow],
        /* oxlint-enable shadcn/require-static-classes */
      )}
    >
      <ProviderThemeDecoration theme={provider.theme} />
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row">
        <div
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted",
            theme?.logo,
          )}
        >
          <ProviderLogo provider={provider} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              <Link
                to="/{-$lang}/get-accounts/$slug"
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
            <UiBadge
              variant="outline"
              className={cn(
                "border-transparent bg-primary/10 text-sm text-primary",
                theme?.price /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
              )}
            >
              {resolveMessage(locale, provider.price)}
              {provider.priceDetails && (
                <PriceInfoBadge details={provider.priceDetails} />
              )}
            </UiBadge>
            <Suspense
              fallback={
                <Skeleton
                  aria-label={t("providers.accounts.loadingDiscordMemberCount")}
                  className="h-5 w-16"
                />
              }
            >
              <DiscordMemberBadge providerSlug={provider.slug} />
            </Suspense>
            <div className="flex flex-wrap gap-2">
              {provider.badges.map((badge) => (
                <ProviderBadge
                  key={badge}
                  badge={badge}
                  classNameOverride={
                    badge === "affiliate" ? theme?.badge : undefined
                  }
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">{t(provider.summary)}</p>
          {provider.gallery && provider.gallery.length > 0 && (
            <Link
              to="/{-$lang}/get-accounts/$slug"
              params={{ slug: provider.slug }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              {t("providers.accounts.photos", {
                count: provider.gallery.length,
              })}
            </Link>
          )}
          {provider.couponCode ? (
            <CouponCode
              code={provider.couponCode}
              discount={provider.couponDiscount}
            />
          ) : provider.linkDiscountMessage ? (
            <LinkDiscountNotice message={provider.linkDiscountMessage} />
          ) : null}
          <PaymentMethods methods={provider.paymentMethods} />
          <div className="flex flex-wrap gap-2">
            <Button
              render={
                <a href={provider.url} target="_blank" rel="noopener nofollow">
                  {t("common.getAccounts")}
                  <ExternalLink data-icon="inline-end" />
                </a>
              }
              nativeButton={false}
              className={theme?.primaryButton}
            />
            {provider.websiteUrl && (
              <Button
                render={
                  <a
                    href={provider.websiteUrl}
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    {t("providers.website")}
                    <Globe data-icon="inline-end" />
                  </a>
                }
                nativeButton={false}
                variant="secondary"
                className={theme?.secondaryButton}
              />
            )}
            {discordInviteUrl && (
              <Button
                render={
                  <a
                    href={discordInviteUrl}
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    Discord
                    <SiDiscord data-icon="inline-end" />
                  </a>
                }
                nativeButton={false}
                variant="secondary"
                className={theme?.secondaryButton}
              />
            )}
            {provider.trustpilotUrl && (
              <Button
                render={
                  <a
                    href={provider.trustpilotUrl}
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    Trustpilot
                    <SiTrustpilot data-icon="inline-end" />
                  </a>
                }
                nativeButton={false}
                variant="secondary"
                className={theme?.secondaryButton}
              />
            )}
            <SocialLinkButtons
              links={provider.socialLinks}
              className={
                theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
              }
            />
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
  const { renderedAt } = Route.useLoaderData();
  const now = useHydrated() ? Date.now() : renderedAt;
  const providers = PROVIDERS;
  const slugs = useMemo(() => [...new Set(providers.map((p) => p.slug))], []);
  const { summaries, userReviews, pendingBySlug, upsertReview, deleteReview } =
    useReviews("account", slugs);
  const { category, badges, sort } = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeUnknownSync(accountsSearchSchema)({}),
  );
  const navigate = Route.useNavigate();

  const clearFilters = () => {
    void navigate({
      search: (previous) => ({
        ...previous,
        category: undefined,
        badges: [],
        sort: "default",
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const filteredProviders = filterAccountProviders(providers, category, badges);

  const nfaProviders = sortAccountProviders(
    filteredProviders.filter((p) => p.category === "nfa-accounts"),
    sort,
    summaries,
    now,
  );
  const mfaProviders = sortAccountProviders(
    filteredProviders.filter((p) => p.category === "mfa-accounts"),
    sort,
    summaries,
    now,
  );

  const hasActiveFilters =
    badges.length > 0 || category !== undefined || sort !== "default";

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
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

      {/* Category Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t("providers.accounts.category")}
        </span>
        <ToggleGroup
          value={category ? [category] : []}
          onValueChange={([value]) =>
            void navigate({
              search: (previous) => ({
                ...previous,
                category: value ? (value as Category) : undefined,
              }),
              replace: true,
              resetScroll: false,
            })
          }
          spacing={2}
          className="flex-wrap"
        >
          {FILTER_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <ToggleGroupItem
                key={cat}
                value={cat}
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {t(config.label)}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Badge Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t("providers.accounts.features")}
        </span>
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

      {/* Sort */}
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
                  sort: value as SortOption,
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
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {badges.length + (category ? 1 : 0) + (sort !== "default" ? 1 : 0)}
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
      <div className="flex flex-1 flex-col gap-10">
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
          <>
            {/* MFA Accounts Section */}
            {mfaProviders.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-semibold">
                    {t("providers.accounts.mfaAccountsFullAccessPermanent")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("providers.accounts.mfa.description")}
                  </p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {mfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      reviewSummary={summaries[provider.slug]}
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={(slug, rating) => upsertReview(slug, { rating })}
                      onClearRating={deleteReview}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* NFA Accounts Section */}
            {nfaProviders.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-semibold">
                    {t("providers.accounts.nfaAccountsTemporaryNonFullAccess")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("providers.accounts.nfa.description")}
                  </p>
                  <p className="text-sm text-warning">
                    <strong>{t("providers.accounts.note")}</strong>{" "}
                    {t("providers.accounts.nfa.authentication")}
                  </p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {nfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      reviewSummary={summaries[provider.slug]}
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={(slug, rating) => upsertReview(slug, { rating })}
                      onClearRating={deleteReview}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GetAccountsClient() {
  const t = useT();
  const locale = useLocale();
  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-10 px-4 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("providers.accounts.getMinecraftAccounts")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("providers.accounts.social.description")}
        </p>
        <p className="text-sm text-muted-foreground">
          <BookOpen className="inline h-4 w-4 align-text-bottom" />{" "}
          <TranslatedMessage
            text="providers.accounts.guide.description"
            values={{
              guide: (
                <Link
                  to="/{-$lang}/docs/$"
                  params={{
                    lang: locale === "en" ? undefined : locale,
                    _splat: "how-to/import-accounts",
                  }}
                  className="underline hover:text-foreground"
                >
                  {t("faq.accountGuide")}
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

      <ProviderFaq kind="accounts" />

      <div className="mx-auto flex max-w-5xl flex-col gap-2 border-t pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>{t("providers.accounts.source")}</strong>{" "}
          {t("providers.accounts.attribution")}
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>{t("providers.accounts.disclaimer")}</strong>{" "}
          {t("providers.accounts.disclosure")}
        </p>
        <p className="text-sm text-muted-foreground">
          <TranslatedMessage
            text="providers.corrections.description"
            values={{
              github: (
                <a
                  href="https://github.com/soulfiremc-com/soulfiremc.com/edit/main/src/lib/accounts-data.tsx"
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

const accountProvidersBySlug = [
  ...new Map(PROVIDERS.map((provider) => [provider.slug, provider])).values(),
];

const accountReviewsQueryOptions = reviewsQueryOptions({
  itemType: "account",
  slugs: accountProvidersBySlug.map((provider) => provider.slug),
});

const accountsBreadcrumbJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": "https://soulfiremc.com/get-accounts#breadcrumb",
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
      name: "common.getAccounts",
      item: "https://soulfiremc.com/get-accounts",
    },
  ],
});

const accountsPageJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "common.minecraftAltsMfaNfaAccounts",
  description: "providers.accounts.meta.description",
  url: "https://soulfiremc.com/get-accounts",
  inLanguage: "en-US",
  isPartOf: {
    "@type": "WebSite",
    name: "SoulFire",
    url: "https://soulfiremc.com",
  },
  breadcrumb: {
    "@id": "https://soulfiremc.com/get-accounts#breadcrumb",
  },
  mainEntity: {
    "@id": "https://soulfiremc.com/get-accounts#provider-list",
  },
});

function createAccountsItemListJsonLd(
  reviewSummaries?: Record<string, ReviewSummary>,
  liveShopDataBySlug?: LiveShopDataBySlug,
) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://soulfiremc.com/get-accounts#provider-list",
    name: "providers.accounts.minecraftAltShopsAndAccountProviders",
    description: "providers.accounts.directory.description",
    numberOfItems: accountProvidersBySlug.length,
    itemListElement: accountProvidersBySlug.map((provider, index) => {
      const reviewSummary = reviewSummaries?.[provider.slug];
      const aggregateRating = reviewSummary
        ? getAggregateRatingJsonLd(reviewSummary)
        : undefined;
      const shop = getShopBySlug(provider.slug);
      const liveShopData = liveShopDataBySlug?.[provider.slug];

      return {
        "@type": "ListItem",
        position: index + 1,
        url: `https://soulfiremc.com/get-accounts/${provider.slug}`,
        item: {
          "@type": "Product",
          name: provider.name,
          description: provider.summary,
          url: `https://soulfiremc.com/get-accounts/${provider.slug}`,
          category:
            provider.category === "mfa-accounts"
              ? "providers.accounts.mfaFullAccessMinecraftAccounts"
              : "providers.accounts.nfaTemporaryMinecraftAccounts",
          ...(shop && liveShopData && provider.priceValue !== undefined
            ? {
                aggregateOffer: getShopAggregateOffer(shop, liveShopData),
                offers: getListingOffer(
                  shop,
                  provider.category,
                  provider.priceValue,
                  liveShopData,
                ),
              }
            : {}),
          ...(aggregateRating ? { aggregateRating } : {}),
        },
      };
    }),
  });
}

function AccountsItemListStructuredData() {
  const locale = useLocale();
  const { data: reviews } = useSuspenseQuery(accountReviewsQueryOptions);
  const { data: liveShopData } = useSuspenseQuery(
    allAccountLiveShopDataQueryOptions,
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: localizeProviderJsonLd(
          createAccountsItemListJsonLd(reviews.summaries, liveShopData),
          locale,
        ),
      }}
    />
  );
}

export const Route = createFileRoute("/{-$lang}/get-accounts/")({
  validateSearch: Schema.toStandardSchemaV1(accountsSearchSchema),
  search: {
    middlewares: [stripSearchParams({ badges: [], sort: "default" })],
  },
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(allAccountLiveShopDataQueryOptions);
    void context.queryClient.prefetchQuery(accountsDiscordInvitesQueryOptions);
    void context.queryClient.prefetchQuery(accountReviewsQueryOptions);
    return { renderedAt: Date.now() };
  },
  head: ({ params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    return {
      meta: getPageMeta({
        locale,
        title: translate(locale, "providers.accounts.meta.title"),
        description: translate(locale, "providers.accounts.meta.description"),
        path: "/get-accounts",
        imageUrl: "/og/site/get-accounts/image.webp",
        imageAlt: translate(
          locale,
          "providers.accounts.soulfireAccountProvidersPagePreview",
        ),
      }),
      links: getCanonicalLinks("/get-accounts", locale),
    };
  },
  component: GetAccountsPage,
});

function GetAccountsPage() {
  const locale = useLocale();
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: localizeProviderJsonLd(accountsPageJsonLd, locale),
        }}
      />
      <Suspense
        fallback={
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: localizeProviderJsonLd(
                createAccountsItemListJsonLd(),
                locale,
              ),
            }}
          />
        }
      >
        <AccountsItemListStructuredData />
      </Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createProviderFaqJsonLd("accounts", locale)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: localizeProviderJsonLd(accountsBreadcrumbJsonLd, locale),
        }}
      />
      <GetAccountsClient />
    </SiteShell>
  );
}
