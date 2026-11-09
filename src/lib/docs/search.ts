import { createFromSource } from "fumadocs-core/search/server";
import type { Locale } from "@/lib/i18n";

type SearchStructuredData = {
  contents: Array<{ content: string; heading: string }>;
  headings: Array<{ content: string; id: string }>;
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

const searchAPIs = new Map<Locale, ReturnType<typeof createSearchAPI>>();

export async function exportDocsSearch(locale: Locale) {
  let api = searchAPIs.get(locale);
  if (!api) {
    api = createSearchAPI(locale).catch((error) => {
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
  return createFromSource(
    { ...source, getPages: () => source.getPages(locale) },
    {
      buildIndex: async (page) => {
        const breadcrumbs = ["Docs"];
        for (let index = 0; index < page.slugs.length - 1; index++) {
          const parentPage = source.getPage(
            page.slugs.slice(0, index + 1),
            page.locale,
          );
          if (parentPage?.data.title) {
            breadcrumbs.push(parentPage.data.title);
          }
        }

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
          breadcrumbs,
          description: page.data.description,
          id: page.url,
          structuredData,
          title: page.data.title ?? page.slugs.at(-1) ?? "Docs",
          url: page.url,
        };
      },
    },
  );
}
