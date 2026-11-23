import { Deferred, Effect, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class EdgeCacheError extends Schema.TaggedError<
  EdgeCacheError,
  { readonly brand: unique symbol }
>()("EdgeCacheError", { cause: Schema.Unknown }) {}

function getCloudflareCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  const cloudflareCaches = caches as CacheStorage & {
    readonly default?: Cache;
  };
  return cloudflareCaches.default ?? null;
}

function readCachedValue<T>(
  cache: Cache,
  cacheKey: string,
  schema: Schema.Decoder<T>,
) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => cache.match(cacheKey),
      catch: (cause) => EdgeCacheError.make({ cause }),
    });
    if (!response) return { hit: false } as const;

    const payload: unknown = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) => EdgeCacheError.make({ cause }),
    });
    const entry = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ value: Schema.NullOr(schema) }),
    )(payload);
    return { hit: true, value: entry.value } as const;
  }).pipe(
    Effect.catch(() =>
      Effect.tryPromise({
        try: () => cache.delete(cacheKey),
        catch: (cause) => EdgeCacheError.make({ cause }),
      }).pipe(Effect.ignore, Effect.as({ hit: false } as const)),
    ),
  );
}

function writeCachedValue(
  cache: Cache,
  cacheKey: string,
  value: unknown,
  ttlSeconds: number,
) {
  return Effect.tryPromise({
    try: () =>
      cache.put(
        cacheKey,
        Response.json(
          { value },
          {
            headers: {
              "Cache-Control": `public, max-age=${ttlSeconds}`,
              "Content-Type": "application/json; charset=utf-8",
            },
          },
        ),
      ),
    catch: (cause) => EdgeCacheError.make({ cause }),
  }).pipe(Effect.ignore);
}

// Complete every waiter and remove the slot even if a lookup fails or is interrupted.
function coalesceLoad<T>(
  pendingLoads: Map<string, Deferred.Deferred<T | null>>,
  key: string,
  load: Effect.Effect<T | null>,
) {
  return Effect.suspend(() => {
    const pendingLoad = pendingLoads.get(key);
    if (pendingLoad) return Deferred.await(pendingLoad);

    const nextLoad = Deferred.makeUnsafe<T | null>();
    pendingLoads.set(key, nextLoad);
    return load.pipe(
      Effect.onExit((exit) => Deferred.done(nextLoad, exit)),
      Effect.ensuring(
        Effect.sync(() => {
          pendingLoads.delete(key);
        }),
      ),
    );
  });
}

/**
 * Reads a value from the Cloudflare cache, or loads and stores it. Concurrent
 * loads for the same key in `pendingLoads` share one request. A `null` result
 * is cached for `negativeTtlSeconds`.
 */
export function getCachedValue<T>({
  cacheKey,
  load,
  pendingLoads,
  successTtlSeconds,
  negativeTtlSeconds,
  schema,
}: {
  cacheKey: string;
  load: Effect.Effect<T | null>;
  pendingLoads: Map<string, Deferred.Deferred<T | null>>;
  successTtlSeconds: number;
  negativeTtlSeconds: number;
  schema: Schema.Decoder<T>;
}) {
  return Effect.gen(function* () {
    const cache = getCloudflareCache();
    if (cache) {
      const cachedValue = yield* readCachedValue(cache, cacheKey, schema);
      if (cachedValue.hit) return cachedValue.value;
    }

    return yield* coalesceLoad(
      pendingLoads,
      cacheKey,
      Effect.gen(function* () {
        const value = yield* load;
        if (cache) {
          yield* writeCachedValue(
            cache,
            cacheKey,
            value,
            value === null ? negativeTtlSeconds : successTtlSeconds,
          );
        }
        return value;
      }),
    );
  });
}
