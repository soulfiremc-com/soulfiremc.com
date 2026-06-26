import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Calendar,
  Code,
  Download,
  ExternalLink,
  Filter,
  ImageIcon,
  Star,
  User,
} from "lucide-react";
import {
  createStandardSchemaV1,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Suspense, useMemo, useState } from "react";
import { ReviewInlineActions } from "@/components/review-inline-actions";
import { ReviewTurnstileProvider } from "@/components/review-turnstile-provider";
import { SiteShell } from "@/components/site-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReviews } from "@/hooks/use-reviews";
import {
  BADGE_CONFIG,
  type Badge,
  CATEGORIES,
  type Category,
  FILTER_TAGS,
  type FilterableTag,
  RESOURCES,
  type Resource,
} from "@/lib/resources-data";
import type { ReviewSummary, UserReviewRecord } from "@/lib/review-core";
import { getAggregateRatingJsonLd, getReviewSummaries } from "@/lib/reviews";
import { parseAsNativeOrDelimitedArrayOf } from "@/lib/search-param-parsers";
import { getCanonicalLinks, getPageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const resourcesFaqItems: {
  question: string;
  answerHtml: string;
  answerElement: React.ReactNode;
}[] = [
  {
    question: "What are SoulFire plugins?",
    answerHtml:
      'SoulFire plugins are Fabric mods that extend the bot engine with low-level hooks, settings pages, Mixins, and direct Minecraft access. See the <a href="https://soulfiremc.com/docs/development">Development docs</a> for the full plugin authoring workflow.',
    answerElement: (
      <>
        SoulFire plugins are Fabric mods that extend the bot engine with
        low-level hooks, settings pages, Mixins, and direct Minecraft access.
        See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "development" }}
          className="underline text-primary"
        >
          Development docs
        </Link>{" "}
        for the full plugin authoring workflow.
      </>
    ),
  },
  {
    question: "How do I install a SoulFire plugin?",
    answerHtml:
      'Download the plugin JAR file, place it in SoulFire&apos;s <code>minecraft/mods</code> directory, and restart SoulFire. Use the <a href="https://soulfiremc.com/docs/how-to/install-plugins">install guide</a> for loading plugins and the <a href="https://soulfiremc.com/docs/development">Development docs</a> if you are building your own.',
    answerElement: (
      <>
        Download the plugin JAR file, place it in SoulFire&apos;s{" "}
        <code>minecraft/mods</code> directory, and restart SoulFire. Use the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "how-to/install-plugins" }}
          className="underline text-primary"
        >
          install guide
        </Link>{" "}
        for loading plugins and the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "development" }}
          className="underline text-primary"
        >
          Development docs
        </Link>{" "}
        if you are building your own.
      </>
    ),
  },
  {
    question: "What are SoulFire scripts?",
    answerHtml:
      "SoulFire scripts automate bot behavior with SoulFire&apos;s visual scripting system. You build flows from triggers, actions, logic, and data nodes in the editor, then run them directly inside SoulFire without writing a full plugin.",
    answerElement: (
      <>
        SoulFire scripts automate bot behavior with SoulFire&apos;s visual
        scripting system. You build flows from triggers, actions, logic, and
        data nodes in the editor, then run them directly inside SoulFire without
        writing a full plugin.
      </>
    ),
  },
  {
    question: "How can I share my plugin or script?",
    answerHtml:
      'Submit a pull request on <a href="https://github.com/soulfiremc-com/soulfiremc.com">GitHub</a> to add your resource to this page, or share it in the SoulFire Discord server.',
    answerElement: (
      <>
        Submit a pull request on{" "}
        <a
          href="https://github.com/soulfiremc-com/soulfiremc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary"
        >
          GitHub
        </a>{" "}
        to add your resource to this page, or share it in the SoulFire Discord
        server.
      </>
    ),
  },
  {
    question: "Are community resources safe to use?",
    answerHtml:
      "Always review the source code of any third-party plugin or script before using it. Prefer open-source resources where you can inspect the code. Only download from trusted sources and authors.",
    answerElement: (
      <>
        Always review the source code of any third-party plugin or script before
        using it. Prefer open-source resources where you can inspect the code.
        Only download from trusted sources and authors.
      </>
    ),
  },
];

const TAGS = [
  "combat",
  "farming",
  "utility",
  "movement",
  "building",
  "pvp",
  "survival",
  "minigame",
  "automation",
  "open-source",
] as const;

