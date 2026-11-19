import { translate, resolveMessage } from "@/lib/messages";
import { isLocale } from "@/lib/i18n";
import {
  formatProviderSince,
  localizeProviderJsonLd,
} from "@/lib/provider-i18n";
import { useT, useLocale } from "@/lib/i18n-react";
import { TranslatedMessage } from "@/components/translated-message";
import { ProviderFaq } from "@/components/provider-faq";
import { createProviderFaqJsonLd } from "@/lib/provider-faq-data";
import { Schema, Effect } from "effect";
import { usePrerenderedSearch } from "@/hooks/use-prerendered-search";
import { usePrerenderedSearchOrder } from "@/hooks/use-prerendered-search-order";
import { SiDiscord, SiTrustpilot } from "@icons-pack/react-simple-icons";
import { noop, useSuspenseQuery } from "@tanstack/react-query";
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
import {
  memo,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CouponCode, LinkDiscountNotice } from "@/components/coupon-code";
import { Image } from "@/components/image";
import { PaymentMethods } from "@/components/payment-methods";
import { ProviderInfoPopover } from "@/components/provider-info-popover";
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
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReviews } from "@/hooks/use-reviews";
import {
  BADGE_CONFIG,
  type Badge,
  CATEGORY_CONFIG,
  FILTER_BADGES,
  FILTER_CATEGORIES,
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDER_THEMES,
  PROVIDERS,
  type Provider,
  SORT_CONFIG,
} from "@/lib/accounts-data";
import {
  countAccountFilterOptions,
  filterAccountProviders,
  sortAccountProviders,
} from "@/lib/account-provider-list";
import { getListingOffer } from "@/lib/accounts-offers";
import {
  accountsDiscordInvitesQueryOptions,
  allAccountLiveShopDataQueryOptions,
  type LiveShopDataBySlug,
} from "@/lib/accounts-queries";
import {
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  type ReviewSummary,
  type ReviewSummaryStatus,
  type UserReviewRecord,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { JsonLdScript } from "@/components/json-ld";
import { isOneOf } from "@/lib/is-one-of";

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
        className="border-transparent bg-discord/10 text-discord"
      >
        <Users />
        {t("providers.accounts.unknown")}
      </UiBadge>
    );
  }

  return (
    <ProviderInfoPopover
      trigger={
        <UiBadge
          variant="outline"
          aria-label={t("providers.accounts.members", {
            count: info.approximate_member_count.toLocaleString(locale),
          })}
          className="cursor-help border-transparent bg-discord/10 text-discord"
        >
          <Users />
          {new Intl.NumberFormat(locale, {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(info.approximate_member_count)}
        </UiBadge>
      }
    >
      {info.guild?.name && <p className="font-medium">{info.guild.name}</p>}
      <p>
        {t("providers.accounts.members", {
          count: info.approximate_member_count.toLocaleString(locale),
        })}
      </p>
      {info.approximate_presence_count ? (
        <p className="text-success">
          {t("providers.accounts.online", {
            count: info.approximate_presence_count.toLocaleString(locale),
          })}
        </p>
      ) : null}
    </ProviderInfoPopover>
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
    Schema.catchDecoding(() => Effect.succeedSome(undefined)),
  ),
  badges: Schema.mutable(Schema.Array(Schema.Literals(BADGES))).pipe(
    Schema.catchDecoding(() => Effect.succeedSome([])),
    Schema.withDecodingDefaultType(Effect.succeed([])),
  ),
  sort: Schema.Literals(SORT_OPTIONS).pipe(
    Schema.catchDecoding(() => Effect.succeedSome("default")),
    Schema.withDecodingDefaultType(Effect.succeed("default" as const)),
  ),
});

type AccountsSearch = typeof accountsSearchSchema.Type;

const PENDING_SEARCH_STYLE_ID = "get-accounts-pending-search";

// The prerendered HTML always lists every provider in the default order. When
// the URL has filters, hide that list before the first paint so applying the
// filters after hydration does not shift the page. The animation reveals the
// list if the app never hydrates.
const hidePrerenderedResultsScript = `(()=>{const s=new URLSearchParams(location.search);if(!s.has("category")&&!s.has("badges")&&!s.has("sort"))return;const e=document.createElement("style");e.id="${PENDING_SEARCH_STYLE_ID}";e.textContent="[data-provider-results]{visibility:hidden;animation:provider-results-reveal 0s 5s forwards}@keyframes provider-results-reveal{to{visibility:visible}}";document.head.append(e)})()`;

// Features that at least one listing offers. The page hides the others, such
// as "Free" while every shop is paid, unless a shared link selected them.
const OFFERED_FILTER_BADGES = new Set(
  FILTER_BADGES.filter((badge) =>
    PROVIDERS.some((provider) => provider.badges.includes(badge)),
  ),
);

