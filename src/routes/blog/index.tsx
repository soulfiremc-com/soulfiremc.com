import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Image } from "@/components/image";
import { SiteShell } from "@/components/site-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllBlogPostSummaries } from "@/lib/blog";
import {
  createBreadcrumbStructuredData,
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";

const blogIndexLoader = createServerFn({ method: "GET" }).handler(async () => {
  return {
    posts: getAllBlogPostSummaries(),
  };
});

export const Route = createFileRoute("/blog/")({
  head: () => {
    const title = "Blog - SoulFire";
    const description =
      "Latest updates, tutorials, and insights about Minecraft bot testing, server stress testing, and SoulFire development.";

    return {
      meta: getPageMeta({
        title,
        description,
        path: "/blog",
        imageUrl: "/og/site/blog/image.webp",
        imageAlt: "SoulFire blog preview",
      }),
      links: getCanonicalLinks("/blog"),
      scripts: [
        jsonLdScript(
          createStructuredDataGraph([
            createWebPageStructuredData({
              path: "/blog",
              title,
              description,
              type: "Blog",
              imageUrl: "/og/site/blog/image.webp",
              withBreadcrumb: true,
            }),
            createBreadcrumbStructuredData("/blog", [
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
            ]),
          ]),
        ),
      ],
    };
  },
  loader: async () => blogIndexLoader(),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { posts } = Route.useLoaderData();

  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-(--fd-layout-width) px-4 py-8 sm:py-12">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">Blog</h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Latest updates, tutorials, and insights from the SoulFire team
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card
              key={post.url}
              className="group flex flex-col overflow-hidden transition-all hover:shadow-lg"
            >
              {post.cover ? (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <Image
                    src={post.cover}
                    alt={post.title}
                    fill
                    objectFit="cover"
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              ) : null}
              <CardHeader className="gap-3">
                <CardTitle className="text-xl transition-colors group-hover:text-primary sm:text-2xl">
                  <Link to="/blog/$slug" params={{ slug: post.slug }}>
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {post.description ? (
                  <p className="line-clamp-3 text-muted-foreground">
                    {post.description}
                  </p>
                ) : null}
                {post.tags.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
                  {post.author ? <span>{post.author}</span> : null}
                  {post.date ? (
                    <time dateTime={new Date(post.date).toISOString()}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  ) : null}
                  <span>{post.readingTime} min read</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
