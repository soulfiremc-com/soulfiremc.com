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

const pendingInviteResolutions = new Map<string, Promise<string | null>>();
const pendingInviteLookups = new Map<
  string,
  Promise<DiscordInviteResponse | null>
>();

export type DiscordOAuthTokens = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
};

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<DiscordOAuthTokens> {
  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function getDiscordUser(
  accessToken: string,
): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Discord user fetch failed: ${response.status}`);
  }

  return response.json();
}

export async function pushLinkedRoleMetadata(
  accessToken: string,
  metadata: {
    platform_name: string;
    platform_username: string | null;
    metadata: Record<string, string | number | boolean>;
  },
): Promise<void> {
  const appId = process.env.DISCORD_CLIENT_ID ?? "";
  const response = await fetch(
    `${DISCORD_API_BASE}/users/@me/applications/${appId}/role-connection`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!response.ok) {
    throw new Error(`Discord metadata push failed: ${response.status}`);
  }
}

export type DiscordInviteResponse = {
  code: string;
  guild?: {
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
  };
  approximate_member_count?: number;
  approximate_presence_count?: number;
};

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function normalizeInviteUrl(url: string): string | null {
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function getCloudflareCache(): Cache | null {
  if (typeof caches === "undefined") {
    return null;
  }

  const cloudflareCaches = caches as CacheStorage & {
    readonly default?: Cache;
  };
  return cloudflareCaches.default ?? null;
}

function getDiscordCacheKey(namespace: string, key: string): string {
  return `${DISCORD_CACHE_KEY_BASE}/${namespace}/${encodeURIComponent(key)}`;
}

async function readCachedValue<T>(
  cache: Cache,
  cacheKey: string,
): Promise<{ hit: true; value: T | null } | { hit: false }> {
  try {
    const response = await cache.match(cacheKey);
    if (!response) {
      return { hit: false };
    }

    const entry: unknown = await response.json();
    if (typeof entry !== "object" || entry === null || !("value" in entry)) {
      await cache.delete(cacheKey).catch(() => false);
      return { hit: false };
    }

    return {
      hit: true,
      value: (entry as { value: T | null }).value,
    };
  } catch {
    return { hit: false };
  }
}

async function writeCachedValue<T>(
  cache: Cache,
  cacheKey: string,
  value: T | null,
  ttlSeconds: number,
): Promise<void> {
  const response = new Response(JSON.stringify({ value }), {
    headers: {
      "Cache-Control": `public, max-age=${ttlSeconds}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  await cache.put(cacheKey, response).catch(() => undefined);
}

function coalesceLoad<T>(
  pendingLoads: Map<string, Promise<T | null>>,
  key: string,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const pendingLoad = pendingLoads.get(key);
  if (pendingLoad) {
    return pendingLoad;
  }

  const nextLoad = load().finally(() => {
    pendingLoads.delete(key);
  });
  pendingLoads.set(key, nextLoad);
  return nextLoad;
}

async function getCachedValue<T>({
  cacheKey,
  load,
  pendingLoads,
  successTtlSeconds,
}: {
  cacheKey: string;
  load: () => Promise<T | null>;
  pendingLoads: Map<string, Promise<T | null>>;
  successTtlSeconds: number;
}): Promise<T | null> {
  const cache = getCloudflareCache();
  if (cache) {
    const cachedValue = await readCachedValue<T>(cache, cacheKey);
    if (cachedValue.hit) {
      return cachedValue.value;
    }
  }

  return coalesceLoad(pendingLoads, cacheKey, async () => {
    const value = await load();
    if (cache) {
      await writeCachedValue(
        cache,
        cacheKey,
        value,
        value === null ? DISCORD_NEGATIVE_CACHE_TTL_SECONDS : successTtlSeconds,
      );
    }
    return value;
  });
}

async function followInviteRedirects(
  initialUrl: string,
  maxRedirects: number,
): Promise<string | null> {
  let currentUrl = initialUrl;
  const signal = AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS);

  for (let step = 0; step < maxRedirects; step++) {
    const resolvedCode = extractInviteCode(currentUrl);
    if (resolvedCode !== currentUrl) {
      return resolvedCode;
    }

    const response: Response | null = await fetch(currentUrl, {
      redirect: "manual",
      signal,
    }).catch(() => null);

    if (!response || !isRedirectStatus(response.status)) {
      return null;
    }

    const location: string | null = response.headers.get("location");
    if (!location) {
      return null;
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  const finalCode = extractInviteCode(currentUrl);
  return finalCode !== currentUrl ? finalCode : null;
}

function isDiscordInviteResponse(
  value: unknown,
): value is DiscordInviteResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string"
  );
}

export async function resolveDiscordInviteCode(
  inviteUrlOrCode: string,
  maxRedirects = 5,
): Promise<string | null> {
  const directCode = extractInviteCode(inviteUrlOrCode);
  if (
    directCode !== inviteUrlOrCode ||
    RAW_DISCORD_INVITE_CODE_PATTERN.test(inviteUrlOrCode)
  ) {
    return directCode;
  }

  const initialUrl = normalizeInviteUrl(inviteUrlOrCode);
  if (!initialUrl) {
    return null;
  }

  const resolutionKey = `${maxRedirects}:${initialUrl}`;
  return getCachedValue({
    cacheKey: getDiscordCacheKey("invite-resolution", resolutionKey),
    load: () => followInviteRedirects(initialUrl, maxRedirects),
    pendingLoads: pendingInviteResolutions,
    successTtlSeconds: DISCORD_INVITE_RESOLUTION_CACHE_TTL_SECONDS,
  });
}

export async function fetchDiscordInvite(
  inviteUrlOrCode: string,
): Promise<DiscordInviteResponse | null> {
  const inviteCode = await resolveDiscordInviteCode(inviteUrlOrCode);
  if (!inviteCode) {
    return null;
  }

  return getCachedValue({
    cacheKey: getDiscordCacheKey("invite", inviteCode),
    load: async () => {
      const token = process.env.DISCORD_BOT_TOKEN;
      const headers: HeadersInit = {};

      if (token) {
        headers.Authorization = `Bot ${token}`;
      }

      const response = await fetch(
        `${DISCORD_API_BASE}/invites/${inviteCode}?with_counts=true`,
        {
          headers,
          signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS),
        },
      ).catch(() => null);

      if (!response?.ok) {
        return null;
      }

      const invite: unknown = await response.json().catch(() => null);
      return isDiscordInviteResponse(invite) ? invite : null;
    },
    pendingLoads: pendingInviteLookups,
    successTtlSeconds: DISCORD_INVITE_CACHE_TTL_SECONDS,
  });
}

/**
 * Extracts the invite code from a Discord invite URL.
 * Supports formats: discord.gg/CODE, discord.com/invite/CODE
 */
export function extractInviteCode(url: string): string {
  const match = url.match(DISCORD_INVITE_URL_PATTERN);
  return match?.[1] ?? url;
}
