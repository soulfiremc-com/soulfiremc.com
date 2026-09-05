import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Code,
  Download,
  ExternalLink,
  User,
} from "lucide-react";
import { Suspense } from "react";
import type {
  BreadcrumbList,
  SoftwareApplication,
  WebPage,
  WithContext,
} from "schema-dts";
import { GallerySection } from "@/components/gallery-section";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { JsonLd } from "@/components/json-ld";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { SiteShell } from "@/components/site-shell";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getResourcePageImage } from "@/lib/og";
import {
  BADGE_CONFIG,
  type Badge,
  getResourceBySlug,
  type Resource,
} from "@/lib/resources-data";
import {
  emptyReviewSummary,
  getAggregateRatingJsonLd,
  getReviewJsonLd,
} from "@/lib/review-core";
import { reviewsQueryOptions } from "@/lib/reviews-query";
import { validateReviewsSearch } from "@/lib/reviews-search-params";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

type ResourceDetailPageData = {
  breadcrumbJsonLd: WithContext<BreadcrumbList>;
  pageJsonLd: WithContext<WebPage>;
  resource: Resource;
  reviewsPage: number;
  softwareJsonLd: WithContext<SoftwareApplication>;
};

function ResourceLogo({ resource }: { resource: Resource }) {
  if (resource.logo) {
    return (
      <img
        src={resource.logo}
        alt={`${resource.name} logo`}
        className="size-full object-contain p-3"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-4xl font-bold text-primary">
      {resource.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ResourceBadge({ badge }: { badge: Badge }) {
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

function ResourceStructuredData({
  resource,
  reviewsPage,
  softwareJsonLd,
}: Pick<
  ResourceDetailPageData,
  "resource" | "reviewsPage" | "softwareJsonLd"
>) {
  const { data } = useSuspenseQuery(
    reviewsQueryOptions({
      itemType: "resource",
      slugs: [resource.slug],
      includeWrittenReviews: true,
      reviewsPage,
    }),
  );
  const reviewSummary = data.summaries[resource.slug] ?? emptyReviewSummary();
  const aggregateRating = getAggregateRatingJsonLd(reviewSummary);
  const reviewJsonLd = data.writtenReviews
    ? getReviewJsonLd(data.writtenReviews.entries)
    : undefined;
  const enrichedSoftwareJsonLd = {
    ...softwareJsonLd,
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewJsonLd ? { review: reviewJsonLd } : {}),
  } satisfies WithContext<SoftwareApplication>;

  return <JsonLd data={enrichedSoftwareJsonLd} />;
}

function ResourceDetailPageContent({
  breadcrumbJsonLd,
  pageJsonLd,
  resource,
  reviewsPage,
  softwareJsonLd,
}: ResourceDetailPageData) {
  const reviewsQuery = useQuery(
    reviewsQueryOptions({
      itemType: "resource",
      slugs: [resource.slug],
      includeWrittenReviews: true,
      reviewsPage,
    }),
  );
  const reviewSummary =
    reviewsQuery.data?.summaries[resource.slug] ?? emptyReviewSummary();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <JsonLd data={pageJsonLd} />
      <Suspense fallback={<JsonLd data={softwareJsonLd} />}>
        <ResourceStructuredData
          resource={resource}
          reviewsPage={reviewsPage}
          softwareJsonLd={softwareJsonLd}
        />
      </Suspense>
      <JsonLd data={breadcrumbJsonLd} />

      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          to="/resources"
          className="transition-colors hover:text-foreground"
        >
          Resources
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{resource.name}</span>
      </nav>

      <Card className="gap-5 p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
            <ResourceLogo resource={resource} />
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight">
                {resource.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                {resource.author}
              </span>
              {resource.version ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Code className="h-3.5 w-3.5" />v{resource.version}
                </span>
              ) : null}
              {resource.startDate ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Since {resource.startDate}
                </span>
              ) : null}
            </div>
            <p className="text-lg text-muted-foreground">
              {resource.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {resource.badges.map((badge) => (
                <ResourceBadge key={badge} badge={badge} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  <Download data-icon="inline-start" />
                  Download {resource.name}
                </a>
              </Button>
              {resource.sourceUrl ? (
                <Button variant="outline" size="lg" asChild>
                  <a
                    href={resource.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Source
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              ) : null}
              <ReviewSummaryBadge summary={reviewSummary} />
            </div>
          </div>
        </div>
      </Card>

      <ItemReviewsSection itemType="resource" slug={resource.slug} />

      {resource.gallery && resource.gallery.length > 0 ? (
        <GallerySection images={resource.gallery} />
      ) : null}

      <Button
        asChild
        variant="ghost"
        className="self-start text-muted-foreground"
      >
        <Link to="/resources">
          <ArrowLeft data-icon="inline-start" />
          Browse all resources
        </Link>
      </Button>
    </main>
  );
}

function getResourceDetailPageData({
  reviewsPage,
  slug,
}: {
  reviewsPage: number;
  slug: string;
}): ResourceDetailPageData {
  const resource = getResourceBySlug(slug);
  if (!resource) {
    throw notFound();
  }

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `https://soulfiremc.com/resources/${resource.slug}#software`,
    name: resource.name,
    description: resource.description,
    applicationCategory: resource.category === "plugin" ? "Plugin" : "Script",
    author: { "@type": "Person", name: resource.author },
    ...(resource.version && { softwareVersion: resource.version }),
    ...(resource.startDate && { dateCreated: resource.startDate }),
    image: resource.logo
      ? `https://soulfiremc.com${resource.logo}`
      : "https://soulfiremc.com/logo.png",
    url: `https://soulfiremc.com/resources/${resource.slug}`,
    downloadUrl: resource.url,
    ...(resource.sourceUrl && { sameAs: resource.sourceUrl }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://soulfiremc.com/resources/${resource.slug}#breadcrumb`,
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
        name: "Resources",
        item: "https://soulfiremc.com/resources",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: resource.name,
        item: `https://soulfiremc.com/resources/${resource.slug}`,
      },
    ],
  };

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `https://soulfiremc.com/resources/${resource.slug}#webpage`,
    name: `${resource.name} - SoulFire ${resource.category === "plugin" ? "Plugin" : "Script"}`,
    description: resource.description,
    url: `https://soulfiremc.com/resources/${resource.slug}`,
    inLanguage: "en-US",
    breadcrumb: {
      "@id": `https://soulfiremc.com/resources/${resource.slug}#breadcrumb`,
    },
    mainEntity: {
      "@id": `https://soulfiremc.com/resources/${resource.slug}#software`,
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
    resource,
    reviewsPage,
    softwareJsonLd: JSON.parse(JSON.stringify(softwareJsonLd)),
  };
}

export const Route = createFileRoute("/resources/$slug")({
  validateSearch: validateReviewsSearch,
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage ?? 1,
  }),
  loader: ({ context, deps, params }) => {
    const data = getResourceDetailPageData({
      reviewsPage: deps.reviewsPage,
      slug: params.slug,
    });
    void context.queryClient.prefetchQuery(
      reviewsQueryOptions({
        itemType: "resource",
        slugs: [data.resource.slug],
        includeWrittenReviews: true,
        reviewsPage: data.reviewsPage,
      }),
    );
    return data;
  },
  head: ({ loaderData }) => {
    const data = loaderData;

    if (!data) {
      return {
        meta: [],
      };
    }

    return {
      meta: getPageMeta({
        title: `${data.resource.name} - SoulFire ${data.resource.category === "plugin" ? "Plugin" : "Script"}`,
        description: data.resource.description,
        path: `/resources/${data.resource.slug}`,
        imageUrl: getResourcePageImage(data.resource.slug).url,
        imageAlt: `${data.resource.name} preview`,
      }),
      links: getCanonicalLinks(`/resources/${data.resource.slug}`),
    };
  },
  component: ResourceDetailPage,
});

function ResourceDetailPage() {
  const data = Route.useLoaderData();

  return (
    <SiteShell>
      <ResourceDetailPageContent {...data} />
    </SiteShell>
  );
}