function FilterOptionCount({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className="tabular-nums">
      {count}
    </span>
  );
}

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
    <ProviderInfoPopover
      trigger={
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
    >
      <p>{t(config.description)}</p>
    </ProviderInfoPopover>
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
    <div className="flex size-full items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary">
      {provider.name.charAt(0).toUpperCase()}
    </div>
  );
}

// Memoized so a filter change renders only the cards that it adds.
const ProviderCard = memo(function ProviderCard({
  provider,
  reviewSummary,
  reviewSummaryStatus,
  userReview,
  reviewPending,
  onRate,
  onClearRating,
}: {
  provider: Provider;
  reviewSummary: ReviewSummary;
  reviewSummaryStatus: ReviewSummaryStatus;
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
            "relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted",
            theme?.logo,
          )}
        >
          <ProviderLogo provider={provider} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              {/* The overlay makes the whole card open the provider page. */}
              <Link
                to="/{-$lang}/get-accounts/$slug"
                params={{ slug: provider.slug }}
                className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {provider.name}
              </Link>
            </h3>
            {provider.startDate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {t("providers.accounts.since", {
                  date: formatProviderSince(provider.startDate, locale),
                })}
              </span>
            )}
            <span className="relative z-10 inline-flex">
              {provider.priceDetails ? (
                <ProviderInfoPopover
                  trigger={
                    <UiBadge
                      variant="outline"
                      className={cn(
                        "cursor-help border-transparent bg-primary/10 text-sm text-primary",
                        theme?.price /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
                      )}
                    >
                      {resolveMessage(locale, provider.price)}
                      <Info className="opacity-70" />
                      <span className="sr-only">
                        {t("providers.accounts.pricingDetails.label")}
                      </span>
                    </UiBadge>
                  }
                >
                  <p className="font-medium">
                    {t("providers.accounts.pricingDetails.heading")}
                  </p>
                  <p className="text-muted-foreground">
                    {t(provider.priceDetails)}
                  </p>
                </ProviderInfoPopover>
              ) : (
                <UiBadge
                  variant="outline"
                  className={cn(
                    "border-transparent bg-primary/10 text-sm text-primary",
                    theme?.price /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
                  )}
                >
                  {resolveMessage(locale, provider.price)}
                </UiBadge>
              )}
            </span>
            {/* Shops without a Discord server have no member count. */}
            {discordInviteUrl && (
              <span className="relative z-10 inline-flex">
                <Suspense
                  fallback={
                    <Skeleton
                      aria-label={t(
                        "providers.accounts.loadingDiscordMemberCount",
                      )}
                      className="h-5 w-16"
                    />
                  }
                >
                  <DiscordMemberBadge providerSlug={provider.slug} />
                </Suspense>
              </span>
            )}
            <div className="relative z-10 flex flex-wrap gap-2">
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
              className="relative z-10 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImageIcon className="size-3" />
              {t("providers.accounts.photos", {
                count: provider.gallery.length,
              })}
            </Link>
          )}
          {provider.couponCode ? (
            <div className="relative z-10">
              <CouponCode
                code={provider.couponCode}
                discount={provider.couponDiscount}
              />
            </div>
          ) : provider.linkDiscountMessage ? (
            <div className="relative z-10">
              <LinkDiscountNotice
                message={provider.linkDiscountMessage}
                href={provider.url}
              />
            </div>
          ) : null}
          <div className="relative z-10 w-fit">
            <PaymentMethods methods={provider.paymentMethods} />
          </div>
          <div className="relative z-10 flex flex-wrap gap-2">
            <Button
              render={
                <a href={provider.url} target="_blank" rel="noopener nofollow">
                  {t("common.getAccounts")}
                  <ExternalLink data-icon="inline-end" />
                </a>
              }
              nativeButton={false}
              className={
                theme?.primaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
              }
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
                className={
                  theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
                }
              />
            )}
            {discordInviteUrl && (
              <Button
                render={
                  <a
                    href={discordInviteUrl}
                    // oxlint-disable-next-line react/jsx-no-target-blank -- noopener is set; the partner invite keeps the referrer on purpose
                    target="_blank"
                    rel="noopener nofollow"
                  >
                    Discord
                    <SiDiscord aria-hidden="true" data-icon="inline-end" />
                  </a>
                }
                nativeButton={false}
                variant="secondary"
                className={
                  theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
                }
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
                    <SiTrustpilot aria-hidden="true" data-icon="inline-end" />
                  </a>
                }
                nativeButton={false}
                variant="secondary"
                className={
                  theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
                }
              />
            )}
            <SocialLinkButtons
              links={provider.socialLinks}
              className={
                theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
              }
            />
          </div>
          <div className="relative z-10">
            <ReviewInlineActions
              summary={reviewSummary}
              summaryStatus={reviewSummaryStatus}
              currentRating={userReview?.rating}
              pending={reviewPending}
              onRate={(rating) => onRate(provider.slug, rating)}
              onClear={() => onClearRating(provider.slug)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
});

