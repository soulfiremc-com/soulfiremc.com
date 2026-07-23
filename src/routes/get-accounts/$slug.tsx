import { SiDiscord, SiTrustpilot } from "@icons-pack/react-simple-icons";
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
  Globe,
  Users,
  X,
} from "lucide-react";
import { Suspense, useState } from "react";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { PaymentMethods } from "@/components/payment-methods";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { SiteShell } from "@/components/site-shell";
import {
  type SocialLink,
  SocialLinkButtons,
} from "@/components/social-link-buttons";
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
import {
  BADGE_CONFIG,
  type Badge,
  CATEGORY_CONFIG,
  type Category,
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDER_THEMES,
  PROVIDERS,
} from "@/lib/accounts-data";
import {
  getListingOffer,
  getLiveShopData,
  getShopAggregateOffer,
} from "@/lib/accounts-offers";
import { type DiscordInviteResponse, fetchDiscordInvite } from "@/lib/discord";
import { getAccountPageImage } from "@/lib/og";
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

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return num.toString();
}

function DiscordMemberBadge({ info }: { info: DiscordInviteResponse | null }) {
  if (!info?.approximate_member_count) {
    return (
      <UiBadge
        variant="outline"
        className="border-transparent bg-[#5865F2]/10 text-[#5865F2]/50"
      >
        <Users />
        unknown
      </UiBadge>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <UiBadge
          variant="outline"
          className="cursor-help border-transparent bg-[#5865F2]/10 text-[#5865F2]"
        >
          <Users />
          {formatNumber(info.approximate_member_count)}
        </UiBadge>
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

function LinkDiscountNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-pink-500/10 p-3">
      <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
        {message}
      </p>
    </div>
  );
}

const accountDetailLoader = createServerFn({ method: "GET" })
  .validator((value: { reviewsPage: number; slug: string }) => value)
  .handler(async ({ data }) => {
    const shop = getShopBySlug(data.slug);
    if (!shop) {
      throw notFound();
    }

    const providers = PROVIDERS.filter(
      (provider) => provider.slug === shop.slug,
    );
    const reviewSummaries = await getReviewSummaries("account", [
      shop.slug,
    ]).catch(
      () =>
        ({}) as Record<
          string,
          { averageRating: number | null; reviewCount: number }
        >,
    );
    const reviewSummary = reviewSummaries[shop.slug] ?? emptyReviewSummary();
    const writtenReviews = await getPaginatedWrittenReviews(
      "account",
      shop.slug,
      reviewSummary.reviewCount,
      { page: data.reviewsPage },
    ).catch(() => ({
      entries: [],
      page: 1,
      pageSize: 8,
      totalCount: 0,
      totalPages: 0,
    }));
    const liveShopData = await getLiveShopData(shop).catch(() => ({}));
    const discordInviteUrl = getDiscordInviteUrl(shop);
    const discordInvite = discordInviteUrl
      ? await fetchDiscordInvite(discordInviteUrl).catch(() => null)
      : null;

    const productJsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#product`,
      name: shop.name,
      description: providers.map((provider) => provider.summary).join(" "),
      image: shop.logo
        ? `https://soulfiremc.com${shop.logo}`
        : "https://soulfiremc.com/logo.png",
      brand: {
        "@type": "Brand",
        name: shop.name,
      },
      url: `https://soulfiremc.com/get-accounts/${shop.slug}`,
      category: "Minecraft Accounts",
      ...(shop.startDate && { dateCreated: shop.startDate }),
      ...(getAggregateRatingJsonLd(reviewSummary) && {
        aggregateRating: getAggregateRatingJsonLd(reviewSummary),
      }),
      ...(getReviewJsonLd(writtenReviews.entries) && {
        review: getReviewJsonLd(writtenReviews.entries),
      }),
      ...(getShopAggregateOffer(shop, liveShopData) && {
        aggregateOffer: getShopAggregateOffer(shop, liveShopData),
      }),
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#breadcrumb`,
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
        {
          "@type": "ListItem",
          position: 3,
          name: shop.name,
          item: `https://soulfiremc.com/get-accounts/${shop.slug}`,
        },
      ],
    };

    const pageJsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#webpage`,
      name: `${shop.name} - Minecraft Alt Shop`,
      description: providers.map((provider) => provider.summary).join(" "),
      url: `https://soulfiremc.com/get-accounts/${shop.slug}`,
      inLanguage: "en-US",
      breadcrumb: {
        "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#breadcrumb`,
      },
      mainEntity: {
        "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#product`,
      },
      isPartOf: {
        "@type": "WebSite",
        name: "SoulFire",
        url: "https://soulfiremc.com",
      },
    };

    return {
      breadcrumbJsonLd: JSON.stringify(breadcrumbJsonLd),
      discordInvite,
      liveShopData,
      pageJsonLd: JSON.stringify(pageJsonLd),
      productJsonLd: JSON.stringify(productJsonLd),
      providers,
      reviewSummary,
      shop,
      writtenReviews: JSON.parse(JSON.stringify(writtenReviews)),
    };
  });

