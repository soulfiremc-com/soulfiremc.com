import browserCollections from "fumadocs-mdx:collections/browser";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { SerializedPageTree } from "fumadocs-core/source/client";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import type { OpenAPIPageProps_Spec } from "fumadocs-openapi/ui";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { Suspense } from "react";
import * as z from "zod";
import { APIPage } from "@/components/api-page";
import { EnderDashSponsor } from "@/components/enderdash-sponsor";
import { Feedback } from "@/components/feedback";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { docsRedirects } from "@/lib/docs/redirects";
import { getBaseLayoutOptions } from "@/lib/layout-options";
import { getDocsPageImage } from "@/lib/og";
import {
  createBreadcrumbStructuredData,
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
} from "@/lib/seo";
import { getSource } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

const docsSlugsInputSchema = z.array(z.string());

type BaseDocsLoaderData = {
  description?: string;
  imageUrl: string;
  pageTree: SerializedPageTree;
  title: string;
  url: string;
};

type DocsPageLoaderData = BaseDocsLoaderData & {
  githubUrl: string;
  markdownUrl: string;
  path: string;
  type: "docs";
};

type OpenApiPageLoaderData = BaseDocsLoaderData & {
  props: OpenAPIPageProps_Spec;
  type: "openapi";
};

type DocsLoaderData = DocsPageLoaderData | OpenApiPageLoaderData;

const serverLoader = createServerFn({
  method: "GET",
})
  .validator(docsSlugsInputSchema)
  .handler(async ({ data: slugs }) => {
    const source = await getSource();
    const page = source.getPage(slugs);
    if (!page) {
      throw notFound();
    }

    const pageTree = await source.serializePageTree(source.getPageTree());
    const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";
    const imageUrl = getDocsPageImage(page).url;

    if (page.data.type === "openapi") {
      return {
        type: "openapi",
        description: page.data.description,
        imageUrl,
        pageTree,
        props: (
          page.data as unknown as {
            getOpenAPIPageProps: () => OpenAPIPageProps_Spec;
          }
        ).getOpenAPIPageProps(),
        title,
        url: page.url,
      };
    }

    return {
      type: "docs",
      description: page.data.description,
      githubUrl: `https://github.com/soulfiremc-com/soulfiremc.com/blob/main/content/docs/${page.path}`,
      imageUrl,
      markdownUrl: `${page.url}.mdx`,
      path: page.path,
      pageTree,
      title,
      url: page.url,
    };
  });

const clientLoader = browserCollections.docs.createClientLoader<{
  currentPath: string;
  markdownUrl: string;
}>({
  id: "docs-page",
  component({ default: MDX, toc, frontmatter, lastModified }, props) {
    return (
      <DocsPage
        toc={toc}
        lastUpdate={lastModified}
        tableOfContent={{ style: "clerk" }}
      >
        <div className="flex flex-col gap-2">
          <DocsTitle>{frontmatter.title}</DocsTitle>
          <DocsDescription className="mb-2.5">
            {frontmatter.description}
          </DocsDescription>
          <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
            <LLMCopyButton markdownUrl={props.markdownUrl} />
            <ViewOptions
              markdownUrl={props.markdownUrl}
              githubUrl={`https://github.com/soulfiremc-com/soulfiremc.com/blob/main/content/docs/${props.currentPath}`}
            />
          </div>
        </div>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              a: ({ href, ...anchorProps }) => {
                if (!href) {
                  return <a {...anchorProps} />;
                }

                const pathname = href.split("#")[0] ?? "";

                if (!pathname.startsWith("/docs")) {
                  return <a href={href} {...anchorProps} />;
                }

                return (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Link to={href} {...anchorProps} />
                    </HoverCardTrigger>
                    <HoverCardContent className="text-sm">
                      <p className="font-medium">{anchorProps.children}</p>
                      <p className="text-fd-muted-foreground">{href}</p>
                    </HoverCardContent>
                  </HoverCard>
                );
              },
            })}
          />
        </DocsBody>
        <Feedback />
        <EnderDashSponsor
          placement="docs-footer"
          className="mt-8"
          variant="footer"
        />
      </DocsPage>
    );
  },
});

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const key = params._splat?.replace(/^\/+|\/+$/g, "") ?? "";
    const destination = docsRedirects.get(key);

    if (destination) {
      throw redirect({
        href: destination,
        statusCode: 301,
      });
    }

    const data = (await serverLoader({ data: slugs })) as DocsLoaderData;

    if (data.type === "docs") {
      await clientLoader.preload(data.path);
    }

    return data as DocsLoaderData;
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.title} - SoulFire`
      : "Docs - SoulFire";
    const description = loaderData?.description ?? "SoulFire documentation";
    const path = loaderData?.url ?? "/docs";
    const imageUrl = loaderData?.imageUrl ?? `${path}/image.webp`;

    return {
      meta: getPageMeta({
        title,
        description,
        path,
        imageUrl,
        imageAlt: loaderData
          ? `${loaderData.title} documentation preview`
          : "SoulFire docs preview",
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
              { name: "Docs", path: "/docs" },
              ...(loaderData && path !== "/docs"
                ? [{ name: loaderData.title, path }]
                : []),
            ]),
          ]),
        ),
      ],
    };
  },
  component: DocsPageRoute,
});

function DocsMarkdownContent({
  markdownUrl,
  path,
}: Pick<DocsPageLoaderData, "markdownUrl" | "path">) {
  return clientLoader.useContent(path, {
    currentPath: path,
    markdownUrl,
  });
}

function DocsPageRoute() {
  const page = useFumadocsLoader(Route.useLoaderData() as DocsLoaderData);

  return (
    <DocsLayout tree={page.pageTree} {...getBaseLayoutOptions()}>
      <Suspense>
        {page.type === "openapi" ? (
          (() => {
            const openApiPage = page as unknown as OpenApiPageLoaderData;

            return (
              <DocsPage full>
                <div className="mb-6 flex flex-col gap-2 border-b pb-6">
                  <DocsTitle>{openApiPage.title}</DocsTitle>
                  <DocsDescription>{openApiPage.description}</DocsDescription>
                </div>
                <DocsBody>
                  <APIPage {...openApiPage.props} />
                </DocsBody>
                <Feedback />
                <EnderDashSponsor
                  placement="docs-footer"
                  className="mt-8"
                  variant="footer"
                />
              </DocsPage>
            );
          })()
        ) : (
          <DocsMarkdownContent
            markdownUrl={page.markdownUrl}
            path={page.path}
          />
        )}
      </Suspense>
    </DocsLayout>
  );
}