const SORT_OPTIONS = ["default", "best-rated"] as const;
const CATEGORY_VALUES = ["plugin", "script"] as const;

const resourcesSearchParams = {
  category: parseAsStringLiteral([...CATEGORY_VALUES]),
  tags: parseAsNativeOrDelimitedArrayOf(parseAsStringLiteral([...TAGS])),
  sort: parseAsStringLiteral([...SORT_OPTIONS]).withDefault("default"),
};

const validateResourcesSearch = createStandardSchemaV1(resourcesSearchParams, {
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

function ResourceLogo({ resource }: { resource: Resource }) {
  if (resource.logo) {
    return (
      <img
        src={resource.logo}
        alt={`${resource.name} logo`}
        className="size-full object-contain p-2"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary">
      {resource.name.charAt(0).toUpperCase()}
    </div>
  );
}

function ResourceCard({
  resource,
  reviewSummary,
  userReview,
  reviewPending,
  onRate,
  onClearRating,
}: {
  resource: Resource;
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
  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row gap-4 p-6">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <ResourceLogo resource={resource} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              <Link
                to="/resources/$slug"
                params={{ slug: resource.slug }}
                className="hover:underline"
              >
                {resource.name}
              </Link>
            </h3>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {resource.author}
            </span>
            {resource.version && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Code className="h-3 w-3" />v{resource.version}
              </span>
            )}
            {resource.startDate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Since {resource.startDate}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {resource.badges.map((badge) => (
                <ResourceBadge key={badge} badge={badge} />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground">{resource.description}</p>
          {resource.gallery && resource.gallery.length > 0 && (
            <Link
              to="/resources/$slug"
              params={{ slug: resource.slug }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              {resource.gallery.length} photo
              {resource.gallery.length !== 1 && "s"}
            </Link>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                <Download data-icon="inline-start" />
                Download
              </a>
            </Button>
            {resource.sourceUrl && (
              <Button variant="outline" asChild>
                <a
                  href={resource.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Source
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            )}
          </div>
          <ReviewInlineActions
            summary={reviewSummary}
            currentRating={userReview?.rating}
            pending={reviewPending}
            onRate={(rating) => onRate(resource.slug, rating)}
            onClear={() => onClearRating(resource.slug)}
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
  const resources = RESOURCES;
  const slugs = useMemo(() => resources.map((r) => r.slug), []);
  const { summaries, userReviews, pendingBySlug, upsertReview, deleteReview } =
    useReviews("resource", slugs, { initialSummaries });
  const [{ category, tags, sort }, setParams] = useQueryStates(
    resourcesSearchParams,
    {
      shallow: false,
    },
  );

  const clearFilters = () => {
    setParams({ category: null, tags: [], sort: "default" });
  };

  const activeFilterCount =
    tags.length +
    (category !== null && category !== undefined ? 1 : 0) +
    (sort !== "default" ? 1 : 0);

  const filteredResources = useMemo(() => {
    const filtered = resources.filter((resource) => {
      if (category && resource.category !== category) return false;
      if (
        tags.length > 0 &&
        !tags.every((tag) => resource.badges.includes(tag))
      )
        return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
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
  }, [category, sort, tags, summaries]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterContent = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Category
        </span>
        <ToggleGroup
          type="single"
          value={category ?? ""}
          onValueChange={(value) =>
            setParams({ category: value ? (value as Category) : null })
          }
          spacing={2}
          className="flex-wrap"
        >
          {CATEGORIES.map((cat) => {
            const config = BADGE_CONFIG[cat.value];
            const isActive = category === cat.value;
            return (
              <ToggleGroupItem
                key={cat.value}
                value={cat.value}
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs",
                  isActive
                    ? cn(
                        config.className,
                        "ring-2 ring-offset-2 ring-offset-background ring-current",
                      )
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {cat.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tags
        </span>
        <ToggleGroup
          type="multiple"
          value={tags}
          onValueChange={(value) =>
            setParams({ tags: value as FilterableTag[] })
          }
          spacing={2}
          className="flex-wrap"
        >
          {FILTER_TAGS.map((tag) => {
            const config = BADGE_CONFIG[tag];
            const isActive = tags.includes(tag);
            return (
              <ToggleGroupItem
                key={tag}
                value={tag}
                size="sm"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs",
                  isActive
                    ? cn(
                        config.className,
                        "ring-2 ring-offset-2 ring-offset-background ring-current",
                      )
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {config.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Sort
        </span>
        <ToggleGroup
          type="single"
          value={sort}
          onValueChange={(value) => {
            if (value) {
              setParams({ sort: value as (typeof SORT_OPTIONS)[number] });
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
                {config.label}
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
        Filters
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {activeFilterCount}
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
      <div className="flex-1">
        {filteredResources.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No resources found</EmptyTitle>
              <EmptyDescription>
                {resources.length === 0
                  ? "No resources have been added yet. Be the first to contribute!"
                  : "No resources match the selected filters. Try removing some filters."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.slug}
                resource={resource}
                reviewSummary={
                  summaries[resource.slug] ??
                  initialSummaries[resource.slug] ?? {
                    averageRating: null,
                    reviewCount: 0,
                  }
                }
                userReview={userReviews[resource.slug]}
                reviewPending={pendingBySlug[resource.slug] ?? false}
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

function ResourcesClient({
  initialSummaries,
}: {
  initialSummaries: Record<string, ReviewSummary>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-10 px-4 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Resources
        </h1>
        <p className="text-lg text-muted-foreground">
          Community plugins and scripts to extend your SoulFire bots. Browse the
          registry to find tools built by the community.
        </p>
        <p className="text-sm text-muted-foreground">
          <BookOpen className="inline h-4 w-4 align-text-bottom" /> Learn how to
          build advanced plugins in the{" "}
          <Link
            to="/docs/$"
            params={{ _splat: "development" }}
            className="underline hover:text-foreground"
          >
            Development docs
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">
            Common questions about SoulFire plugins and scripts
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {resourcesFaqItems.map((item, i) => (
            <AccordionItem key={item.question} value={`faq-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answerElement}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-2 border-t pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Want to add your plugin or script? Submit a pull request on{" "}
          <a
            href="https://github.com/soulfiremc-com/soulfiremc.com/edit/main/src/lib/resources-data.tsx"
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

const resourcesPageLoader = createServerFn({ method: "GET" }).handler(
  async () => {
    const reviewSummaries = await getReviewSummaries(
      "resource",
      RESOURCES.map((resource) => resource.slug),
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
      mainEntity: resourcesFaqItems.map((item) => ({
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
      "@id": "https://soulfiremc.com/resources#breadcrumb",
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
      ],
    };

    const pageJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "SoulFire Resources",
      description:
        "Community SoulFire plugins and scripts. Browse the registry to find plugins and scripts that extend your Minecraft bot automation.",
      url: "https://soulfiremc.com/resources",
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "SoulFire",
        url: "https://soulfiremc.com",
      },
      breadcrumb: {
        "@id": "https://soulfiremc.com/resources#breadcrumb",
      },
      mainEntity: {
        "@id": "https://soulfiremc.com/resources#resource-list",
      },
    };

    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": "https://soulfiremc.com/resources#resource-list",
      name: "SoulFire Plugins & Scripts",
      description:
        "Community plugins and scripts for SoulFire Minecraft bot automation.",
      numberOfItems: RESOURCES.length,
      itemListElement: RESOURCES.map((resource, index) => {
        const aggregateRating = getAggregateRatingJsonLd(
          reviewSummaries[resource.slug] ?? {
            averageRating: null,
            reviewCount: 0,
          },
        );

        return {
          "@type": "ListItem",
          position: index + 1,
          url: `https://soulfiremc.com/resources/${resource.slug}`,
          item: {
            "@type": "SoftwareApplication",
            name: resource.name,
            description: resource.description,
            url: `https://soulfiremc.com/resources/${resource.slug}`,
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

export const Route = createFileRoute("/resources/")({
  validateSearch: validateResourcesSearch,
  head: () => ({
    meta: getPageMeta({
      title: "Resources - SoulFire",
      description:
        "Community SoulFire plugins and scripts. Browse the registry to find plugins and scripts that extend your Minecraft bot automation.",
      path: "/resources",
      imageUrl: "/og/site/resources/image.webp",
      imageAlt: "SoulFire resources page preview",
    }),
    links: getCanonicalLinks("/resources"),
  }),
  loader: async () => resourcesPageLoader(),
  component: ResourcesPage,
});

function ResourcesPage() {
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
      <ResourcesClient initialSummaries={data.reviewSummaries} />
    </SiteShell>
  );
}
