import assert from "node:assert/strict";
import test from "node:test";
import { fetchDiscordInvite, resolveDiscordInviteCode } from "@/lib/discord";

class MemoryCache {
  readonly entries = new Map<string, Response>();

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(this.getKey(request));
  }

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(this.getKey(request))?.clone();
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(this.getKey(request), response.clone());
  }

  private getKey(request: RequestInfo | URL): string {
    return request instanceof Request ? request.url : request.toString();
  }
}

const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
const originalFetch = globalThis.fetch;

function installCache(): MemoryCache {
  const cache = new MemoryCache();
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: { default: cache },
  });
  return cache;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCaches) {
    Object.defineProperty(globalThis, "caches", originalCaches);
  } else {
    Reflect.deleteProperty(globalThis, "caches");
  }
});

test("fetchDiscordInvite reuses a cached successful lookup", async () => {
  const cache = installCache();
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return Response.json({
      code: "cache-test-success",
      approximate_member_count: 1_234,
    });
  };

  const first = await fetchDiscordInvite("cache-test-success");
  const second = await fetchDiscordInvite("cache-test-success");

  assert.deepEqual(second, first);
  assert.equal(fetchCount, 1);
  assert.equal(cache.entries.size, 1);
  assert.equal(
    [...cache.entries.values()][0]?.headers.get("Cache-Control"),
    "public, max-age=600",
  );
});

test("fetchDiscordInvite briefly caches failed lookups", async () => {
  const cache = installCache();
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return new Response(null, { status: 404 });
  };

  assert.equal(await fetchDiscordInvite("cache-test-missing"), null);
  assert.equal(await fetchDiscordInvite("cache-test-missing"), null);
  assert.equal(fetchCount, 1);
  assert.equal(
    [...cache.entries.values()][0]?.headers.get("Cache-Control"),
    "public, max-age=60",
  );
});

test("resolveDiscordInviteCode caches vanity URL redirects", async () => {
  const cache = installCache();
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return new Response(null, {
      status: 302,
      headers: { Location: "https://discord.gg/cache-test-redirect" },
    });
  };

  const vanityUrl = "https://invite.example.com/community";
  assert.equal(
    await resolveDiscordInviteCode(vanityUrl),
    "cache-test-redirect",
  );
  assert.equal(
    await resolveDiscordInviteCode(vanityUrl),
    "cache-test-redirect",
  );
  assert.equal(fetchCount, 1);
  assert.equal(
    [...cache.entries.values()][0]?.headers.get("Cache-Control"),
    "public, max-age=86400",
  );
});

test("fetchDiscordInvite coalesces concurrent cache misses", async () => {
  installCache();
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    await Promise.resolve();
    return Response.json({ code: "cache-test-concurrent" });
  };

  const [first, second] = await Promise.all([
    fetchDiscordInvite("cache-test-concurrent"),
    fetchDiscordInvite("cache-test-concurrent"),
  ]);

  assert.deepEqual(second, first);
  assert.equal(fetchCount, 1);
});
