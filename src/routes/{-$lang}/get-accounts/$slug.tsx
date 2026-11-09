import { translate, resolveMessage, type MessageKey } from "@/lib/messages";
import { isLocale, localizePath, type Locale } from "@/lib/i18n";
import { formatProviderSince, localizeProviderData } from "@/lib/provider-i18n";
import { useT, useLocale } from "@/lib/i18n-react";
import { Schema } from "effect";
import { discordEmbedScript } from "@/lib/discord-embed";
import { SiDiscord, SiTrustpilot } from "@icons-pack/react-simple-icons";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  notFound,
  stripSearchParams,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ExternalLink,
  Globe,
  Users,
} from "lucide-react";
import { Suspense } from "react";
import type { BreadcrumbList, Product, WebPage, WithContext } from "schema-dts";
import { CouponCode } from "@/components/coupon-code";
import { GallerySection } from "@/components/gallery-section";
import { Image } from "@/components/image";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { JsonLd } from "@/components/json-ld";
import { PaymentMethods } from "@/components/payment-methods";
import { ProviderThemeDecoration } from "@/components/provider-theme-decoration";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BADGE_CONFIG,
  type Badge,
  CATEGORY_CONFIG,
  getDiscordInviteUrl,
  getShopBySlug,
  PROVIDER_THEMES,
  PROVIDERS,
  type Provider,
  type Shop,
} from "@/lib/accounts-data";
import { getListingOffer, getShopAggregateOffer } from "@/lib/accounts-offers";
import {
  accountDiscordInviteQueryOptions,
  accountLiveShopDataQueryOptions,
} from "@/lib/accounts-queries";
import type { DiscordInviteResponse } from "@/lib/discord";
import { getAccountPageImage } from "@/lib/og";
import {
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  getReviewJsonLd,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { reviewsSearchSchema } from "@/lib/reviews-search-params";
import { useHydratedQueryResult } from "@/hooks/use-hydrated-query-result";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

function DiscordMemberBadge({
  info,
  pending,
}: {
  info: DiscordInviteResponse | null | undefined;
  pending: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  if (pending) {
    return (
      <Skeleton
        aria-label={t("providers.accounts.loadingDiscordMemberCount")}
        className="h-5 w-16"
      />
    );
  }

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

type AccountDetailPageData = {
  breadcrumbJsonLd: WithContext<BreadcrumbList>;
  pageJsonLd: WithContext<WebPage>;
  productJsonLd: WithContext<Product>;
  providers: Provider[];
  reviewsPage: number;
  shop: Shop;
};

function getAccountDetailPageData({
  reviewsPage,
  slug,
  locale,
}: {
  reviewsPage: number;
  slug: string;
  locale: Locale;
}): AccountDetailPageData {
  const shop = getShopBySlug(slug);
  if (!shop) {
    throw notFound();
  }

  const providers = PROVIDERS.filter((provider) => provider.slug === shop.slug);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#product`,
    name: shop.name,
    description: providers
      .map((provider) => translate(locale, provider.summary))
      .join(" "),
    image: shop.logo
      ? `https://soulfiremc.com${shop.logo}`
      : "https://soulfiremc.com/logo.png",
    brand: {
      "@type": "Brand",
      name: shop.name,
    },
    url: `https://soulfiremc.com/get-accounts/${shop.slug}`,
    category: "providers.accounts.minecraftAccounts",
    ...(shop.startDate && { dateCreated: shop.startDate }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://soulfiremc.com/get-accounts/${shop.slug}#breadcrumb`,
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
    name: translate(locale, "providers.accounts.minecraftAltShop", {
      provider: shop.name,
    }),
    description: providers
      .map((provider) => translate(locale, provider.summary))
      .join(" "),
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
    breadcrumbJsonLd: localizeProviderData(
      JSON.parse(JSON.stringify(breadcrumbJsonLd)),
      locale,
    ),
    pageJsonLd: localizeProviderData(
      JSON.parse(JSON.stringify(pageJsonLd)),
      locale,
    ),
    productJsonLd: localizeProviderData(
      JSON.parse(JSON.stringify(productJsonLd)),
      locale,
    ),
    providers,
    reviewsPage,
    shop,
  };
}

function AccountProductSeoEnrichment({
  data,
}: {
  data: AccountDetailPageData;
}) {
  const locale = useLocale();
  const { data: reviews } = useSuspenseQuery(
    reviewsQueryOptions({
      itemType: "account",
      slugs: [data.shop.slug],
      includeWrittenReviews: true,
      reviewsPage: data.reviewsPage,
    }),
  );
  const { data: liveShopData } = useSuspenseQuery(
    accountLiveShopDataQueryOptions(data.shop.slug),
  );
  const reviewSummary =
    reviews.summaries[data.shop.slug] ?? emptyReviewSummary();
  const aggregateRating = getAggregateRatingJsonLd(reviewSummary);
  const reviewJsonLd = reviews.writtenReviews
    ? getReviewJsonLd(reviews.writtenReviews.entries)
    : undefined;
  const aggregateOffer = getShopAggregateOffer(data.shop, liveShopData);
  const enrichedProductJsonLd = {
    ...data.productJsonLd,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewJsonLd ? { review: reviewJsonLd } : {}),
    ...(aggregateOffer
      ? { aggregateOffer: localizeProviderData(aggregateOffer, locale) }
      : {}),
  } satisfies WithContext<Product>;

  return <JsonLd data={enrichedProductJsonLd} />;
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

function ShopLogo({ src, name }: { src?: string; name: string }) {
  const t = useT();
  if (src) {
    return (
      <Image
        src={src}
        alt={t("providers.accounts.logo", { provider: name })}
        fill
        sizes="56px"
        breakpoints={[56, 112, 168]}
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

export const Route = createFileRoute("/{-$lang}/get-accounts/$slug")({
  validateSearch: Schema.toStandardSchemaV1(reviewsSearchSchema),
  search: {
    middlewares: [stripSearchParams({ reviewsPage: 1 })],
  },
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage,
  }),
  loader: ({ context, deps, params }) => {
    const data = getAccountDetailPageData({
      reviewsPage: deps.reviewsPage,
      slug: params.slug,
      locale: isLocale(params.lang) ? params.lang : "en",
    });
    void context.queryClient.prefetchQuery(
      accountLiveShopDataQueryOptions(data.shop.slug),
    );
    void context.queryClient.prefetchQuery(
      accountDiscordInviteQueryOptions(data.shop.slug),
    );
    void context.queryClient.prefetchQuery(
      reviewsQueryOptions({
        itemType: "account",
        slugs: [data.shop.slug],
        includeWrittenReviews: true,
        reviewsPage: data.reviewsPage,
      }),
    );
    return data;
  },
  head: ({ loaderData, params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    const t = (message: MessageKey, values?: Record<string, string | number>) =>
      translate(locale, message, values);
    const data = loaderData;

    if (!data) {
      return { meta: [] };
    }

    return {
      meta: getPageMeta({
        title: t("providers.accounts.minecraftAltShop", {
          provider: data.shop.name,
        }),
        description: data.providers
          .map((provider) => t(provider.summary))
          .join(" "),
        path: `/get-accounts/${data.shop.slug}`,
        locale,
        imageUrl: getAccountPageImage(data.shop.slug, locale).url,
        imageAlt: t("providers.accounts.preview", { provider: data.shop.name }),
      }),
      links: getCanonicalLinks(`/get-accounts/${data.shop.slug}`, locale),
      scripts: discordEmbedScript({
        title: data.shop.name,
        description: data.providers
          .map(
            (provider) =>
              `${t(provider.summary)} · ${resolveMessage(locale, provider.price)}${provider.couponCode ? ` · ${t("providers.accounts.coupon", { code: provider.couponCode })}` : ""}`,
          )
          .join("\n"),
        url: `https://soulfiremc.com${localizePath(`/get-accounts/${data.shop.slug}`, locale)}`,
        label: t("providers.accounts.viewProvider"),
        thumbnail: data.shop.logo
          ? new URL(data.shop.logo, "https://soulfiremc.com").href
          : undefined,
        links: [
          { label: t("providers.accounts.visitShop"), url: data.shop.url },
          ...(data.shop.discordUrl
            ? [{ label: "social.discord", url: data.shop.discordUrl }]
            : []),
        ],
      }),
    };
  },
  component: AccountDetailPage,
});

function AccountDetailPage() {
  const t = useT();
  const locale = useLocale();
  const data = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const setReviewPage = (reviewsPage: number) => {
    void navigate({
      search: (previous) => ({ ...previous, reviewsPage }),
      resetScroll: false,
    });
  };
  const theme = data.shop.theme ? PROVIDER_THEMES[data.shop.theme] : undefined;
  const affiliateBadgeClassName =
    data.shop.theme === "localts" ? theme?.badge : undefined;
  const discordInviteUrl = getDiscordInviteUrl(data.shop);
  const reviewsQuery = useHydratedQueryResult(
    useQuery(
      reviewsQueryOptions({
        itemType: "account",
        slugs: [data.shop.slug],
        includeWrittenReviews: true,
        reviewsPage: data.reviewsPage,
      }),
    ),
  );
  const reviewSummary =
    reviewsQuery.data?.summaries[data.shop.slug] ?? emptyReviewSummary();
  const liveShopDataQuery = useHydratedQueryResult(
    useQuery(accountLiveShopDataQueryOptions(data.shop.slug)),
  );
  const discordInviteQuery = useHydratedQueryResult(
    useQuery(accountDiscordInviteQueryOptions(data.shop.slug)),
  );

  return (
    <SiteShell>
      <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-8 px-4 py-12">
        <JsonLd data={data.pageJsonLd} />
        <Suspense fallback={<JsonLd data={data.productJsonLd} />}>
          <AccountProductSeoEnrichment data={data} />
        </Suspense>
        <JsonLd data={data.breadcrumbJsonLd} />

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            to="/{-$lang}"
            className="transition-colors hover:text-foreground"
          >
            {t("nav.home")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            to="/{-$lang}/get-accounts"
            className="transition-colors hover:text-foreground"
          >
            {t("common.getAccounts")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{data.shop.name}</span>
        </nav>

        <Card
          className={cn(
            "relative gap-5 overflow-hidden p-6",
            /* oxlint-disable shadcn/require-static-classes -- Provider themes are a finite class map. */
            theme && ["ring-2", theme.ring, theme.bg, theme.cardShadow],
            /* oxlint-enable shadcn/require-static-classes */
          )}
        >
          <ProviderThemeDecoration theme={data.shop.theme} />
          <div className="relative flex flex-col gap-6 sm:flex-row">
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
                    {t("providers.accounts.since", {
                      date: formatProviderSince(data.shop.startDate, locale),
                    })}
                  </span>
                ) : null}
                <DiscordMemberBadge
                  info={discordInviteQuery.data}
                  pending={discordInviteQuery.isPending}
                />
              </div>
              <p className="text-lg text-muted-foreground">
                {data.providers
                  .map((provider) => t(provider.summary))
                  .join(" ")}
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  ...new Set(
                    data.providers.flatMap((provider) => provider.badges),
                  ),
                ].map((badge) => (
                  <ProviderBadge
                    key={badge}
                    badge={badge}
                    classNameOverride={
                      badge === "affiliate"
                        ? affiliateBadgeClassName
                        : undefined
                    }
                  />
                ))}
              </div>
              <PaymentMethods methods={data.shop.paymentMethods} />

              <div className="flex flex-wrap gap-2">
                <Button
                  render={
                    <a
                      href={data.shop.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {t("common.getAccounts")}
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  }
                  nativeButton={false}
                  size="lg"
                  className={theme?.primaryButton}
                />
                {data.shop.websiteUrl ? (
                  <Button
                    render={
                      <a
                        href={data.shop.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        {t("providers.website")}
                        <Globe data-icon="inline-end" />
                      </a>
                    }
                    nativeButton={false}
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  />
                ) : null}
                {discordInviteUrl ? (
                  <Button
                    render={
                      <a
                        href={discordInviteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        Discord
                        <SiDiscord data-icon="inline-end" />
                      </a>
                    }
                    nativeButton={false}
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  />
                ) : null}
                {data.shop.trustpilotUrl ? (
                  <Button
                    render={
                      <a
                        href={data.shop.trustpilotUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        Trustpilot
                        <SiTrustpilot data-icon="inline-end" />
                      </a>
                    }
                    nativeButton={false}
                    variant="secondary"
                    size="lg"
                    className={theme?.secondaryButton}
                  />
                ) : null}
                <SocialLinks
                  links={data.shop.socialLinks}
                  className={
                    theme?.secondaryButton /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */
                  }
                />
                <ReviewSummaryBadge summary={reviewSummary} />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {data.providers.map((provider) => {
            const listing = data.shop.listings[provider.category];
            if (!listing) {
              return null;
            }

            const liveOffer = getListingOffer(
              data.shop,
              provider.category,
              provider.priceValue,
              liveShopDataQuery.data,
            );

            return (
              <Card key={provider.category} className="gap-4 p-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold">
                    {t(CATEGORY_CONFIG[provider.category].label)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(CATEGORY_CONFIG[provider.category].description)}
                  </p>
                </div>
                <div className="text-3xl font-bold">
                  {resolveMessage(locale, provider.price)}
                </div>
                {provider.priceDetails ? (
                  <p className="text-sm text-muted-foreground">
                    {t(provider.priceDetails)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {listing.badges.map((badge) => (
                    <ProviderBadge
                      key={badge}
                      badge={badge}
                      classNameOverride={
                        badge === "affiliate"
                          ? affiliateBadgeClassName
                          : undefined
                      }
                    />
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
                <div className="text-sm text-muted-foreground">
                  {t("providers.accounts.availability")}{" "}
                  {liveShopDataQuery.isPending ? (
                    <Skeleton className="inline-block h-4 w-20 align-middle" />
                  ) : liveOffer.availability ===
                    "https://schema.org/OutOfStock" ? (
                    "Out of stock"
                  ) : liveOffer.availability ? (
                    "In stock"
                  ) : (
                    "Check availability"
                  )}
                </div>
                <Button
                  render={
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      {t("providers.accounts.buy", {
                        category: t(CATEGORY_CONFIG[provider.category].label),
                      })}
                      <ExternalLink data-icon="inline-end" />
                    </a>
                  }
                  nativeButton={false}
                />
              </Card>
            );
          })}
        </div>

        <ItemReviewsSection
          itemType="account"
          onReviewPageChange={setReviewPage}
          reviewPage={data.reviewsPage}
          slug={data.shop.slug}
        />

        {data.shop.gallery && data.shop.gallery.length > 0 ? (
          <GallerySection images={data.shop.gallery} />
        ) : null}

        <Button
          render={
            <Link to="/{-$lang}/get-accounts">
              <ArrowLeft data-icon="inline-start" />
              {t("providers.accounts.browseAllAccountProviders")}
            </Link>
          }
          nativeButton={false}
          variant="ghost"
          className="self-start text-muted-foreground"
        />
      </main>
    </SiteShell>
  );
}
