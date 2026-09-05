import { blog, docs } from "fumadocs-mdx:collections/server";
import { loader, multiple } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
import { openapi } from "@/lib/docs/openapi";

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
      plugins: [lucideIconsPlugin(), openapiPlugin()],
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
