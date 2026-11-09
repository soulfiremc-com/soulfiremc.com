import { Deferred, Effect, Schema } from "effect";
import { AsyncLocalStorage } from "node:async_hooks";
import { requestJson, requestVoid } from "@/lib/backend-http";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_INVITE_URL_PATTERN =
  /(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/i;
const RAW_DISCORD_INVITE_CODE_PATTERN = /^[a-zA-Z0-9-]+$/;
const DISCORD_CACHE_KEY_BASE =
  "https://soulfiremc.com/__internal/cache/discord/v1";
const DISCORD_INVITE_CACHE_TTL_SECONDS = 10 * 60;
const DISCORD_INVITE_RESOLUTION_CACHE_TTL_SECONDS = 24 * 60 * 60;
const DISCORD_NEGATIVE_CACHE_TTL_SECONDS = 60;
const DISCORD_REQUEST_TIMEOUT_MS = 5_000;

const discordOAuthTokensSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.String,
  expires_in: Schema.Finite,
  refresh_token: Schema.String,
  scope: Schema.String,
});
const discordUserSchema = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  discriminator: Schema.String,
  avatar: Schema.NullOr(Schema.String),
});
const discordInviteSchema = Schema.Struct({
  code: Schema.String,
  guild: Schema.optionalKey(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      icon: Schema.NullOr(Schema.String),
      description: Schema.NullOr(Schema.String),
    }),
  ),
  approximate_member_count: Schema.optionalKey(Schema.Finite),
  approximate_presence_count: Schema.optionalKey(Schema.Finite),
});

export type DiscordOAuthTokens = typeof discordOAuthTokensSchema.Type;
export type DiscordUser = typeof discordUserSchema.Type;
export type DiscordInviteResponse = typeof discordInviteSchema.Type;

type LinkedRoleMetadata = {
  platform_name: string;
  platform_username: string | null;
  metadata: Record<string, string | number | boolean>;
};

function createLookupScope() {
  return {
    resolutions: new Map<string, Deferred.Deferred<string | null>>(),
    invites: new Map<string, Deferred.Deferred<DiscordInviteResponse | null>>(),
  };
}

const lookupStorage = new AsyncLocalStorage<
  ReturnType<typeof createLookupScope>
>();

// Workers cannot share pending I/O between requests. Only completed cache
// entries may be shared; coalesce lookups within the current request instead.
export function runWithDiscordLookupScope<T>(callback: () => T): T {
  return lookupStorage.run(createLookupScope(), callback);
}

export function exchangeDiscordCodeEffect(code: string, redirectUri: string) {
  return requestJson(
    `${DISCORD_API_BASE}/oauth2/token`,
    discordOAuthTokensSchema,
    {
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID ?? "",
          client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      },
    },
  );
}

export function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<DiscordOAuthTokens> {
  return Effect.runPromise(exchangeDiscordCodeEffect(code, redirectUri));
}

export function getDiscordUserEffect(accessToken: string) {
  return requestJson(`${DISCORD_API_BASE}/users/@me`, discordUserSchema, {
    init: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  return Effect.runPromise(getDiscordUserEffect(accessToken));
}

export function pushLinkedRoleMetadataEffect(
  accessToken: string,
  metadata: LinkedRoleMetadata,
) {
  const appId = process.env.DISCORD_CLIENT_ID ?? "";
  return requestVoid(
    `${DISCORD_API_BASE}/users/@me/applications/${appId}/role-connection`,
    {
      init: {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      },
    },
  );
}

export function pushLinkedRoleMetadata(
  accessToken: string,
  metadata: LinkedRoleMetadata,
): Promise<void> {
  return Effect.runPromise(pushLinkedRoleMetadataEffect(accessToken, metadata));
}

function normalizeInviteUrl(url: string): string | null {
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function getCloudflareCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  const cloudflareCaches = caches as CacheStorage & {
    readonly default?: Cache;
  };
  return cloudflareCaches.default ?? null;
}

function getDiscordCacheKey(namespace: string, key: string): string {
  return `${DISCORD_CACHE_KEY_BASE}/${namespace}/${encodeURIComponent(key)}`;
}

function readCachedValue<T>(
  cache: Cache,
  cacheKey: string,
  schema: Schema.Decoder<T>,
) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() => cache.match(cacheKey));
    if (!response) return { hit: false } as const;

    const payload: unknown = yield* Effect.tryPromise(() => response.json());
    const entry = yield* Schema.decodeUnknownEffect(
      Schema.Struct({ value: Schema.NullOr(schema) }),
    )(payload);
    return { hit: true, value: entry.value } as const;
  }).pipe(
    Effect.catch(() =>
      Effect.tryPromise(() => cache.delete(cacheKey)).pipe(
        Effect.ignore,
        Effect.as({ hit: false } as const),
      ),
    ),
  );
}

