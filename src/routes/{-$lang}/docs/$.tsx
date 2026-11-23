import {
  docFileInfo,
  formatLocaleDate,
  isLocale,
  localizePath,
  localizeHref,
  type Locale,
} from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n-react";
import { Schema } from "effect";
import { discordEmbedScript } from "@/lib/discord-embed";
import browserCollections from "fumadocs-mdx:collections/browser";
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import type { SerializedPageTree } from "fumadocs-core/source/client";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import type { OpenAPIPageProps_Spec } from "fumadocs-openapi/ui";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { type ComponentProps, Suspense } from "react";
import { APIPage } from "@/components/api-page";
import { EnderDashSponsor } from "@/components/enderdash-sponsor";
import { Feedback } from "@/components/feedback";
import { LLMCopyButton } from "@/components/page-actions";
import { setDocsContentPreloader } from "@/lib/docs/hydration";
import { docsLinkTarget } from "@/lib/docs/link-target";
import { isOpenApiPage } from "@/lib/docs/openapi";
import { docsRedirects } from "@/lib/docs/redirects";
import { getBaseLayoutOptions } from "@/lib/layout-options";
import { getDocsPageImage } from "@/lib/og";
import {
  createBreadcrumbStructuredData,
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  withSiteName,
  jsonLdScript,
} from "@/lib/seo";
import { getSource, getDocsLanguages } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

const docsSlugsInputSchema = Schema.mutable(Schema.Array(Schema.String));

type BaseDocsLoaderData = {
  locale: Locale;
  contentLocale: Locale;
  languages: Locale[];
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
  markdownUrl: string;
  props: OpenAPIPageProps_Spec;
  type: "openapi";
};

type DocsLoaderData = DocsPageLoaderData | OpenApiPageLoaderData;

