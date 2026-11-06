import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Exit, Fiber } from "effect";
import {
  exchangeDiscordCode,
  fetchDiscordInvite,
  fetchDiscordInviteEffect,
  getDiscordUser,
  pushLinkedRoleMetadata,
  resolveDiscordInviteCode,
} from "@/lib/discord";

await test("Discord validates OAuth responses and never retries a token exchange", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.equal(init.method, "POST");
      assert.ok(init.signal instanceof AbortSignal);
      assert.equal((init.body as URLSearchParams).get("code"), "one-use-code");
      return new Response(null, { status: 503 });
    },
  );
  await assert.rejects(
    exchangeDiscordCode("one-use-code", "https://example.com/callback"),
    { status: 503 },
  );
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.mockImplementation(async () =>
    Response.json({ access_token: "incomplete" }),
  );
  await assert.rejects(
    exchangeDiscordCode("code", "https://example.com/callback"),
    { reason: "decode" },
  );
});

await test("Discord user reads retry transient failures and metadata writes remain single attempts", async (t) => {
  let reads = 0;
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.equal(
        new Headers(init.headers).get("authorization"),
        "Bearer token",
      );
      if (++reads === 1) throw new TypeError("offline");
      return Response.json({
        id: "123",
        username: "bot",
        discriminator: "0",
        avatar: null,
      });
    },
  );
  assert.equal((await getDiscordUser("token")).id, "123");
  assert.equal(reads, 2);
  fetch.mock.mockImplementation(
    async () => new Response(null, { status: 503 }),
  );
  await assert.rejects(
    pushLinkedRoleMetadata("token", {
      platform_name: "SoulFire",
      platform_username: null,
      metadata: { verified_account: 0 },
    }),
    { status: 503 },
  );
  assert.equal(fetch.mock.callCount(), 3);
});

await test("Discord resolves relative redirects, bounds redirect loops, and accepts direct codes", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init: RequestInit) => {
      assert.equal(init.redirect, "manual");
      assert.ok(init.signal instanceof AbortSignal);
      return new Response(null, {
        status: 302,
        headers: {
          location: url.endsWith("/start")
            ? "/next"
            : "https://discord.gg/resolved-code",
        },
      });
    },
  );
  assert.equal(
    await resolveDiscordInviteCode("https://example.com/start"),
    "resolved-code",
  );
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(
    await resolveDiscordInviteCode("https://discord.gg/direct-code"),
    "direct-code",
  );
  assert.equal(await resolveDiscordInviteCode("raw-code"), "raw-code");
  assert.equal(await resolveDiscordInviteCode("invalid url"), null);
  assert.equal(fetch.mock.callCount(), 2);

  fetch.mock.mockImplementation(
    async () =>
      new Response(null, { status: 302, headers: { location: "/loop" } }),
  );
  assert.equal(
    await resolveDiscordInviteCode("https://example.com/loop", 3),
    null,
  );
  assert.equal(fetch.mock.callCount(), 5);
});

await test("concurrent Discord lookups share a request and release the slot after failure", async (t) => {
  let finish!: (response: Response) => void;
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const code = crypto.randomUUID();
  const lookups = [fetchDiscordInvite(code), fetchDiscordInvite(code)];
  finish(Response.json({ code, approximate_member_count: 42 }));
  assert.deepEqual(await Promise.all(lookups), [
    { code, approximate_member_count: 42 },
    { code, approximate_member_count: 42 },
  ]);
  assert.equal(fetch.mock.callCount(), 1);

  fetch.mock.mockImplementation(
    async () => new Response(null, { status: 404 }),
  );
  assert.deepEqual(
    await Promise.all([fetchDiscordInvite(code), fetchDiscordInvite(code)]),
    [null, null],
  );
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.mockImplementation(async () => Response.json({ code }));
  assert.deepEqual(await fetchDiscordInvite(code), { code });
  assert.equal(fetch.mock.callCount(), 3);
});

await test("interrupted Discord lookups release waiters and allow the next request", async (t) => {
  let signal: AbortSignal | undefined;
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    (_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    },
  );
  const code = crypto.randomUUID();
  const leader = Effect.runFork(fetchDiscordInviteEffect(code));
  const waiter = Effect.runPromise(Effect.exit(fetchDiscordInviteEffect(code)));
  await Effect.runPromise(Fiber.interrupt(leader));
  assert.equal(Exit.isFailure(await waiter), true);
  assert.equal(signal?.aborted, true);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.mockImplementation(async () => Response.json({ code }));
  assert.deepEqual(await fetchDiscordInvite(code), { code });
  assert.equal(fetch.mock.callCount(), 2);
});

await test("Discord retains Cloudflare cache TTLs, negative entries, and cache failure fallbacks", async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "caches");
  const entries = new Map<string, Response>();
  const deleted: string[] = [];
  let cacheUnavailable = false;
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      default: {
        async match(key: string) {
          if (cacheUnavailable) throw new Error("cache unavailable");
          return entries.get(key)?.clone();
        },
        async put(key: string, response: Response) {
          if (cacheUnavailable) throw new Error("cache unavailable");
          entries.set(key, response.clone());
        },
        async delete(key: string) {
          deleted.push(key);
          return entries.delete(key);
        },
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "caches", original);
    else Reflect.deleteProperty(globalThis, "caches");
  });
  const fetch = t.mock.method(globalThis, "fetch", async (url: string) =>
    url.startsWith("https://example.com")
      ? new Response(null, {
          status: 302,
          headers: { location: "https://discord.gg/cached-code" },
        })
      : Response.json({ code: "cached-code", approximate_member_count: 42 }),
  );
  assert.equal(
    (await fetchDiscordInvite("https://example.com/cache-test"))
      ?.approximate_member_count,
    42,
  );
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(
    (await fetchDiscordInvite("https://example.com/cache-test"))?.code,
    "cached-code",
  );
  assert.equal(fetch.mock.callCount(), 2);
  assert.deepEqual(
    [...entries.values()]
      .map((entry) => entry.headers.get("cache-control"))
      .sort((a, b) => (a ?? "").localeCompare(b ?? "")),
    ["public, max-age=600", "public, max-age=86400"],
  );

  const key = [...entries.keys()].find((key) =>
    key.endsWith("/invite/cached-code"),
  );
  assert.ok(key);
  entries.set(key, Response.json({ value: { code: 123 } }));
  fetch.mock.mockImplementation(async () =>
    Response.json({ code: "cached-code", approximate_member_count: "invalid" }),
  );
  assert.equal(await fetchDiscordInvite("cached-code"), null);
  assert.ok(deleted.includes(key));
  assert.equal(
    entries.get(key)?.headers.get("cache-control"),
    "public, max-age=60",
  );
  const count = fetch.mock.callCount();
  assert.equal(await fetchDiscordInvite("cached-code"), null);
  assert.equal(fetch.mock.callCount(), count);

  cacheUnavailable = true;
  fetch.mock.mockImplementation(async () =>
    Response.json({ code: "no-cache" }),
  );
  assert.deepEqual(await fetchDiscordInvite("no-cache"), { code: "no-cache" });
});
