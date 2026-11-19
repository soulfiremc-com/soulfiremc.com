import { DateTime, Option, Schema } from "effect";
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";
import { transformerTwoslash } from "fumadocs-twoslash";
import { codeColorReplacements, codeThemes } from "./src/lib/code-theme";
import { remarkSdkRelease } from "./src/lib/docs/remark-sdk-release";

const typeGenerator = createGenerator({
  cache: createFileSystemGeneratorCache("node_modules/.cache/sdk-type-tables"),
});

const frontmatterFields = {
  title: Schema.String,
  description: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  full: Schema.optional(Schema.Boolean),
  _openapi: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
};
const calendarDate = Schema.String.check(
  Schema.makeFilter((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return "Invalid calendar date";
    const date = DateTime.make(`${value}T00:00:00Z`);
    return (
      (Option.isSome(date) &&
        DateTime.formatIsoDateUtc(date.value) === value) ||
      "Invalid calendar date"
    );
  }),
);

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: Schema.toStandardSchemaV1(
      Schema.Struct({
        ...frontmatterFields,
        sidebarTitle: Schema.optional(
          Schema.String.check(Schema.isMinLength(1)),
        ),
      }),
    ),
    postprocess: {
      includeProcessedMarkdown: true,
      extractLinkReferences: true,
    },
  },
});

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: Schema.toStandardSchemaV1(
    Schema.Struct({
      ...frontmatterFields,
      author: Schema.String,
      date: Schema.optional(Schema.Union([calendarDate, Schema.Date])),
      tags: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
      cover: Schema.optional(Schema.String),
    }),
  ),
});

export default defineConfig({
  mdxOptions: {
    // Keep public image paths so `Image` finds their size and optimized
    // variants in the static image manifest. Imports become hashed URLs.
    remarkImageOptions: { useImport: false },
    remarkPlugins: [
      remarkSdkRelease,
      remarkMdxMermaid,
      [remarkAutoTypeTable, { generator: typeGenerator }],
    ],
    rehypeCodeOptions: {
      themes: codeThemes,
      colorReplacements: codeColorReplacements,
      inline: "tailing-curly-colon",
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          twoslashOptions: {
            compilerOptions: {
              strict: true,
              target: "es2022",
              moduleResolution: "bundler",
            },
          },
        }),
      ],
    },
  },
  plugins: [lastModified()],
});
