import { Schema } from "effect";
import { discordEmbedScript } from "@/lib/discord-embed";
import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
import { getBlogPostData } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-date";
import { getBlogPageImage } from "@/lib/og";
import {
  createBlogPostingStructuredData,
  createBreadcrumbStructuredData,
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  withSiteName,
  jsonLdScript,
} from "@/lib/seo";
import { getMDXComponents } from "@/mdx-components";

const blogPostLoader = createServerFn({ method: "GET" })
  .validator(
    Schema.toStandardSchemaV1(
      Schema.Struct({ slug: Schema.String.check(Schema.isMinLength(1)) }),
    ),
  )
  .handler(({ data }) => {
    const post = getBlogPostData(data.slug);
    if (!post) {
      throw notFound();
    }

    return post;
  });

const clientLoader = browserCollections.blog.createClientLoader<{
  relatedPosts: {
    date?: string;
    description?: string;
    readingTime: number;
    slug: string;
    title: string;
  }[];
}>({
  id: "blog-post",
  component({ default: MDX }, props) {
    return (
      <div className="flex flex-col gap-10">
        <article className="prose max-w-none">
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
                      <p className="text-sm/6 text-muted-foreground">
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
    const data = await blogPostLoader({ data: { slug: params.slug } });
    // Load the MDX module before rendering so client navigation does not
    // suspend on an empty article and shift the footer.
    await clientLoader.preload(data.path);
    return data;
  },
  head: ({ loaderData }) => {
    // A missing post keeps the root noindex and gets no canonical or preview.
    if (!loaderData) return { meta: [] };
    const data = loaderData;
    const title = withSiteName(data.post.title);
    const description = data.post.description ?? "SoulFire blog post";
    const path = data.post.url;
    const imageUrl = getBlogPageImage({ slugs: [data.post.slug] }).url;

    return {
      meta: getPageMeta({
        title,
        description,
        path,
        imageUrl,
        imageAlt: `${data.post.title} blog preview`,
        ogType: "article",
        publishedTime: data.post.date,
      }),
      links: getCanonicalLinks(path),
      scripts: [
        ...discordEmbedScript({
          title,
          description,
          url: new URL(path, "https://soulfiremc.com").href,
          label: "Read article",
          images: [new URL(imageUrl, "https://soulfiremc.com").href],
          links: [
            {
              label: "Download SoulFire",
              url: "https://soulfiremc.com/download",
            },
          ],
        }),
        jsonLdScript(
          createStructuredDataGraph([
            createWebPageStructuredData({
              path,
              title,
              description,
              imageUrl,
              withBreadcrumb: true,
            }),
            createBlogPostingStructuredData({
              path,
              title: data.post.title,
              description,
              imageUrl,
              author: data.post.author,
              datePublished: data.post.date,
              keywords: data.post.tags,
            }),
            createBreadcrumbStructuredData(path, [
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: data.post.title, path },
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
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <Link
              to="/{-$lang}"
              className="transition-colors hover:text-foreground"
            >
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to="/blog"
              className="transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-foreground">
              {data.post.title}
            </span>
          </nav>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {data.post.title}
          </h1>

          {data.post.description ? (
            <p className="text-lg/8 text-muted-foreground">
              {data.post.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{data.post.author}</span>
            {data.post.date ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={new Date(data.post.date).toISOString()}>
                  {formatBlogDate(data.post.date)}
                </time>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{data.post.readingTime} min read</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl min-w-0">
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
