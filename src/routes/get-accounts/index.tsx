import { SiDiscord, SiTrustpilot } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  ImageIcon,
  Info,
  Users,
} from "lucide-react";
import {
  createStandardSchemaV1,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Suspense, useMemo, useState } from "react";
import { PaymentMethods } from "@/components/payment-methods";
import { ReviewInlineActions } from "@/components/review-inline-actions";
import { ReviewTurnstileProvider } from "@/components/review-turnstile-provider";
import { SiteShell } from "@/components/site-shell";
import { SocialLinkButtons } from "@/components/social-link-buttons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  getListingOffer,
  getLiveShopData,
  getShopAggregateOffer,
} from "@/lib/accounts-offers";
import { type DiscordInviteResponse, fetchDiscordInvite } from "@/lib/discord";
import type { ReviewSummary, UserReviewRecord } from "@/lib/review-core";
import { getAggregateRatingJsonLd, getReviewSummaries } from "@/lib/reviews";
import { parseAsNativeOrDelimitedArrayOf } from "@/lib/search-param-parsers";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const accountFaqItems: {
  question: string;
  answerHtml: string;
  answerElement: React.ReactNode;
}[] = [
  {
    question: "What are MFA accounts?",
    answerHtml:
      'MFA (Multi-Factor Authentication) accounts are permanent Minecraft accounts with full access. In alt-shop terms, they are the closest match to full-access Minecraft alts because you can change the email, password, and username. They\'re more secure and stable, which makes them pricier. Learn more in the <a href="https://soulfiremc.com/docs/how-to/import-accounts">Account Guide</a>.',
    answerElement: (
      <>
        MFA (Multi-Factor Authentication) accounts are permanent Minecraft
        accounts with full access. In alt-shop terms, they are the closest match
        to full-access Minecraft alts because you can change the email,
        password, and username. They're more secure and stable, which makes them
        pricier. Learn more in the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/import-accounts" }}
          className="underline text-primary"
        >
          Account Guide
        </Link>
        .
      </>
    ),
  },
  {
    question: "What are NFA accounts?",
    answerHtml:
      'NFA (Non-Full Access) accounts are temporary Minecraft alts that may stop working over time. They\'re cheaper but come with a higher risk of losing access. See the <a href="https://soulfiremc.com/docs/how-to/import-accounts">Account Guide</a> for details on supported account types.',
    answerElement: (
      <>
        NFA (Non-Full Access) accounts are temporary Minecraft alts that may
        stop working over time. They're cheaper but come with a higher risk of
        losing access. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/import-accounts" }}
          className="underline text-primary"
        >
          Account Guide
        </Link>{" "}
        for details on supported account types.
      </>
    ),
  },
  {
    question: "Which account type works with SoulFire?",
    answerHtml:
      'MFA accounts are fully supported by SoulFire. For NFA accounts, SoulFire supports refresh token, cookie, and access token auth. Read the <a href="https://soulfiremc.com/docs/how-to/import-accounts">Account Guide</a> for setup instructions.',
    answerElement: (
      <>
        MFA accounts are fully supported by SoulFire. For NFA accounts, SoulFire
        supports refresh token, cookie, and access token auth. Read the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/import-accounts" }}
          className="underline text-primary"
        >
          Account Guide
        </Link>{" "}
        for setup instructions.
      </>
    ),
  },
  {
    question: "What are temporary Minecraft alts?",
    answerHtml:
      "When people search for temporary Minecraft alts, they usually mean NFA accounts or token and cookie-based accounts. These are cheaper than MFA or full-access accounts, but access can expire or stop working over time.",
    answerElement: (
      <>
        When people search for temporary Minecraft alts, they usually mean NFA
        accounts or token and cookie-based accounts. These are cheaper than MFA
        or full-access accounts, but access can expire or stop working over
        time.
      </>
    ),
  },
  {
    question: "What are token and cookie accounts?",
    answerHtml:
      "Token and cookie accounts are common delivery formats for lower-cost Minecraft alts. SoulFire supports refresh token, cookie, and access token auth for compatible NFA providers.",
    answerElement: (
      <>
        Token and cookie accounts are common delivery formats for lower-cost
        Minecraft alts. SoulFire supports refresh token, cookie, and access
        token auth for compatible NFA providers.
      </>
    ),
  },
  {
    question: "What does SFA mean?",
    answerHtml:
      "In community jargon, SFA usually means Semi Full Access. The term is inconsistent across alt shops and some marketplaces treat it as misleading, so SoulFire uses the clearer MFA/full-access and NFA/temporary labels instead.",
    answerElement: (
      <>
        In community jargon, SFA usually means Semi Full Access. The term is
        inconsistent across alt shops and some marketplaces treat it as
        misleading, so SoulFire uses the clearer MFA/full-access and
        NFA/temporary labels instead.
      </>
    ),
  },
  {
    question: "Are these providers affiliated with SoulFire?",
    answerHtml:
      "This is still a community-curated list and SoulFire does not own or operate these providers. Some listings may have official integrations or affiliate codes and links, and those are labeled clearly on the page.",
    answerElement: (
      <>
        This is still a community-curated list and SoulFire does not own or
        operate these providers. Some listings may have official integrations or
        affiliate codes and links, and those are labeled clearly on the page.
      </>
    ),
  },
  {
    question: 'What does the "Free" badge mean?',
    answerHtml:
      "Providers with the Free badge offer accounts at no cost. These are typically temporary tokens with daily limits.",
    answerElement: (
      <>
        Providers with the Free badge offer accounts at no cost. These are
        typically temporary tokens with daily limits.
      </>
    ),
  },
];

