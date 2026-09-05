import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Calendar, ChevronRight, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import type {
  BreadcrumbList,
  ImageObject,
  Product,
  WebPage,
  WithContext,
} from "schema-dts";
import { CouponCode } from "@/components/coupon-code";
import { GallerySection } from "@/components/gallery-section";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { JsonLd } from "@/components/json-ld";
import { PaymentMethods } from "@/components/payment-methods";
import { ProviderThemeDecoration } from "@/components/provider-theme-decoration";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { SiteShell } from "@/components/site-shell";
import { SocialLinkButtons } from "@/components/social-link-buttons";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getProxyPageImage } from "@/lib/og";
import {
  BADGE_CONFIG,
  type Badge,
  getProviderBySlug,
  PROVIDER_THEMES,
  type Provider,
} from "@/lib/proxies-data";
import {
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  getReviewJsonLd,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { validateReviewsSearch } from "@/lib/reviews-search-params";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

type ProxyDetailPageData = {
  breadcrumbJsonLd: WithContext<BreadcrumbList>;
  pageJsonLd: WithContext<WebPage>;
  productJsonLd: WithContext<Product>;
  provider: Provider;
  reviewsPage: number;
};

function ProviderLogo({ provider }: { provider: Provider }) {
  if (provider.logo) {
    return (
      <img
        src={provider.logo}
        alt={`${provider.name} logo`}
        className="size-full object-contain p-3"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-4xl font-bold text-primary">
      {provider.name.charAt(0).toUpperCase()}
    </div>
  );
}

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
        <UiBadge
          variant="outline"
          className={cn(
            "cursor-help border-transparent",
            classNameOverride ?? config.className,
          )}
        >
          {config.icon}
          {config.label}
        </UiBadge>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm">
        <p>{config.description}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function ProxyProductStructuredData({
  productJsonLd,
  provider,
  reviewsPage,
}: Pick<ProxyDetailPageData, "productJsonLd" | "provider" | "reviewsPage">) {
  const { data } = useSuspenseQuery(
    reviewsQueryOptions({
      itemType: "proxy",
      slugs: [provider.slug],
      includeWrittenReviews: true,
      reviewsPage,
    }),
  );
  const reviewSummary = data.summaries[provider.slug] ?? emptyReviewSummary();
  const aggregateRating = getAggregateRatingJsonLd(reviewSummary);
  const reviewJsonLd = data.writtenReviews
    ? getReviewJsonLd(data.writtenReviews.entries)
    : undefined;
  const enrichedProductJsonLd = {
    ...productJsonLd,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewJsonLd ? { review: reviewJsonLd } : {}),
  } satisfies WithContext<Product>;

  return <JsonLd data={enrichedProductJsonLd} />;
}

function ProxyProviderPageContent({
  breadcrumbJsonLd,
  pageJsonLd,
  productJsonLd,
  provider,
  reviewsPage,
}: ProxyDetailPageData) {
  const theme = provider.theme ? PROVIDER_THEMES[provider.theme] : undefined;
  const reviewsQuery = useQuery(
    reviewsQueryOptions({
      itemType: "proxy",
      slugs: [provider.slug],
      includeWrittenReviews: true,
      reviewsPage,
    }),
  );
  const reviewSummary =
    reviewsQuery.data?.summaries[provider.slug] ?? emptyReviewSummary();

  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-8 px-4 py-12">
      <JsonLd data={pageJsonLd} />
      <Suspense fallback={<JsonLd data={productJsonLd} />}>
        <ProxyProductStructuredData
          productJsonLd={productJsonLd}
          provider={provider}
          reviewsPage={reviewsPage}
        />
      </Suspense>
      <JsonLd data={breadcrumbJsonLd} />

      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/get-proxies"
          className="transition-colors hover:text-foreground"
        >
          Get Proxies
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{provider.name}</span>
      </nav>

      <Card
        className={cn(
          "relative gap-5 overflow-hidden p-6",
          theme && ["ring-2", theme.ring, theme.bg, theme.cardShadow],
        )}
      >
        <ProviderThemeDecoration theme={provider.theme} />
        <div className="relative flex flex-col gap-6 sm:flex-row">
          <div
            className={cn(
              "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted",
              theme?.logo,
            )}
          >
            <ProviderLogo provider={provider} />
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">
                {provider.name}
              </h1>
              {provider.startDate ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Since {provider.startDate}
                </span>
              ) : null}
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
            <p className="text-lg text-muted-foreground">{provider.summary}</p>
            {provider.couponCode ? (
              <CouponCode
                code={provider.couponCode}
                discount={provider.couponDiscount}
              />
            ) : null}
            <PaymentMethods methods={provider.paymentMethods} />
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className={theme?.primaryButton}>
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  Get Proxies
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
              <ReviewSummaryBadge summary={reviewSummary} />
            </div>
            {provider.socialLinks?.length ? (
              <div className="flex flex-wrap gap-2">
                <SocialLinkButtons
                  links={provider.socialLinks}
                  className={theme?.secondaryButton}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <ItemReviewsSection itemType="proxy" slug={provider.slug} />

      {provider.gallery && provider.gallery.length > 0 ? (
        <GallerySection images={provider.gallery} />
      ) : null}

      <Button
        asChild
        variant="ghost"
        className="self-start text-muted-foreground"
      >
        <Link to="/get-proxies">
          <ArrowLeft data-icon="inline-start" />
          Browse all proxy providers
        </Link>
      </Button>
    </main>
  );
}

function getProxyDetailPageData({
  reviewsPage,
  slug,
}: {
  reviewsPage: number;
  slug: string;
}): ProxyDetailPageData {
  const provider = getProviderBySlug(slug);
  if (!provider) {
    throw notFound();
  }

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://soulfiremc.com/get-proxies/${provider.slug}#product`,
    name: provider.name,
    description: provider.summary,
    image: provider.logo
      ? `https://soulfiremc.com${provider.logo}`
      : "https://soulfiremc.com/logo.png",
    brand: {
      "@type": "Brand",
      name: provider.name,
    },
    url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
    category: "Proxy Service",
    ...(provider.startDate && { dateCreated: provider.startDate }),
    ...(provider.gallery &&
      provider.gallery.length > 0 && {
        image: provider.gallery.map(
          (img): ImageObject => ({
            "@type": "ImageObject",
            url: `https://soulfiremc.com${img.src}`,
            name: img.alt,
          }),
        ),
      }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://soulfiremc.com/get-proxies/${provider.slug}#breadcrumb`,
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
      {
        "@type": "ListItem",
        position: 3,
        name: provider.name,
        item: `https://soulfiremc.com/get-proxies/${provider.slug}`,
      },
    ],
  };

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `https://soulfiremc.com/get-proxies/${provider.slug}#webpage`,
    name: `${provider.name} - Proxy Provider for SoulFire`,
    description: provider.summary,
    url: `https://soulfiremc.com/get-proxies/${provider.slug}`,
    inLanguage: "en-US",
    breadcrumb: {
      "@id": `https://soulfiremc.com/get-proxies/${provider.slug}#breadcrumb`,
    },
    mainEntity: {
      "@id": `https://soulfiremc.com/get-proxies/${provider.slug}#product`,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "SoulFire",
      url: "https://soulfiremc.com",
    },
  };

  return {
    breadcrumbJsonLd: JSON.parse(JSON.stringify(breadcrumbJsonLd)),
    pageJsonLd: JSON.parse(JSON.stringify(pageJsonLd)),
    productJsonLd: JSON.parse(JSON.stringify(productJsonLd)),
    provider,
    reviewsPage,
  };
}

