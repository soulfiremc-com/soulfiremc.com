import { blog, docs } from "fumadocs-mdx:collections/server";
import { loader, multiple } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
import { openapi } from "@/lib/docs/openapi";
import { i18n, docFileInfo, type Locale } from "@/lib/i18n";
import { docsNavigationPlugin } from "@/lib/docs/navigation";

async function createDocsSource() {
  return loader(
    multiple({
      docs: docs.toFumadocsSource(),
      openapi: await openapiSource(openapi, {
        baseDir: "openapi/(generated)",
        meta: {
          folderStyle: "separator",
        },
        groupBy: "tag",
      }),
    }),
    {
      baseUrl: "/docs",
      i18n,
      plugins: [docsNavigationPlugin(), lucideIconsPlugin(), openapiPlugin()],
    },
  );
}

let cachedSource: undefined | ReturnType<typeof createDocsSource>;

export function getSource() {
  cachedSource ??= createDocsSource();
  return cachedSource;
}

export const blogSource = loader({
  baseUrl: "/blog",
  source: toFumadocsSource(blog, []),
});

/** Fallback pages must not appear as translated alternatives. */
export async function getDocsLanguages(slugs: string[]) {
  const source = await getSource();
  return i18n.languages.filter((locale) => {
    const page = source.getPage(slugs, locale);
    return page && docFileInfo(page.path).locale === locale;
  }) as Locale[];
}
