import { Schema } from "effect";
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";
import { transformerTwoslash } from "fumadocs-twoslash";

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Invalid calendar date";
    const date = new Date(`${value}T00:00:00Z`);
    return (
      (!Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value) ||
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
    remarkPlugins: [[remarkAutoTypeTable, { generator: typeGenerator }]],
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
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
