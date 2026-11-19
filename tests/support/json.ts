import { Schema } from "effect";

/** Parses JSON text that must contain an object. */
export const decodeJsonRecord = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);
