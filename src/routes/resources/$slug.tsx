import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Code,
  Download,
  ExternalLink,
  User,
  X,
} from "lucide-react";
import { Suspense, useState } from "react";
import type {
  BreadcrumbList,
  SoftwareApplication,
  WebPage,
  WithContext,
} from "schema-dts";
import { ItemReviewsSection } from "@/components/item-reviews-section";
import { JsonLd } from "@/components/json-ld";
import { ReviewSummaryBadge } from "@/components/review-summary-badge";
import { SiteShell } from "@/components/site-shell";
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
import { getResourcePageImage } from "@/lib/og";
import {
  BADGE_CONFIG,
  type Badge,
  getResourceBySlug,
  type Resource,
} from "@/lib/resources-data";
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

type ResourceDetailPageData = {
  breadcrumbJsonLd: WithContext<BreadcrumbList>;
  pageJsonLd: WithContext<WebPage>;
  resource: Resource;
  reviewSummary: ReviewSummary;
  softwareJsonLd: WithContext<SoftwareApplication>;
  writtenReviews: PaginatedPublicReviewRecords;
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

function ResourceDetailPageContent({
  breadcrumbJsonLd,
  pageJsonLd,
  resource,
  reviewSummary,
  softwareJsonLd,
  writtenReviews,
}: ResourceDetailPageData) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <JsonLd data={pageJsonLd} />
      <JsonLd data={softwareJsonLd} />
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

      <Suspense>
        <ItemReviewsSection
          itemType="resource"
          slug={resource.slug}
          initialSummary={reviewSummary}
          initialWrittenReviews={writtenReviews}
        />
      </Suspense>

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

const resourceDetailLoader = createServerFn({ method: "GET" })
  .inputValidator((value: { reviewsPage: number; slug: string }) => value)
  .handler(async ({ data }) => {
    const resource = getResourceBySlug(data.slug);
    if (!resource) {
      throw notFound();
    }

    const reviewSummaries = await getReviewSummaries("resource", [
      resource.slug,
    ]).catch(
      () =>
        ({}) as Record<
          string,
          { averageRating: number | null; reviewCount: number }
        >,
    );
    const reviewSummary =
      reviewSummaries[resource.slug] ?? emptyReviewSummary();
    const writtenReviews = await getPaginatedWrittenReviews(
      "resource",
      resource.slug,
      reviewSummary.reviewCount,
      { page: data.reviewsPage },
    ).catch(() => ({
      entries: [],
      page: 1,
      pageSize: 8,
      totalCount: 0,
      totalPages: 0,
    }));

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
      ...(getAggregateRatingJsonLd(reviewSummary) && {
        aggregateRating: getAggregateRatingJsonLd(reviewSummary),
      }),
      ...(getReviewJsonLd(writtenReviews.entries) && {
        review: getReviewJsonLd(writtenReviews.entries),
      }),
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
      reviewSummary,
      softwareJsonLd: JSON.parse(JSON.stringify(softwareJsonLd)),
      writtenReviews: JSON.parse(JSON.stringify(writtenReviews)),
    };
  });

export const Route = createFileRoute("/resources/$slug")({
  validateSearch: validateReviewsSearch,
  loaderDeps: ({ search }) => ({
    reviewsPage: search.reviewsPage ?? 1,
  }),
  loader: async ({ deps, params }) =>
    resourceDetailLoader({
      data: { reviewsPage: deps.reviewsPage, slug: params.slug },
    }),
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
