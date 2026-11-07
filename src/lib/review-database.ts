import { Context, Effect, Layer } from "effect";
import { db, reviewDb } from "@/lib/db";
import { ReviewStoreError } from "@/lib/review-workflows";

export class ReviewDatabase extends Context.Service<
  ReviewDatabase,
  { readonly primary: typeof db; readonly reviews: typeof reviewDb }
>()("soulfire/ReviewDatabase") {}

// These proxies resolve the current Worker's D1 sessions when each statement runs.
export const reviewDatabaseLayer = Layer.succeed(ReviewDatabase, {
  primary: db,
  reviews: reviewDb,
});

/** An executing D1 statement must finish before the response publishes its bookmark. */
export function reviewQuery<A>(operation: string, run: () => PromiseLike<A>) {
  return Effect.tryPromise({
    try: async () => run(),
    catch: (cause) => new ReviewStoreError({ operation, cause }),
  }).pipe(Effect.uninterruptible);
}