const promotionDeadlines = PROVIDERS.flatMap(({ promotedUntil }) =>
  promotedUntil === undefined ? [] : [Date.parse(promotedUntil)],
).toSorted((a, b) => a - b);

function getPromotionTime() {
  const now = Date.now();
  return promotionDeadlines.findLast((deadline) => deadline <= now) ?? 0;
}

function subscribeToPromotionTime(onChange: () => void) {
  let timeout: number | undefined;
  const schedule = () => {
    const now = Date.now();
    const nextDeadline = promotionDeadlines.find((deadline) => deadline > now);
    if (nextDeadline === undefined) return;
    // A timer cannot represent delays longer than a signed 32-bit integer.
    timeout = window.setTimeout(
      () => {
        onChange();
        schedule();
      },
      Math.min(nextDeadline - now, 2_147_483_647),
    );
  };
  schedule();
  return () => {
    window.clearTimeout(timeout);
  };
}

function MainContent() {
  const t = useT();
  const { renderedAt } = Route.useLoaderData();
  const hydrated = useHydrated();
  const now = useSyncExternalStore(
    subscribeToPromotionTime,
    getPromotionTime,
    () => renderedAt,
  );
  const providers = PROVIDERS;
  const slugs = useMemo(() => [...new Set(PROVIDERS.map((p) => p.slug))], []);
  const {
    summaries,
    summaryStatus,
    userReviews,
    pendingBySlug,
    upsertReview,
    deleteReview,
  } = useReviews("account", slugs);
  const { category, badges, sort } = usePrerenderedSearch(
    Route.useSearch(),
    Schema.decodeSync(accountsSearchSchema)({}),
  );
  const navigate = Route.useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);
  // The filter controls update at once. The cards follow in an interruptible
  // render, so a click paints its pressed state before the list changes.
  const resultsCategory = useDeferredValue(category);
  const resultsBadges = useDeferredValue(badges);
  const resultsSort = useDeferredValue(sort);
  const orderSummaries = usePrerenderedSearchOrder(
    summaries,
    JSON.stringify([
      resultsCategory,
      resultsBadges,
      resultsSort,
      // A rating sort from a shared link applies once the reviews arrive.
      resultsSort === "best-rated" && summaryStatus === "loading",
    ]),
  );

  // Stable handlers let the memoized cards skip renders.
  const reviewActions = useRef({ upsertReview, deleteReview });
  useLayoutEffect(() => {
    reviewActions.current = { upsertReview, deleteReview };
  });
  const rateProvider = useCallback(
    (slug: string, rating: number) =>
      reviewActions.current.upsertReview(slug, { rating }),
    [],
  );
  const clearProviderRating = useCallback(
    (slug: string) => reviewActions.current.deleteReview(slug),
    [],
  );

  // Reveal the results only after the deferred render applied the URL filters.
  const resultsMatchSearch =
    hydrated &&
    resultsCategory === category &&
    resultsBadges === badges &&
    resultsSort === sort;
  useEffect(() => {
    if (resultsMatchSearch) {
      document.querySelector(`#${PENDING_SEARCH_STYLE_ID}`)?.remove();
    }
  }, [resultsMatchSearch]);

  const updateSearch = (
    search: (previous: AccountsSearch) => AccountsSearch,
  ) => {
    // Read the position before the update. Reading it after the update
    // forces a synchronous layout of the whole new list.
    const resultsAbove =
      (resultsRef.current?.getBoundingClientRect().top ?? 0) < 0;
    void navigate({ search, replace: true, resetScroll: false }).then(() => {
      // Scroll anchoring keeps the visible cards in place when sections above
      // them change, so bring the start of the results back into view.
      const results = resultsRef.current;
      if (results && resultsAbove) {
        results.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    });
  };

  const clearFilters = () => {
    updateSearch((previous) => ({
      ...previous,
      category: undefined,
      badges: [],
      sort: "default",
    }));
  };

  const filteredProviders = filterAccountProviders(providers, category, badges);
  const optionCounts = countAccountFilterOptions(
    providers,
    FILTER_CATEGORIES,
    FILTER_BADGES,
    category,
    badges,
  );

  const resultProviders = filterAccountProviders(
    providers,
    resultsCategory,
    resultsBadges,
  );
  const nfaProviders = sortAccountProviders(
    resultProviders.filter((p) => p.category === "nfa-accounts"),
    resultsSort,
    orderSummaries,
    now,
  );
  const mfaProviders = sortAccountProviders(
    resultProviders.filter((p) => p.category === "mfa-accounts"),
    resultsSort,
    orderSummaries,
    now,
  );

  const hasActiveFilters =
    badges.length > 0 || category !== undefined || sort !== "default";

  const [filtersOpen, setFiltersOpen] = useState(false);

  const resultCount = t("providers.accounts.resultCount", {
    count: filteredProviders.length,
    total: providers.length,
  });

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
        <p className="text-xs text-muted-foreground">{resultCount}</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {t("providers.accounts.category")}
        </span>
        <ToggleGroup
          aria-label={t("providers.accounts.category")}
          value={category ? [category] : []}
          onValueChange={([value]) => {
            updateSearch((previous) => ({
              ...previous,
              category: isOneOf(value, CATEGORIES) ? value : undefined,
            }));
          }}
          spacing={2}
          className="flex-wrap"
        >
          {FILTER_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            const count = optionCounts.categories[cat];
            return (
              <ToggleGroupItem
                key={cat}
                value={cat}
                size="sm"
                disabled={count === 0 && !isActive}
                className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:ring-2 data-pressed:ring-primary data-pressed:ring-offset-2 data-pressed:ring-offset-background"
              >
                {t(config.label)}
                <FilterOptionCount count={count} />
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
          aria-label={t("providers.accounts.features")}
          multiple
          value={badges}
          onValueChange={(value) => {
            updateSearch((previous) => ({
              ...previous,
              badges: value.filter((badge) => isOneOf(badge, BADGES)),
            }));
          }}
          spacing={2}
          className="flex-wrap"
        >
          {FILTER_BADGES.filter(
            (badge) =>
              OFFERED_FILTER_BADGES.has(badge) || badges.includes(badge),
          ).map((badge) => {
            const config = BADGE_CONFIG[badge];
            const isActive = badges.includes(badge);
            const count = optionCounts.badges[badge];
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
                <FilterOptionCount count={count} />
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
          aria-label={t("providers.accounts.sort")}
          value={[sort]}
          onValueChange={([value]) => {
            // Pressing the active sort again returns to the default order.
            updateSearch((previous) => ({
              ...previous,
              sort: isOneOf(value, SORT_OPTIONS) ? value : "default",
            }));
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
        aria-controls={filtersOpen ? "account-filters-mobile" : undefined}
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
        <div
          id="account-filters-mobile"
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
      <div
        ref={resultsRef}
        data-provider-results
        className="flex min-w-0 flex-1 scroll-mt-20 flex-col gap-10"
      >
        <output className="sr-only">{resultCount}</output>
        {resultProviders.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>
                {t("providers.accounts.noProvidersFound")}
              </EmptyTitle>
              <EmptyDescription>
                {t("providers.filters.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={clearFilters}>
                {t("providers.accounts.clearFilters")}
              </Button>
            </EmptyContent>
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
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {mfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      reviewSummary={
                        summaries[provider.slug] ?? emptyReviewSummary()
                      }
                      reviewSummaryStatus={summaryStatus}
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={rateProvider}
                      onClearRating={clearProviderRating}
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
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {nfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      reviewSummary={
                        summaries[provider.slug] ?? emptyReviewSummary()
                      }
                      reviewSummaryStatus={summaryStatus}
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={rateProvider}
                      onClearRating={clearProviderRating}
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
          <BookOpen className="inline size-4 align-text-bottom" />{" "}
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
    <JsonLdScript
      json={localizeProviderJsonLd(
        createAccountsItemListJsonLd(reviews.summaries, liveShopData),
        locale,
      )}
    />
  );
}

export const Route = createFileRoute("/{-$lang}/get-accounts/")({
  validateSearch: Schema.toStandardSchemaV1(accountsSearchSchema),
  search: {
    middlewares: [stripSearchParams({ badges: [], sort: "default" })],
  },
  loader: async ({ context }) => {
    void context.queryClient
      .query(allAccountLiveShopDataQueryOptions)
      .catch(noop);
    const discordInvites = context.queryClient
      .query(accountsDiscordInvitesQueryOptions)
      .catch(noop);
    void context.queryClient.query(accountReviewsQueryOptions).catch(noop);
    // The prerendered page must include the member badges. A streamed
    // fallback swaps in late in the large document and shifts each card.
    if (import.meta.env.SSR) await discordInvites;
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
      <JsonLdScript json={localizeProviderJsonLd(accountsPageJsonLd, locale)} />
      <Suspense
        fallback={
          <JsonLdScript
            json={localizeProviderJsonLd(
              createAccountsItemListJsonLd(),
              locale,
            )}
          />
        }
      >
        <AccountsItemListStructuredData />
      </Suspense>
      <JsonLdScript
        json={JSON.stringify(createProviderFaqJsonLd("accounts", locale))}
      />
      <JsonLdScript
        json={localizeProviderJsonLd(accountsBreadcrumbJsonLd, locale)}
      />
      <GetAccountsClient />
    </SiteShell>
  );
}
