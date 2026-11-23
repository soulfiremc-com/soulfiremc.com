import type { Deferred } from "effect";
import { Config, ConfigProvider, Effect, Schema } from "effect";
import { AsyncLocalStorage } from "node:async_hooks";
import { requestJson, requestVoid } from "@/lib/backend-http";
import { getCachedValue } from "@/lib/edge-cache";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
class DiscordRequestError extends Schema.TaggedError<
  DiscordRequestError,
  { readonly brand: unique symbol }
>()("DiscordRequestError", { cause: Schema.Unknown }) {}

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_INVITE_URL_PATTERN =
  /(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/iu;
const RAW_DISCORD_INVITE_CODE_PATTERN = /^[a-zA-Z0-9-]+$/u;
const DISCORD_CACHE_KEY_BASE =
  "https://soulfiremc.com/__internal/cache/discord/v1";
const DISCORD_INVITE_CACHE_TTL_SECONDS = 10 * 60;
const DISCORD_INVITE_RESOLUTION_CACHE_TTL_SECONDS = 24 * 60 * 60;
const DISCORD_NEGATIVE_CACHE_TTL_SECONDS = 60;
const DISCORD_REQUEST_TIMEOUT_MS = 5000;

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
          client_id: process.env["DISCORD_CLIENT_ID"] ?? "",
          client_secret: process.env["DISCORD_CLIENT_SECRET"] ?? "",
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      },
    },
  );
}

export function getDiscordUserEffect(accessToken: string) {
  return requestJson(`${DISCORD_API_BASE}/users/@me`, discordUserSchema, {
    init: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function pushLinkedRoleMetadataEffect(
  accessToken: string,
  metadata: LinkedRoleMetadata,
) {
  const appId = process.env["DISCORD_CLIENT_ID"] ?? "";
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

function normalizeInviteUrl(url: string): string | null {
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function getDiscordCacheKey(namespace: string, key: string): string {
  return `${DISCORD_CACHE_KEY_BASE}/${namespace}/${encodeURIComponent(key)}`;
}

function followInviteRedirects(initialUrl: string, maxRedirects: number) {
  return Effect.tryPromise({
    try: async (signal) => {
      let currentUrl = initialUrl;
      for (let step = 0; step < maxRedirects; step++) {
        const resolvedCode = extractInviteCode(currentUrl);
        if (resolvedCode !== currentUrl) return resolvedCode;

        // oxlint-disable-next-line effecttsgo/global-fetch-in-effect -- Inspect manual redirects and cancel each native response body.
        const response = await fetch(currentUrl, {
          redirect: "manual",
          signal,
        });
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (response.status < 300 || response.status >= 400 || !location)
          return null;
        currentUrl = new URL(location, currentUrl).toString();
      }
      const finalCode = extractInviteCode(currentUrl);
      return finalCode !== currentUrl ? finalCode : null;
    },
    catch: (cause) => DiscordRequestError.make({ cause }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: DISCORD_REQUEST_TIMEOUT_MS,
      orElse: () => Effect.succeed(null),
    }),
    Effect.orElseSucceed(() => null),
  );
}

export function resolveDiscordInviteCodeEffect(
  inviteUrlOrCode: string,
  maxRedirects = 5,
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
    negativeTtlSeconds: DISCORD_NEGATIVE_CACHE_TTL_SECONDS,
    load: followInviteRedirects(initialUrl, maxRedirects),
    pendingLoads:
      lookupStorage.getStore()?.resolutions ??
      new Map<string, Deferred.Deferred<string | null>>(),
    successTtlSeconds: DISCORD_INVITE_RESOLUTION_CACHE_TTL_SECONDS,
    schema: Schema.String,
  });
}

export const fetchDiscordInviteEffect = Effect.fn("fetchDiscordInvite")(
  function* (inviteUrlOrCode: string) {
    const inviteCode = yield* resolveDiscordInviteCodeEffect(inviteUrlOrCode);
    if (!inviteCode) return null;

    return yield* getCachedValue({
      cacheKey: getDiscordCacheKey("invite", inviteCode),
      negativeTtlSeconds: DISCORD_NEGATIVE_CACHE_TTL_SECONDS,
      load: Effect.gen(function* () {
        const token = yield* Config.String("DISCORD_BOT_TOKEN").pipe(
          Config.withDefault(""),
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv(),
          ),
          Effect.orElseSucceed(() => ""),
        );
        return yield* requestJson(
          `${DISCORD_API_BASE}/invites/${inviteCode}?with_counts=true`,
          discordInviteSchema,
          {
            init: { headers: token ? { Authorization: `Bot ${token}` } : {} },
          },
        );
      }).pipe(Effect.orElseSucceed(() => null)),
      pendingLoads:
        lookupStorage.getStore()?.invites ??
        new Map<string, Deferred.Deferred<DiscordInviteResponse | null>>(),
      successTtlSeconds: DISCORD_INVITE_CACHE_TTL_SECONDS,
      schema: discordInviteSchema,
    });
  },
);

/** Extract the invite code from discord.gg and discord.com/invite URLs. */
export function extractInviteCode(url: string): string {
  return url.match(DISCORD_INVITE_URL_PATTERN)?.[1] ?? url;
}
