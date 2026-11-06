import { Schema, Effect, Option } from "effect";

export const reviewsSearchSchema = Schema.Struct({
  reviewsPage: Schema.Finite.check(Schema.isInt())
    .check(Schema.isGreaterThanOrEqualTo(1))
    .pipe(Schema.catchDecoding(() => Effect.succeed(Option.some(1))))
    .pipe(Schema.withDecodingDefaultType(Effect.succeed(1))),
});
