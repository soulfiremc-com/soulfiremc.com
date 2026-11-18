import { Schema, Effect } from "effect";

export const reviewsSearchSchema = Schema.Struct({
  reviewsPage: Schema.Finite.check(Schema.isInt())
    .check(Schema.isGreaterThanOrEqualTo(1))
    .pipe(
      Schema.catchDecoding(() => Effect.succeedSome(1)),
      Schema.withDecodingDefaultType(Effect.succeed(1)),
    ),
});