const serverLoader = createServerFn({
  method: "GET",
})
  .validator(Schema.toStandardSchemaV1(docsSlugsInputSchema))
  .middleware([staticFunctionMiddleware])
  .handler(async ({ data: [locale, ...slugs] }) => {
    if (!isLocale(locale)) throw notFound();
    const source = await getSource();
    const page = source.getPage(slugs, locale);
    if (!page) {
      throw notFound();
    }

    const pageTree = await source.serializePageTree(source.getPageTree(locale));
    const contentLocale = docFileInfo(page.path).locale;
    const languages = await getDocsLanguages(slugs);
    const title = page.data.title ?? page.slugs.at(-1) ?? "nav.docs";
    const imageUrl = getDocsPageImage(page, contentLocale).url;

    if (isOpenApiPage(page)) {
      return {
        type: "openapi",
        locale,
        contentLocale,
        languages,
        description: page.data.description,
        imageUrl,
        markdownUrl: `${page.url}.mdx`,
        pageTree,
        props: page.data.getOpenAPIPageProps(),
        title,
        url: page.url,
      };
    }

    return {
      type: "docs",
      locale,
      contentLocale,
      languages,
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
  contentLocale: Locale;
}>({
  id: "docs-page",
  // fumadocs calls this as a hook inside its renderer component.
  component: function useDocsPage(
    { default: MDX, toc, frontmatter, lastModified },
    props,
  ) {
    return (
      <DocsPage
        toc={toc}
        tableOfContent={{
          style: "clerk",
          // Expose the side table of contents as a navigation landmark.
          container: { role: "navigation", "aria-labelledby": "toc-title" },
        }}
      >
        <DocsPageHeader
          title={frontmatter.title}
          description={frontmatter.description}
          contentLocale={props.contentLocale}
          markdownUrl={props.markdownUrl}
          githubUrl={`https://github.com/soulfiremc-com/soulfiremc.com/blob/main/content/docs/${props.currentPath}`}
        />
        <DocsBody
          lang={props.contentLocale}
          data-docs-content-path={props.currentPath}
        >
          <MDX components={docsMdxComponents} />
        </DocsBody>
        {lastModified && <LastUpdated date={lastModified} />}
        <DocsPageFooter />
      </DocsPage>
    );
  },
});

setDocsContentPreloader(clientLoader.preload);

export const Route = createFileRoute("/{-$lang}/docs/$")({
  loader: async ({ params }) => {
    const locale = isLocale(params.lang) ? params.lang : "en";
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const key = params._splat?.replaceAll(/^\/+|\/+$/gu, "") ?? "";
    const destination = docsRedirects.get(key);

    if (destination) {
      throw redirect({
        href: localizePath(destination, locale),
        statusCode: 301,
      });
    }

    const data = (await serverLoader({
      data: [locale, ...slugs],
    })) as DocsLoaderData;

    if (data.type === "docs") {
      await clientLoader.preload(data.path);
    }

    return data;
  },
  head: ({ loaderData, params }) => {
    // A missing page keeps the root noindex and gets no canonical or preview.
    if (!loaderData) return { meta: [] };
    const routeLocale = isLocale(params.lang) ? params.lang : "en";
    const title = withSiteName(loaderData.title);
    const description =
      loaderData.description ??
      (loaderData.type === "openapi"
        ? `Request and response reference for the ${loaderData.title} endpoint in the SoulFire API.`
        : "SoulFire documentation");
    const path = localizePath(loaderData.url, loaderData.contentLocale);
    const docsPath = localizePath("/docs", loaderData.contentLocale);
    const imageUrl = loaderData.imageUrl;

    return {
      meta: [
        ...getPageMeta({
          locale: loaderData.contentLocale,
          title,
          description,
          path,
          imageUrl,
          imageAlt: loaderData.title,
        }),
        // An English page served under /de, /pl, or /ru duplicates the English
        // original. Keep the copy out of search results but follow its links.
        ...(routeLocale === loaderData.contentLocale
          ? []
          : [{ name: "robots", content: "noindex, follow" }]),
      ],
      links: getCanonicalLinks(
        path,
        loaderData.contentLocale,
        loaderData.languages,
      ),
      scripts: [
        ...discordEmbedScript({
          title,
          description,
          url: new URL(path, "https://soulfiremc.com").href,
          label: "Read guide",
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
            createBreadcrumbStructuredData(path, [
              {
                name: "Home",
                path: localizePath("/", loaderData.contentLocale),
              },
              { name: "Docs", path: docsPath },
              ...(path !== docsPath ? [{ name: loaderData.title, path }] : []),
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
  contentLocale,
}: Pick<DocsPageLoaderData, "markdownUrl" | "path" | "contentLocale">) {
  return clientLoader.useContent(path, {
    currentPath: path,
    contentLocale,
    markdownUrl,
  });
}

function DocsPageRoute() {
  const locale = useLocale();
  const page = useFumadocsLoader<DocsLoaderData>(Route.useLoaderData());

  return (
    <DocsLayout tree={page.pageTree} {...getBaseLayoutOptions(locale)}>
      <Suspense>
        {page.type === "openapi" ? (
          <DocsPage full>
            {/* APIPage renders the operation description as Markdown below
                the endpoint, so a page description here would repeat it. */}
            <DocsPageHeader
              title={page.title}
              contentLocale={page.contentLocale}
              markdownUrl={page.markdownUrl}
            />
            <DocsBody lang={page.contentLocale}>
              <APIPage {...page.props} />
            </DocsBody>
            <DocsPageFooter />
          </DocsPage>
        ) : (
          <DocsMarkdownContent
            markdownUrl={page.markdownUrl}
            path={page.path}
            contentLocale={page.contentLocale}
          />
        )}
      </Suspense>
    </DocsLayout>
  );
}

function DocsPageHeader({
  title,
  description,
  contentLocale,
  markdownUrl,
  githubUrl,
}: {
  title: string;
  description?: string;
  contentLocale: Locale;
  markdownUrl: string;
  githubUrl?: string;
}) {
  const locale = useLocale();
  const t = useT();
  return (
    <div className="flex flex-col gap-2 border-b pb-6" lang={contentLocale}>
      <DocsTitle>{title}</DocsTitle>
      <DocsDescription className="mb-2.5">{description}</DocsDescription>
      {contentLocale !== locale && (
        <p className="text-sm text-fd-muted-foreground" lang={locale}>
          {t("docs.thisGuideIsAvailableInEnglish")}
        </p>
      )}
      <div className="flex flex-row flex-wrap items-center gap-2 pt-2">
        <LLMCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={githubUrl}
          // Point AI chats at the Markdown copy. It is shorter to read, and a
          // fixed URL keeps the server and browser links the same.
          pageUrl={new URL(markdownUrl, "https://soulfiremc.com").href}
        />
      </div>
    </div>
  );
}

function DocsPageFooter() {
  return (
    <>
      <Feedback />
      <EnderDashSponsor placement="docs-footer" className="mt-8" />
    </>
  );
}

function LastUpdated({ date }: { date: Date | string | number }) {
  const locale = useLocale();
  const t = useT();
  return (
    <p className="text-sm text-fd-muted-foreground">
      {t("docs.lastUpdatedOn")}{" "}
      <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>
        {formatLocaleDate(date, locale)}
      </time>
    </p>
  );
}

/**
 * Keep docs links inside the router so they preload, and localize links to
 * other site pages. Defined once so React keeps the same link components
 * across renders.
 */
function DocsLink({ href, ...props }: ComponentProps<"a">) {
  const locale = useLocale();
  if (href?.split("#")[0]?.startsWith("/docs")) {
    return <Link {...docsLinkTarget(href, locale)} {...props} />;
  }
  return (
    // oxlint-disable-next-line jsx-a11y/anchor-has-content -- the link text arrives through the spread props
    <a
      href={href === undefined ? href : localizeHref(href, locale)}
      {...props}
    />
  );
}

const docsMdxComponents = getMDXComponents({ a: DocsLink });
