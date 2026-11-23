import type * as PageTree from "fumadocs-core/page-tree";
import { createFromSource } from "fumadocs-core/search/server";
import type { Locale } from "@/lib/i18n";
import { replaceSdkReleaseTokens } from "@/lib/sdk-release";

type SearchStructuredData = {
  contents: { content: string; heading: string | undefined }[];
  headings: { content: string; id: string }[];
};

function hasStructuredData(
  data: unknown,
): data is { structuredData: SearchStructuredData } {
  return (
    typeof data === "object" &&
    data !== null &&
    "structuredData" in data &&
    data.structuredData !== undefined
  );
}

function hasStructuredDataLoader(
  data: unknown,
): data is { load: () => Promise<{ structuredData?: SearchStructuredData }> } {
  return (
    typeof data === "object" &&
    data !== null &&
    "load" in data &&
    typeof data.load === "function"
  );
}

// These sections only list links to other pages. Their short link labels
// outrank the pages they point to, so search leaves them out.
const navigationSectionIds = new Set([
  "related-pages",
  "next-step",
  "next-steps",
]);

export function withoutNavigationSections(
  structuredData: SearchStructuredData,
): SearchStructuredData {
  return {
    ...structuredData,
    contents: structuredData.contents.filter(
      (item) =>
        item.heading === undefined || !navigationSectionIds.has(item.heading),
    ),
  };
}

/** Structured data keeps source text, so fill SDK release placeholders. */
function withSdkRelease(
  structuredData: SearchStructuredData,
): SearchStructuredData {
  return {
    ...structuredData,
    contents: structuredData.contents.map((item) => ({
      ...item,
      content: replaceSdkReleaseTokens(item.content),
    })),
  };
}

/**
 * Map each page URL to the sidebar folders above it, so search results use
 * the same localized section names as the sidebar. The tree root and the
 * page's own folder name are left out, because every result shares the root
 * and a folder's index page already shows its own title.
 */
export function getSidebarBreadcrumbs(
  tree: PageTree.Root,
): Map<string, string[]> {
  const breadcrumbs = new Map<string, string[]>();

  function collect(nodes: PageTree.Node[], parents: string[]) {
    // A separator names the pages below it, like the generated API groups.
    let current = parents;
    for (const node of nodes) {
      if (node.type === "separator") {
        current =
          typeof node.name === "string" && node.name
            ? [...parents, node.name]
            : parents;
      } else if (node.type === "page") {
        if (!breadcrumbs.has(node.url)) breadcrumbs.set(node.url, current);
      } else {
        if (node.index && !breadcrumbs.has(node.index.url)) {
          breadcrumbs.set(node.index.url, current);
        }
        collect(
          node.children,
          typeof node.name === "string" && node.name
            ? [...current, node.name]
            : current,
        );
      }
    }
  }

  collect(tree.children, []);
  return breadcrumbs;
}

const searchAPIs = new Map<Locale, ReturnType<typeof createSearchAPI>>();

export async function exportDocsSearch(locale: Locale) {
  let api = searchAPIs.get(locale);
  if (!api) {
    api = createSearchAPI(locale).catch((error: unknown) => {
      searchAPIs.delete(locale);
      throw error;
    });
    searchAPIs.set(locale, api);
  }
  return (await api).staticGET();
}

async function createSearchAPI(locale: Locale) {
  const [{ getOpenApiStructuredData, isOpenApiPage }, { getSource }] =
    await Promise.all([import("@/lib/docs/openapi"), import("@/lib/source")]);

  const source = await getSource();
  const breadcrumbs = getSidebarBreadcrumbs(source.getPageTree(locale));
  return createFromSource(
    { ...source, getPages: () => source.getPages(locale) },
    {
      // Search ranks by relevance only. A sort index adds about a quarter to
      // the static index that every visitor downloads when opening search.
      sort: { enabled: false },
      buildIndex: async (page) => {
        const pageData: unknown = page.data;
        const structuredData = isOpenApiPage(page)
          ? getOpenApiStructuredData(page)
          : hasStructuredData(pageData)
            ? pageData.structuredData
            : hasStructuredDataLoader(pageData)
              ? (await pageData.load()).structuredData
              : undefined;

        if (!structuredData) {
          throw new Error(
            `Cannot build search index for docs page without structured data: ${page.url}`,
          );
        }

        return {
          breadcrumbs: breadcrumbs.get(page.url) ?? [],
          description: page.data.description,
          id: page.url,
          structuredData: withSdkRelease(
            withoutNavigationSections(structuredData),
          ),
          title: page.data.title ?? page.slugs.at(-1) ?? "Docs",
          url: page.url,
        };
      },
    },
  );
}