function PriceInfoBadge({ details }: { details: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Pricing details</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm">
        <p className="font-medium mb-1">Pricing Details</p>
        <p className="text-muted-foreground">{details}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return num.toString();
}

function DiscordMemberBadge({ info }: { info: DiscordInviteResponse | null }) {
  if (!info?.approximate_member_count) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#5865F2]/10 px-2.5 py-0.5 text-xs font-medium text-[#5865F2]/50">
        <Users className="h-3 w-3" />
        unknown
      </span>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-[#5865F2]/10 px-2.5 py-0.5 text-xs font-medium text-[#5865F2]">
          <Users className="h-3 w-3" />
          {formatNumber(info.approximate_member_count)}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto text-sm">
        {info.guild?.name && <p className="font-medium">{info.guild.name}</p>}
        <p>{info.approximate_member_count?.toLocaleString()} members</p>
        {info.approximate_presence_count && (
          <p className="text-green-500">
            {info.approximate_presence_count.toLocaleString()} online
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function CouponCode({ code, discount }: { code: string; discount?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 p-3">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {discount ? `Use code for ${discount}` : "Coupon code"}
        </p>
        <p className="font-mono font-semibold text-pink-600 dark:text-pink-400">
          {code}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md p-2 hover:bg-pink-500/10 transition-colors"
        aria-label="Copy coupon code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function LinkDiscountNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-pink-500/10 p-3">
      <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
        {message}
      </p>
    </div>
  );
}

const CATEGORIES = ["nfa-accounts", "mfa-accounts"] as const;

const BADGES = [
  "free",
  "high-quality",
  "instant-delivery",
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

const accountsSearchParams = {
  category: parseAsStringLiteral([...CATEGORIES]),
  badges: parseAsNativeOrDelimitedArrayOf(parseAsStringLiteral([...BADGES])),
  sort: parseAsStringLiteral([...SORT_OPTIONS]).withDefault("default"),
};

const validateAccountsSearch = createStandardSchemaV1(accountsSearchParams, {
  partialOutput: true,
});

type DiscordInvites = Record<string, DiscordInviteResponse | null>;

type Props = {
  discordInvites: DiscordInvites;
  initialSummaries: Record<string, ReviewSummary>;
};

function ProviderBadge({
  badge,
  classNameOverride,
}: {
  badge: Badge;
  classNameOverride?: string;
}) {
  const config = BADGE_CONFIG[badge];
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-help items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            classNameOverride ?? config.className,
          )}
        >
          {config.icon}
          {config.label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm">
        <p>{config.description}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function ProviderThemeDecoration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/18 blur-3xl dark:bg-rose-400/18" />
      <div className="absolute -bottom-8 left-0 h-24 w-24 rounded-full bg-orange-400/18 blur-2xl dark:bg-orange-300/12" />
    </div>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  if (provider.logo) {
    return (
      <img
        src={provider.logo}
        alt={`${provider.name} logo`}
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
  discordInvites,
  reviewSummary,
  userReview,
  reviewPending,
  onRate,
  onClearRating,
}: {
  provider: Provider;
  discordInvites: DiscordInvites;
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
  const discordInvite = discordInvites[provider.slug] ?? null;
  const discordInviteUrl = getDiscordInviteUrl(provider);
  const theme = provider.theme ? PROVIDER_THEMES[provider.theme] : undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        theme && [
          "ring-2 shadow-[0_20px_60px_-40px_rgba(244,63,94,0.55)]",
          theme.ring,
          theme.bg,
        ],
      )}
    >
      {theme && <ProviderThemeDecoration />}
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row">
        <div
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted",
            theme?.logo,
          )}
        >
          <ProviderLogo provider={provider} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              <Link
                to="/get-accounts/$slug"
                params={{ slug: provider.slug }}
                className="hover:underline"
              >
                {provider.name}
              </Link>
            </h3>
            {provider.startDate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Since {provider.startDate}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary",
                theme?.price,
              )}
            >
              {provider.price}
              {provider.priceDetails && (
                <PriceInfoBadge details={provider.priceDetails} />
              )}
            </span>
            <DiscordMemberBadge info={discordInvite} />
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
          <p className="text-muted-foreground">{provider.summary}</p>
          {provider.gallery && provider.gallery.length > 0 && (
            <Link
              to="/get-accounts/$slug"
              params={{ slug: provider.slug }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              {provider.gallery.length} photo
              {provider.gallery.length !== 1 && "s"}
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
            <Button asChild className={theme?.primaryButton}>
              <a href={provider.url} target="_blank" rel="noopener nofollow">
                Get Accounts
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            {provider.websiteUrl && (
              <Button
                asChild
                variant="secondary"
                className={theme?.secondaryButton}
              >
                <a
                  href={provider.websiteUrl}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  Website
                  <Globe className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {discordInviteUrl && (
              <Button
                asChild
                variant="secondary"
                className={theme?.secondaryButton}
              >
                <a
                  href={discordInviteUrl}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  Discord
                  <SiDiscord className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {provider.trustpilotUrl && (
              <Button
                asChild
                variant="secondary"
                className={theme?.secondaryButton}
              >
                <a
                  href={provider.trustpilotUrl}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  Trustpilot
                  <SiTrustpilot className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <SocialLinkButtons
              links={provider.socialLinks}
              className={theme?.secondaryButton}
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

function sortProviders(
  providers: Provider[],
  sort: SortOption,
  summaries: Record<string, ReviewSummary>,
): Provider[] {
  if (sort === "default" || sort === "best-rated") {
    return [...providers].sort((a, b) => {
      const summaryA = summaries[a.slug] ?? {
        averageRating: null,
        reviewCount: 0,
      };
      const summaryB = summaries[b.slug] ?? {
        averageRating: null,
        reviewCount: 0,
      };

      if (sort === "best-rated") {
        if (summaryB.averageRating !== summaryA.averageRating) {
          return (summaryB.averageRating ?? 0) - (summaryA.averageRating ?? 0);
        }

        if (summaryB.reviewCount !== summaryA.reviewCount) {
          return summaryB.reviewCount - summaryA.reviewCount;
        }
      } else {
        if (summaryB.reviewCount !== summaryA.reviewCount) {
          return summaryB.reviewCount - summaryA.reviewCount;
        }

        if (summaryB.averageRating !== summaryA.averageRating) {
          return (summaryB.averageRating ?? 0) - (summaryA.averageRating ?? 0);
        }
      }

      return a.name.localeCompare(b.name);
    });
  }
  return [...providers].sort((a, b) =>
    sort === "price-asc"
      ? a.priceValue - b.priceValue
      : b.priceValue - a.priceValue,
  );
}

function MainContent(props: Props) {
  const providers = PROVIDERS;
  const slugs = useMemo(() => [...new Set(providers.map((p) => p.slug))], []);
  const { summaries, userReviews, pendingBySlug, upsertReview, deleteReview } =
    useReviews("account", slugs, {
      initialSummaries: props.initialSummaries,
    });
  const [{ category, badges, sort }, setParams] = useQueryStates(
    accountsSearchParams,
    { shallow: false },
  );

  const toggleBadge = (badge: FilterableBadge) => {
    const newBadges = badges.includes(badge)
      ? badges.filter((b) => b !== badge)
      : [...badges, badge];
    setParams({ badges: newBadges });
  };

  const toggleCategory = (cat: Category) => {
    setParams({ category: category === cat ? null : cat });
  };

  const setSort = (newSort: SortOption) => {
    setParams({ sort: newSort });
  };

  const clearFilters = () => {
    setParams({ category: null, badges: [], sort: "default" });
  };

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesCategory = category ? provider.category === category : true;
      const matchesBadges =
        badges.length === 0 ||
        badges.every((filter) => provider.badges.includes(filter));
      return matchesCategory && matchesBadges;
    });
  }, [badges, category]);

  const nfaProviders = sortProviders(
    filteredProviders.filter((p) => p.category === "nfa-accounts"),
    sort,
    summaries,
  );
  const mfaProviders = sortProviders(
    filteredProviders.filter((p) => p.category === "mfa-accounts"),
    sort,
    summaries,
  );

  const hasActiveFilters =
    badges.length > 0 || category !== null || sort !== "default";

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Category:</span>
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = category === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Filter */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Features:</span>
        <div className="flex flex-wrap gap-2">
          {FILTER_BADGES.map((badge) => {
            const config = BADGE_CONFIG[badge];
            const isActive = badges.includes(badge);
            return (
              <button
                type="button"
                key={badge}
                onClick={() => toggleBadge(badge)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-all",
                  isActive
                    ? cn(
                        config.className,
                        "ring-2 ring-offset-2 ring-offset-background ring-current",
                      )
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Sort:</span>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => {
            const config = SORT_CONFIG[option];
            const isActive = sort === option;
            return (
              <button
                type="button"
                key={option}
                onClick={() => setSort(option)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium outline-none transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {config.icon}
                {config.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-(--fd-layout-width) mx-auto w-full">
      {/* Mobile filter toggle */}
      <button
        type="button"
        onClick={() => setFiltersOpen(!filtersOpen)}
        className="lg:hidden inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors self-start"
      >
        <Filter className="h-4 w-4" />
        Filters
        {hasActiveFilters && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {badges.length + (category ? 1 : 0) + (sort !== "default" ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Mobile filter panel */}
      {filtersOpen && (
        <div className="lg:hidden rounded-lg border p-4">{filterContent}</div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-20 lg:self-start">{filterContent}</div>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-10">
        {filteredProviders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No providers match the selected filters. Try removing some
              filters.
            </p>
          </Card>
        ) : (
          <>
            {/* MFA Accounts Section */}
            {mfaProviders.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">
                    MFA Accounts (Full Access / Permanent)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Permanent full-access Minecraft accounts. Change email,
                    password, and username as needed.
                  </p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {mfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      discordInvites={props.discordInvites}
                      reviewSummary={
                        summaries[provider.slug] ??
                        props.initialSummaries[provider.slug] ?? {
                          averageRating: null,
                          reviewCount: 0,
                        }
                      }
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={(slug, rating) =>
                        upsertReview(slug, { rating, anonymous: true })
                      }
                      onClearRating={deleteReview}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* NFA Accounts Section */}
            {nfaProviders.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">
                    NFA Accounts (Temporary / Non-Full Access)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Temporary Minecraft alts that may stop working over time.
                    Prices shown are per account.
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    <strong>Note:</strong> SoulFire supports refresh token,
                    cookie, and access token auth for many NFA account formats.
                  </p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {nfaProviders.map((provider) => (
                    <ProviderCard
                      key={provider.slug}
                      provider={provider}
                      discordInvites={props.discordInvites}
                      reviewSummary={
                        summaries[provider.slug] ??
                        props.initialSummaries[provider.slug] ?? {
                          averageRating: null,
                          reviewCount: 0,
                        }
                      }
                      userReview={userReviews[provider.slug]}
                      reviewPending={pendingBySlug[provider.slug] ?? false}
                      onRate={(slug, rating) =>
                        upsertReview(slug, { rating, anonymous: true })
                      }
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

function GetAccountsClient(props: Props) {
  return (
    <main className="px-4 py-12 w-full max-w-(--fd-layout-width) mx-auto space-y-10">
      <div className="space-y-4 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get Minecraft Accounts
        </h1>
        <p className="text-lg text-muted-foreground">
          Compare trusted Minecraft alt shops for SoulFire, including MFA
          full-access accounts and NFA temporary accounts.
        </p>
        <p className="text-sm text-muted-foreground">
          <BookOpen className="inline h-4 w-4 align-text-bottom" /> For more
          information on how to use accounts with SoulFire, read the{" "}
          <Link
            to="/docs/$"
            params={{ _splat: "how-to/import-accounts" }}
            className="underline hover:text-foreground"
          >
            Account Guide
          </Link>
          .
        </p>
      </div>

      <ReviewTurnstileProvider>
        <Suspense>
          <MainContent
            discordInvites={props.discordInvites}
            initialSummaries={props.initialSummaries}
          />
        </Suspense>
      </ReviewTurnstileProvider>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">
            Common questions about Minecraft accounts
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {accountFaqItems.map((item, i) => (
            <AccordionItem key={item.question} value={`faq-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answerElement}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="border-t pt-6 max-w-5xl mx-auto text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          <strong>Source:</strong> Provider list curated from{" "}
          <a
            href="https://alts.watchdog.gay"
            target="_blank"
            rel="noopener nofollow"
            className="underline hover:text-foreground"
          >
            alts.watchdog.gay
          </a>
          . Rankings based on community feedback and value.
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>Disclaimer:</strong> SoulFire does not own or operate these
          providers. Some listings may include affiliate codes or links marked
          with an Affiliate badge, and using them helps support SoulFire at no
          extra cost to you. Always do your own research before making
          purchases.
        </p>
        <p className="text-sm text-muted-foreground">
          Inaccurate information or broken links? Submit a pull request on{" "}
          <a
            href="https://github.com/soulfiremc-com/soulfiremc.com/edit/main/src/lib/accounts-data.tsx"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            GitHub
          </a>{" "}
          or contact us in our{" "}
          <Link to="/discord" className="underline hover:text-foreground">
            Discord
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

const accountsPageLoader = createServerFn({ method: "GET" }).handler(
  async () => {
    const providersBySlug = [
      ...new Map(
        PROVIDERS.map((provider) => [provider.slug, provider]),
      ).values(),
    ];
    const reviewSummaries = await getReviewSummaries("account", [
      ...new Set(PROVIDERS.map((provider) => provider.slug)),
    ]).catch(
      () =>
        ({}) as Record<
          string,
          { averageRating: number | null; reviewCount: number }
        >,
    );
    const liveShopDataEntries = await Promise.all(
      providersBySlug.map(async (provider) => {
        const shop = getShopBySlug(provider.slug);
        if (!shop) return [provider.slug, {}] as const;
        return [
          provider.slug,
          await getLiveShopData(shop).catch(() => ({})),
        ] as const;
      }),
    );
    const liveShopDataBySlug = Object.fromEntries(liveShopDataEntries);

    const discordInvites = Object.fromEntries(
      await Promise.all(
        providersBySlug.map(async (provider) => {
          const discordInviteUrl = getDiscordInviteUrl(provider);
          return [
            provider.slug,
            discordInviteUrl
              ? await fetchDiscordInvite(discordInviteUrl).catch(() => null)
              : null,
          ] as const;
        }),
      ),
    );

    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: accountFaqItems.map((item) => ({
        "@type": "Question" as const,
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer" as const,
          text: item.answerHtml,
        },
      })),
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": "https://soulfiremc.com/get-accounts#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://soulfiremc.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Get Accounts",
          item: "https://soulfiremc.com/get-accounts",
        },
      ],
    };

    const pageJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Minecraft Alts, MFA & NFA Accounts",
      description:
        "Compare Minecraft alt shops and account providers for SoulFire. Browse MFA full-access accounts, NFA temporary accounts, and token or cookie alts with current pricing and delivery details.",
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
    };

    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": "https://soulfiremc.com/get-accounts#provider-list",
      name: "Minecraft Alt Shops and Account Providers",
      description:
        "Trusted Minecraft alt shops for SoulFire bot testing. Compare MFA full-access accounts, NFA temporary accounts, and token or cookie account options.",
      numberOfItems: providersBySlug.length,
      itemListElement: providersBySlug.map((provider, index) => {
        const aggregateRating = getAggregateRatingJsonLd(
          reviewSummaries[provider.slug] ?? {
            averageRating: null,
            reviewCount: 0,
          },
        );
        const shop = getShopBySlug(provider.slug);

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
                ? "MFA full-access Minecraft accounts"
                : "NFA temporary Minecraft accounts",
            ...(shop && {
              aggregateOffer: getShopAggregateOffer(
                shop,
                liveShopDataBySlug[provider.slug],
              ),
              offers: getListingOffer(
                shop,
                provider.category,
                provider.priceValue,
                liveShopDataBySlug[provider.slug],
              ),
            }),
            ...(aggregateRating && { aggregateRating }),
          },
        };
      }),
    };

    return {
      breadcrumbJsonLd: JSON.stringify(breadcrumbJsonLd),
      discordInvites,
      faqJsonLd: JSON.stringify(faqJsonLd),
      itemListJsonLd: JSON.stringify(itemListJsonLd),
      pageJsonLd: JSON.stringify(pageJsonLd),
      reviewSummaries,
    };
  },
);

export const Route = createFileRoute("/get-accounts/")({
  validateSearch: validateAccountsSearch,
  head: () => ({
    meta: getPageMeta({
      title: "Minecraft Alts, MFA & NFA Accounts - SoulFire",
      description:
        "Compare Minecraft alt shops and account providers for SoulFire. Browse MFA full-access accounts, NFA temporary accounts, and token or cookie alts with current pricing and delivery details.",
      path: "/get-accounts",
      imageUrl: "/og/site/get-accounts/image.webp",
      imageAlt: "SoulFire account providers page preview",
    }),
    links: getCanonicalLinks("/get-accounts"),
  }),
  loader: async () => accountsPageLoader(),
  component: GetAccountsPage,
});

function GetAccountsPage() {
  const data = Route.useLoaderData();

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
        dangerouslySetInnerHTML={{ __html: data.pageJsonLd }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
        dangerouslySetInnerHTML={{ __html: data.itemListJsonLd }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
        dangerouslySetInnerHTML={{ __html: data.faqJsonLd }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
        dangerouslySetInnerHTML={{ __html: data.breadcrumbJsonLd }}
      />
      <GetAccountsClient
        discordInvites={data.discordInvites}
        initialSummaries={data.reviewSummaries}
      />
    </SiteShell>
  );
}
