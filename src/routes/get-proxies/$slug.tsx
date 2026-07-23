import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { Suspense, useState } from "react";
import type {
  BreadcrumbList,
  ImageObject,
  Product,
  WebPage,
  WithContext,
} from "schema-dts";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { JsonLd } from "@/components/json-ld";
import { PaymentMethods } from "@/components/payment-methods";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { SiteShell } from "@/components/site-shell";
import { SocialLinkButtons } from "@/components/social-link-buttons";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type Provider,
  SPONSOR_THEMES,
} from "@/lib/proxies-data";
import type {
  PaginatedPublicReviewRecords,
  ReviewSummary,
} from "@/lib/review-core";
import {
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  getPaginatedWrittenReviews,
  getReviewJsonLd,
  getReviewSummaries,
} from "@/lib/reviews";
import { validateReviewsSearch } from "@/lib/reviews-search-params";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

function GallerySection({
  images,
}: {
  images: { src: string; alt: string }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const prev = () =>
    setOpenIndex((i) =>
      i !== null ? (i - 1 + images.length) % images.length : null,
    );
  const next = () =>
    setOpenIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Gallery</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-white/10 bg-black/90 p-2 shadow-2xl sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-[calc(100vw-3rem)] sm:p-4"
        >
          <DialogTitle className="sr-only">
            {openIndex !== null ? images[openIndex].alt : "Gallery image"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Image {openIndex !== null ? openIndex + 1 : 0} of {images.length}
          </DialogDescription>
          {openIndex !== null && (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black/40">
              <img
                src={images[openIndex].src}
                alt={images[openIndex].alt}
                className="size-full object-contain"
              />
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 z-10 h-11 w-11 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close gallery</span>
                </Button>
              </DialogClose>
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prev}
                    className="absolute left-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Previous image</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={next}
                    className="absolute right-3 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                    <span className="sr-only">Next image</span>
                  </Button>
                </>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 sm:p-4">
                <p className="max-w-[75%] text-sm text-white/80">
                  {images[openIndex].alt}
                </p>
                <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-white/75">
                  {openIndex + 1} / {images.length}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="text-muted-foreground hover:bg-pink-500/10"
        aria-label="Copy coupon code"
      >
        {copied ? <Check className="text-green-500" /> : <Copy />}
      </Button>
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

type ProxyDetailPageData = {
  breadcrumbJsonLd: WithContext<BreadcrumbList>;
  pageJsonLd: WithContext<WebPage>;
  productJsonLd: WithContext<Product>;
  provider: Provider;
  reviewSummary: ReviewSummary;
  writtenReviews: PaginatedPublicReviewRecords;
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

function ProxyProviderPageContent({
  breadcrumbJsonLd,
  pageJsonLd,
  productJsonLd,
  provider,
  reviewSummary,
  writtenReviews,
}: ProxyDetailPageData) {
  const theme = provider.sponsorTheme
    ? SPONSOR_THEMES[provider.sponsorTheme]
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-8 px-4 py-12">
      <JsonLd data={pageJsonLd} />
      <JsonLd data={productJsonLd} />
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
        className={cn("gap-5 p-6", theme && ["ring-2", theme.ring, theme.bg])}
      >
        <div className="flex flex-col gap-6 sm:flex-row">
          <div
            className={cn(
              "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted",
              theme && ["ring-2", theme.ring],
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
              <Button asChild size="lg">
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
                <SocialLinkButtons links={provider.socialLinks} />
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Suspense>
        <ItemReviewsSection
          itemType="proxy"
          slug={provider.slug}
          initialSummary={reviewSummary}
          initialWrittenReviews={writtenReviews}
        />
      </Suspense>

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

const proxyDetailLoader = createServerFn({ method: "GET" })
  .validator((value: { reviewsPage: number; slug: string }) => value)
  .handler(async ({ data }) => {
    const provider = getProviderBySlug(data.slug);
    if (!provider) {
      throw notFound();
    }

    const reviewSummaries = await getReviewSummaries("proxy", [
      provider.slug,
    ]).catch(
      () =>
        ({}) as Record<
          string,
          { averageRating: number | null; reviewCount: number }
        >,
    );
    const reviewSummary =
      reviewSummaries[provider.slug] ?? emptyReviewSummary();
    const writtenReviews = await getPaginatedWrittenReviews(
      "proxy",
      provider.slug,
      reviewSummary.reviewCount,
      { page: data.reviewsPage },
    ).catch(() => ({
      entries: [],
      page: 1,
      pageSize: 8,
      totalCount: 0,
      totalPages: 0,
    }));

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
      ...(getAggregateRatingJsonLd(reviewSummary) && {
        aggregateRating: getAggregateRatingJsonLd(reviewSummary),
      }),
      ...(getReviewJsonLd(writtenReviews.entries) && {
        review: getReviewJsonLd(writtenReviews.entries),
      }),
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
      reviewSummary,
      writtenReviews: JSON.parse(JSON.stringify(writtenReviews)),
    };
  });

export const Route = createFileRoute("/get-proxies/$slug")({
  validateSearch: validateReviewsSearch,
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage ?? 1,
  }),
  loader: async ({ deps, params }) =>
    proxyDetailLoader({
      data: { reviewsPage: deps.reviewsPage, slug: params.slug },
    }),
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
