import { Schema } from "effect";

/**
 * The fumadocs `meta.json` fields that the documentation uses.
 */
const DocsMeta = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  root: Schema.optional(Schema.Union([Schema.Boolean, Schema.String])),
  pages: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  pagesIndex: Schema.optional(Schema.String),
  defaultOpen: Schema.optional(Schema.Boolean),
  collapsible: Schema.optional(Schema.Boolean),
});

/**
 * Parses the text of a fumadocs `meta.json` file.
 */
export const decodeDocsMeta = Schema.decodeUnknownSync(
  Schema.fromJsonString(DocsMeta),
);
