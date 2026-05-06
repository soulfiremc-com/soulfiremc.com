import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Filter,
  ImageIcon,
  Star,
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
  FILTER_BADGES,
  type FilterableBadge,
  PROVIDERS,
  type Provider,
  SPONSOR_THEMES,
} from "@/lib/proxies-data";
import type { ReviewSummary, UserReviewRecord } from "@/lib/review-core";
import { getAggregateRatingJsonLd, getReviewSummaries } from "@/lib/reviews";
import { parseAsNativeOrDelimitedArrayOf } from "@/lib/search-param-parsers";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const proxiesFaqItems: {
  question: string;
  answerHtml: string;
  answerElement: React.ReactNode;
}[] = [
  {
    question: "Why do I need proxies for SoulFire?",
    answerHtml:
      'When running multiple bots, servers may block your IP. Proxies give each bot a different IP address, avoiding rate limits and IP bans. Learn more in the <a href="https://soulfiremc.com/docs/how-to/import-proxies">Proxy Guide</a>.',
    answerElement: (
      <>
        When running multiple bots, servers may block your IP. Proxies give each
        bot a different IP address, avoiding rate limits and IP bans. Learn more
        in the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/import-proxies" }}
          className="underline text-primary"
        >
          Proxy Guide
        </Link>
        .
      </>
    ),
  },
  {
    question: "What type of proxy should I use?",
    answerHtml:
      'Residential proxies are the hardest to detect but cost more. Datacenter proxies are faster and cheaper but easier to block. ISP proxies offer a middle ground. See the <a href="https://soulfiremc.com/docs/how-to/import-proxies">Proxy Guide</a> for recommendations.',
    answerElement: (
      <>
        Residential proxies are the hardest to detect but cost more. Datacenter
        proxies are faster and cheaper but easier to block. ISP proxies offer a
        middle ground. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/import-proxies" }}
          className="underline text-primary"
        >
          Proxy Guide
        </Link>{" "}
        for recommendations.
      </>
    ),
  },
  {
    question: 'What does "unlimited bandwidth" mean?',
    answerHtml:
      "Some providers don't charge per GB of data transferred. This is useful for long-running bot sessions that generate lots of traffic.",
    answerElement: (
      <>
        Some providers don't charge per GB of data transferred. This is useful
        for long-running bot sessions that generate lots of traffic.
      </>
    ),
  },
  {
    question: "Are these affiliate links?",
    answerHtml:
      "Yes, some links are affiliate links. Purchases through them help fund SoulFire development at no extra cost to you.",
    answerElement: (
      <>
        Yes, some links are affiliate links. Purchases through them help fund
        SoulFire development at no extra cost to you.
      </>
    ),
  },
  {
    question: "Can I use free proxies with SoulFire?",
    answerHtml:
      "Some providers like Webshare offer a free tier. Free public proxy lists are not recommended since they're slow, unreliable, and often already blocked.",
    answerElement: (
      <>
        Some providers like Webshare offer a free tier. Free public proxy lists
        are not recommended since they're slow, unreliable, and often already
        blocked.
      </>
    ),
  },
];

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

function _LinkDiscountNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-pink-500/10 p-3">
      <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
        {message}
      </p>
    </div>
  );
}

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

const proxiesSearchParams = {
  badges: parseAsNativeOrDelimitedArrayOf(parseAsStringLiteral([...BADGES])),
  sort: parseAsStringLiteral([...SORT_OPTIONS]).withDefault("default"),
};

const validateProxiesSearch = createStandardSchemaV1(proxiesSearchParams, {
  partialOutput: true,
});

