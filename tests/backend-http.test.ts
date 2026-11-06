import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import { requestJson, requestText, requestVoid } from "@/lib/backend-http";

await test("HTTP timeouts abort the transport without starting another attempt", async (t) => {
  let signal: AbortSignal | undefined;
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    (_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    },
  );
  await assert.rejects(
    Effect.runPromise(requestText("https://example.com", { timeoutMs: 20 })),
    { reason: "timeout" },
  );
  assert.equal(signal?.aborted, true);
  assert.equal(fetch.mock.callCount(), 1);
});

await test("HTTP timeouts cover streaming response bodies", async (t) => {
  let aborted = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () => {
            aborted = true;
            controller.error(new Error("aborted"));
          });
        },
      });
      return new Response(body);
    },
  );
  await assert.rejects(
    Effect.runPromise(requestText("https://example.com", { timeoutMs: 20 })),
    { reason: "timeout" },
  );
  assert.equal(aborted, true);
});

await test("HTTP retries network failures but never repeats writes or ignores Retry-After", async (t) => {
  let calls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    if (++calls === 1) throw new TypeError("Network unavailable");
    return new Response("ok");
  });
  assert.equal(
    await Effect.runPromise(requestText("https://example.com")),
    "ok",
  );
  assert.equal(calls, 2);

  fetch.mock.mockImplementation(
    async () => new Response(null, { status: 503 }),
  );
  await assert.rejects(
    Effect.runPromise(
      requestVoid("https://example.com", { init: { method: "POST" } }),
    ),
    { reason: "status" },
  );
  assert.equal(fetch.mock.callCount(), 3);

  fetch.mock.mockImplementation(
    async () =>
      new Response(null, { status: 503, headers: { "Retry-After": "60" } }),
  );
  await assert.rejects(Effect.runPromise(requestText("https://example.com")), {
    reason: "status",
  });
  assert.equal(fetch.mock.callCount(), 4);
});

await test("invalid JSON is a decode failure rather than a retryable network failure", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("not JSON"),
  );
  await assert.rejects(
    Effect.runPromise(requestJson("https://example.com", Schema.Unknown)),
    { reason: "decode" },
  );
  assert.equal(fetch.mock.callCount(), 1);
});

await test("HTTP retries a broken response stream and preserves status errors when cleanup fails", async (t) => {
  let calls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    if (++calls > 1) return new Response("complete");
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new TypeError("Connection closed"));
        },
      }),
    );
  });
  assert.equal(
    await Effect.runPromise(requestText("https://example.com")),
    "complete",
  );
  assert.equal(calls, 2);
  fetch.mock.mockImplementation(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            throw new Error("Cleanup failed");
          },
        }),
        { status: 404 },
      ),
  );
  await assert.rejects(Effect.runPromise(requestText("https://example.com")), {
    reason: "status",
    status: 404,
  });
  assert.equal(fetch.mock.callCount(), 3);
});