export const Route = createFileRoute("/get-proxies/$slug")({
  validateSearch: validateReviewsSearch,
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage ?? 1,
  }),
  loader: ({ context, deps, params }) => {
    const data = getProxyDetailPageData({
      reviewsPage: deps.reviewsPage,
      slug: params.slug,
    });
    void context.queryClient.prefetchQuery(
      reviewsQueryOptions({
        itemType: "proxy",
        slugs: [data.provider.slug],
        includeWrittenReviews: true,
        reviewsPage: data.reviewsPage,
      }),
    );
    return data;
  },
  head: ({ loaderData }) => {
    const data = loaderData;

    if (!data) {
      return { meta: [] };
    }

    return {
      meta: getPageMeta({
        title: `${data.provider.name} - Proxy Provider for SoulFire`,
        description: data.provider.summary,
        path: `/get-proxies/${data.provider.slug}`,
        imageUrl: getProxyPageImage(data.provider.slug).url,
        imageAlt: `${data.provider.name} preview`,
      }),
      links: getCanonicalLinks(`/get-proxies/${data.provider.slug}`),
    };
  },
  component: GetProxyDetailPage,
});

function GetProxyDetailPage() {
  const data = Route.useLoaderData();

  return (
    <SiteShell>
      <ProxyProviderPageContent {...data} />
    </SiteShell>
  );
}