const SORT_CONFIG = {
  default: {
    label: "Most Rated",
    icon: <ArrowDownWideNarrow className="h-3 w-3" />,
  },
  "best-rated": {
    label: "Best Rated",
    icon: <Star className="h-3 w-3 fill-current" />,
  },
} as const;

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
  const theme = provider.sponsorTheme
    ? SPONSOR_THEMES[provider.sponsorTheme]
    : undefined;

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg",
        theme && ["ring-2", theme.ring, theme.bg],
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-6">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ProviderLogo provider={provider} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              <Link
                to="/get-proxies/$slug"
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
            <div className="flex flex-wrap gap-2">
              {provider.badges.map((badge) => (
                <ProviderBadge
                  key={badge}
                  badge={badge}
                  classNameOverride={
                    badge === "sponsor" ? theme?.badge : undefined
                  }
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">{provider.summary}</p>
          {provider.gallery && provider.gallery.length > 0 && (
            <Link
              to="/get-proxies/$slug"
              params={{ slug: provider.slug }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              {provider.gallery.length} photo
              {provider.gallery.length !== 1 && "s"}
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
            <Button asChild>
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                Get Proxies
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
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

function MainContent({
  initialSummaries,
}: {
  initialSummaries: Record<string, ReviewSummary>;
}) {
  const providers = PROVIDERS;
  const slugs = useMemo(() => providers.map((p) => p.slug), []);
  const { summaries, userReviews, pendingBySlug, upsertReview, deleteReview } =
    useReviews("proxy", slugs, { initialSummaries });
  const [{ badges, sort }, setParams] = useQueryStates(proxiesSearchParams, {
    shallow: false,
  });

  const toggleFilter = (badge: FilterableBadge) => {
    const newBadges = badges.includes(badge)
      ? badges.filter((b) => b !== badge)
      : [...badges, badge];
    setParams({ badges: newBadges });
  };

  const clearFilters = () => {
    setParams({ badges: [], sort: "default" });
  };

  const filteredProviders = useMemo(() => {
    // Sponsors always first (in their original order)
    const sponsors = providers.filter((p) => p.sponsor);
    const nonSponsors = providers.filter((p) => !p.sponsor);

    const filtered =
      badges.length === 0
        ? nonSponsors
        : nonSponsors.filter((provider) =>
            badges.every((filter) => provider.badges.includes(filter)),
          );

    const sorted = [...filtered].sort((a, b) => {
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

    return [...sponsors, ...sorted];
  }, [badges, sort, summaries]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter by type</span>
        {(badges.length > 0 || sort !== "default") && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
          >
            Clear
          </button>
        )}
      </div>
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
                onClick={() => setParams({ sort: option })}
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
      <div className="flex flex-wrap gap-2">
        {FILTER_BADGES.map((badge) => {
          const config = BADGE_CONFIG[badge];
          const isActive = badges.includes(badge);
          return (
            <button
              type="button"
              key={badge}
              onClick={() => toggleFilter(badge)}
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
        {(badges.length > 0 || sort !== "default") && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {badges.length + (sort !== "default" ? 1 : 0)}
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
      <div className="flex-1">
        {filteredProviders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No providers match the selected filters. Try removing some
              filters.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.name}
                provider={provider}
                reviewSummary={
                  summaries[provider.slug] ??
                  initialSummaries[provider.slug] ?? {
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
        )}
      </div>
    </div>
  );
}

function GetProxiesClient({
  initialSummaries,
}: {
  initialSummaries: Record<string, ReviewSummary>;
}) {
  return (
    <main className="px-4 py-12 w-full max-w-(--fd-layout-width) mx-auto space-y-10">
      <div className="space-y-4 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get Proxies
        </h1>
        <p className="text-lg text-muted-foreground">
          High-quality proxies help distribute your load tests and avoid rate
          limits. Here are trusted providers we recommend.
        </p>
        <p className="text-sm text-muted-foreground">
          <BookOpen className="inline h-4 w-4 align-text-bottom" /> For more
          information on how to use proxies with SoulFire, read the{" "}
          <Link
            to="/docs/$"
            params={{ _splat: "how-to/import-proxies" }}
            className="underline hover:text-foreground"
          >
            Proxy Guide
          </Link>
          .
        </p>
      </div>

      <ReviewTurnstileProvider>
        <Suspense>
          <MainContent initialSummaries={initialSummaries} />
        </Suspense>
      </ReviewTurnstileProvider>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">
            Common questions about proxies for SoulFire
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {proxiesFaqItems.map((item, i) => (
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
          <strong>Disclosure:</strong> This page contains affiliate links. When
          you purchase through these links, we may earn a commission at no extra
          cost to you. These commissions help fund the development of SoulFire.
        </p>
        <p className="text-sm text-muted-foreground">
          Inaccurate information or broken links? Submit a pull request on{" "}
          <a
            href="https://github.com/soulfiremc-com/soulfiremc.com/edit/main/src/lib/proxies-data.tsx"
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

const proxiesPageLoader = createServerFn({ method: "GET" }).handler(
  async () => {
    const reviewSummaries = await getReviewSummaries(
      "proxy",
      PROVIDERS.map((provider) => provider.slug),
    ).catch(
      () =>
        ({}) as Record<
          string,
          { averageRating: number | null; reviewCount: number }
        >,
    );

    const faqJsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: proxiesFaqItems.map((item) => ({
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
      "@id": "https://soulfiremc.com/get-proxies#breadcrumb",
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
          name: "Get Proxies",
          item: "https://soulfiremc.com/get-proxies",
        },
      ],
    };

    const pageJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Get Proxies",
      description:
        "Best proxy providers for Minecraft bot testing. Compare residential, datacenter, ISP, and mobile proxies.",
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

    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": "https://soulfiremc.com/get-proxies#provider-list",
      name: "Proxy Providers for SoulFire",
      description:
        "Trusted proxy providers for Minecraft bot testing with SoulFire. Compare residential, datacenter, ISP, and mobile proxies.",
      numberOfItems: PROVIDERS.length,
      itemListElement: PROVIDERS.map((provider, index) => {
        const aggregateRating = getAggregateRatingJsonLd(
          reviewSummaries[provider.slug] ?? {
            averageRating: null,
            reviewCount: 0,
          },
        );

        return {
          "@type": "ListItem",
          position: index + 1,
          url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
          item: {
            "@type": "Product",
            name: provider.name,
            description: provider.summary,
            url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
            ...(aggregateRating && { aggregateRating }),
          },
        };
      }),
    };

    return {
      breadcrumbJsonLd: JSON.stringify(breadcrumbJsonLd),
      faqJsonLd: JSON.stringify(faqJsonLd),
      itemListJsonLd: JSON.stringify(itemListJsonLd),
      pageJsonLd: JSON.stringify(pageJsonLd),
      reviewSummaries,
    };
  },
);

export const Route = createFileRoute("/get-proxies/")({
  validateSearch: validateProxiesSearch,
  head: () => ({
    meta: getPageMeta({
      title: "Get Proxies - SoulFire",
      description:
        "Best proxy providers for Minecraft bot testing. Compare residential, datacenter, ISP, and mobile proxies. Free tiers available, with coupon codes and bulk pricing from top providers.",
      path: "/get-proxies",
      imageUrl: "/og/site/get-proxies/image.webp",
      imageAlt: "SoulFire proxy providers page preview",
    }),
    links: getCanonicalLinks("/get-proxies"),
  }),
  loader: async () => proxiesPageLoader(),
  component: GetProxiesPage,
});

function GetProxiesPage() {
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
      <GetProxiesClient initialSummaries={data.reviewSummaries} />
    </SiteShell>
  );
}