function ProviderBadge({ badge }: { badge: Badge }) {
  const config = BADGE_CONFIG[badge];
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <UiBadge
          variant="outline"
          className={cn("cursor-help border-transparent", config.className)}
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

function ShopLogo({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} logo`}
        className="size-full object-contain p-3"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-4xl font-bold text-primary">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function SocialLinks({
  className,
  links,
}: {
  className?: string;
  links?: SocialLink[];
}) {
  if (!links?.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      <SocialLinkButtons links={links} className={className} />
    </div>
  );
}

export const Route = createFileRoute("/get-accounts/$slug")({
  validateSearch: validateReviewsSearch,
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage ?? 1,
  }),
  loader: async ({ deps, params }) =>
    accountDetailLoader({
      data: { reviewsPage: deps.reviewsPage, slug: params.slug },
    }),
  head: ({ loaderData }) => {
    const data = loaderData as any;

    if (!data) {
      return { meta: [] };
    }

    return {
      meta: getPageMeta({
        title: `${data.shop.name} - Minecraft Alt Shop`,
        description: data.providers
          .map((provider: any) => provider.summary)
          .join(" "),
        path: `/get-accounts/${data.shop.slug}`,
        imageUrl: getAccountPageImage(data.shop.slug).url,
        imageAlt: `${data.shop.name} preview`,
      }),
      links: getCanonicalLinks(`/get-accounts/${data.shop.slug}`),
    };
  },
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const data = Route.useLoaderData() as any;
  const theme = data.shop.theme ? PROVIDER_THEMES[data.shop.theme] : undefined;
  const discordInviteUrl = getDiscordInviteUrl(data.shop);

  return (
    <SiteShell>
      <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-8 px-4 py-12">
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
          dangerouslySetInnerHTML={{ __html: data.pageJsonLd }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
          dangerouslySetInnerHTML={{ __html: data.productJsonLd }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
          dangerouslySetInnerHTML={{ __html: data.breadcrumbJsonLd }}
        />

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            to="/get-accounts"
            className="transition-colors hover:text-foreground"
          >
            Get Accounts
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{data.shop.name}</span>
        </nav>

        <Card
          className={cn("gap-5 p-6", theme && ["ring-2", theme.ring, theme.bg])}
        >
          <div className="flex flex-col gap-6 sm:flex-row">
            <div
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted",
                theme?.logo,
              )}
            >
              <ShopLogo src={data.shop.logo} name={data.shop.name} />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">
                  {data.shop.name}
                </h1>
                {data.shop.startDate ? (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Since {data.shop.startDate}
                  </span>
                ) : null}
                <DiscordMemberBadge info={data.discordInvite} />
              </div>
              <p className="text-lg text-muted-foreground">
                {data.providers
                  .map((provider: any) => provider.summary)
                  .join(" ")}
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  ...new Set(
                    data.providers.flatMap((provider: any) => provider.badges),
                  ),
                ].map((badge: any) => (
                  <ProviderBadge key={badge} badge={badge} />
                ))}
              </div>
              <PaymentMethods methods={data.shop.paymentMethods} />

              <div className="flex flex-wrap gap-2">
                <Button asChild size="lg" className={theme?.primaryButton}>
                  <a
                    href={data.shop.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Get Accounts
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
                {data.shop.websiteUrl ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  >
                    <a
                      href={data.shop.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Website
                      <Globe data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
                {discordInviteUrl ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  >
                    <a
                      href={discordInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Discord
                      <SiDiscord data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
                {data.shop.trustpilotUrl ? (
                  <Button
                    asChild
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  >
                    <a
                      href={data.shop.trustpilotUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Trustpilot
                      <SiTrustpilot data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
                <SocialLinks
                  links={data.shop.socialLinks}
                  className={theme?.secondaryButton}
                />
                <ReviewSummaryBadge summary={data.reviewSummary} />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {data.providers.map((provider: any) => {
            const listing = data.shop.listings[provider.category as Category];
            if (!listing) {
              return null;
            }

            const liveOffer = getListingOffer(
              data.shop,
              provider.category,
              provider.priceValue,
              data.liveShopData,
            );

            return (
              <Card key={provider.category} className="gap-4 p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold">
                    {CATEGORY_CONFIG[provider.category as Category].label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORY_CONFIG[provider.category as Category].description}
                  </p>
                </div>
                <div className="text-3xl font-bold">{provider.price}</div>
                {provider.priceDetails ? (
                  <p className="text-sm text-muted-foreground">
                    {provider.priceDetails}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {listing.badges.map((badge: any) => (
                    <ProviderBadge key={badge} badge={badge} />
                  ))}
                </div>
                {provider.couponCode ? (
                  <CouponCode
                    code={provider.couponCode}
                    discount={provider.couponDiscount}
                  />
                ) : null}
                {provider.linkDiscountMessage ? (
                  <LinkDiscountNotice message={provider.linkDiscountMessage} />
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Availability:{" "}
                  {String(liveOffer.availability).includes("OutOfStock")
                    ? "Out of stock"
                    : "In stock"}
                </p>
                <Button asChild>
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Buy {CATEGORY_CONFIG[provider.category as Category].label}
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </Card>
            );
          })}
        </div>

        <Suspense>
          <ItemReviewsSection
            itemType="account"
            slug={data.shop.slug}
            initialSummary={data.reviewSummary}
            initialWrittenReviews={data.writtenReviews}
          />
        </Suspense>

        {data.shop.gallery && data.shop.gallery.length > 0 ? (
          <GallerySection images={data.shop.gallery} />
        ) : null}

        <Button
          asChild
          variant="ghost"
          className="self-start text-muted-foreground"
        >
          <Link to="/get-accounts">
            <ArrowLeft data-icon="inline-start" />
            Browse all account providers
          </Link>
        </Button>
      </main>
    </SiteShell>
  );
}