function writeCachedValue<T>(
  cache: Cache,
  cacheKey: string,
  value: T | null,
  ttlSeconds: number,
) {
  return Effect.tryPromise(() =>
    cache.put(
      cacheKey,
      new Response(JSON.stringify({ value }), {
        headers: {
          "Cache-Control": `public, max-age=${ttlSeconds}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }),
    ),
  ).pipe(Effect.ignore);
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

function getCachedValue<T>({
  cacheKey,
  load,
  pendingLoads,
  successTtlSeconds,
  schema,
}: {
  cacheKey: string;
  load: Effect.Effect<T | null>;
  pendingLoads: Map<string, Deferred.Deferred<T | null>>;
  successTtlSeconds: number;
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
            value === null
              ? DISCORD_NEGATIVE_CACHE_TTL_SECONDS
              : successTtlSeconds,
          );
        }
        return value;
      }),
    );
  });
}

function followInviteRedirects(initialUrl: string, maxRedirects: number) {
  return Effect.tryPromise(async (signal) => {
    let currentUrl = initialUrl;
    for (let step = 0; step < maxRedirects; step++) {
      const resolvedCode = extractInviteCode(currentUrl);
      if (resolvedCode !== currentUrl) return resolvedCode;

      const response = await fetch(currentUrl, { redirect: "manual", signal });
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (response.status < 300 || response.status >= 400 || !location)
        return null;
      currentUrl = new URL(location, currentUrl).toString();
    }
    const finalCode = extractInviteCode(currentUrl);
    return finalCode !== currentUrl ? finalCode : null;
  }).pipe(
    Effect.timeoutOrElse({
      duration: DISCORD_REQUEST_TIMEOUT_MS,
      orElse: () => Effect.succeed(null),
    }),
    Effect.orElseSucceed(() => null),
  );
}

function resolveDiscordInviteCodeEffect(
  inviteUrlOrCode: string,
  maxRedirects: number,
) {
  const directCode = extractInviteCode(inviteUrlOrCode);
  if (
    directCode !== inviteUrlOrCode ||
    RAW_DISCORD_INVITE_CODE_PATTERN.test(inviteUrlOrCode)
  ) {
    return Effect.succeed(directCode);
  }
  const initialUrl = normalizeInviteUrl(inviteUrlOrCode);
  if (!initialUrl) return Effect.succeed(null);

  return getCachedValue({
    cacheKey: getDiscordCacheKey(
      "invite-resolution",
      `${maxRedirects}:${initialUrl}`,
    ),
    load: followInviteRedirects(initialUrl, maxRedirects),
    pendingLoads: lookupStorage.getStore()?.resolutions ?? new Map(),
    successTtlSeconds: DISCORD_INVITE_RESOLUTION_CACHE_TTL_SECONDS,
    schema: Schema.String,
  });
}

export function resolveDiscordInviteCode(
  inviteUrlOrCode: string,
  maxRedirects = 5,
): Promise<string | null> {
  return Effect.runPromise(
    resolveDiscordInviteCodeEffect(inviteUrlOrCode, maxRedirects),
  );
}

export const fetchDiscordInviteEffect = Effect.fn("fetchDiscordInvite")(
  function* (inviteUrlOrCode: string) {
    const inviteCode = yield* resolveDiscordInviteCodeEffect(
      inviteUrlOrCode,
      5,
    );
    if (!inviteCode) return null;

    return yield* getCachedValue({
      cacheKey: getDiscordCacheKey("invite", inviteCode),
      load: Effect.suspend(() => {
        const token = process.env.DISCORD_BOT_TOKEN;
        return requestJson(
          `${DISCORD_API_BASE}/invites/${inviteCode}?with_counts=true`,
          discordInviteSchema,
          {
            init: { headers: token ? { Authorization: `Bot ${token}` } : {} },
          },
        );
      }).pipe(Effect.orElseSucceed(() => null)),
      pendingLoads: lookupStorage.getStore()?.invites ?? new Map(),
      successTtlSeconds: DISCORD_INVITE_CACHE_TTL_SECONDS,
      schema: discordInviteSchema,
    });
  },
);

export function fetchDiscordInvite(
  inviteUrlOrCode: string,
): Promise<DiscordInviteResponse | null> {
  return Effect.runPromise(fetchDiscordInviteEffect(inviteUrlOrCode));
}

/** Extract the invite code from discord.gg and discord.com/invite URLs. */
export function extractInviteCode(url: string): string {
  return url.match(DISCORD_INVITE_URL_PATTERN)?.[1] ?? url;
}
