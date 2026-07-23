import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import * as z from "zod";
import { SiteShell } from "@/components/site-shell";
import { getBlogPostData } from "@/lib/blog";
import { getBlogPageImage } from "@/lib/og";
import {
  createBreadcrumbStructuredData,
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";
import { getMDXComponents } from "@/mdx-components";

const blogPostLoader = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const post = await getBlogPostData(data.slug);
    if (!post) {
      throw notFound();
    }

    return post;
  });

const clientLoader = browserCollections.blog.createClientLoader<{
  relatedPosts: Array<{
    date?: string;
    description?: string;
    readingTime: number;
    slug: string;
    title: string;
  }>;
}>({
  id: "blog-post",
  component({ default: MDX }, props) {
    return (
      <div className="flex flex-col gap-10">
        <article className="prose dark:prose-invert max-w-none">
          <MDX components={getMDXComponents()} />
        </article>
        {props.relatedPosts.length > 0 ? (
          <section className="flex flex-col gap-4 border-t pt-8">
            <h2 className="text-2xl font-semibold">Related articles</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {props.relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold">{post.title}</h3>
                    {post.description ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {post.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  },
});

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    return await blogPostLoader({ data: { slug: params.slug } });
  },
  head: ({ loaderData }) => {
    const data = loaderData;
    const title = data ? `${data.post.title} - SoulFire` : "SoulFire Blog";
    const description = data?.post.description ?? "SoulFire blog post";
    const path = data?.post.url ?? "/blog";
    const imageUrl = data
      ? getBlogPageImage({ slugs: [data.post.slug] }).url
      : "/og/site/blog/image.webp";

    return {
      meta: getPageMeta({
        title,
        description,
        path,
        imageUrl,
        imageAlt: data
          ? `${data.post.title} blog preview`
          : "SoulFire blog preview",
        ogType: "article",
      }),
      links: getCanonicalLinks(path),
      scripts: [
        jsonLdScript(
          createStructuredDataGraph([
            createWebPageStructuredData({
              path,
              title,
              description,
              imageUrl,
              withBreadcrumb: true,
            }),
            createBreadcrumbStructuredData(path, [
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              ...(data ? [{ name: data.post.title, path }] : []),
            ]),
          ]),
        ),
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const data = Route.useLoaderData();

  return (
    <SiteShell>
      <main className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col gap-10 px-4 py-8 sm:py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link
              to="/blog"
              className="transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <span>/</span>
            <span className="text-foreground">{data.post.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {data.post.date ? (
              <time dateTime={new Date(data.post.date).toISOString()}>
                {new Date(data.post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            ) : null}
            <span>{data.post.author}</span>
            <span>{data.post.readingTime} min read</span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {data.post.title}
          </h1>

          {data.post.description ? (
            <p className="text-lg leading-8 text-muted-foreground">
              {data.post.description}
            </p>
          ) : null}

          {data.post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mx-auto max-w-3xl">
          <Suspense>
            {clientLoader.useContent(data.path, {
              relatedPosts: data.relatedPosts,
            })}
          </Suspense>
        </div>
      </main>
    </SiteShell>
  );
}
