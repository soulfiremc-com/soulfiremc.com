import { TestClock } from "effect/testing";
import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Fiber, Result, Schema } from "effect";
import {
  requestJson,
  requestText,
  requestVoid,
  type RequestFetch,
} from "@/lib/backend-http";

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

await test("Effect-clock deadlines release pending headers even if transport ignores abort", async () => {
  let signal: AbortSignal | null | undefined;
  let calls = 0;
  const fetcher: RequestFetch = (_url, init) => {
    calls++;
    signal = init?.signal;
    return new Promise(() => undefined);
  };
  await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* requestText("https://example.com", {
        fetch: fetcher,
      }).pipe(Effect.result, Effect.forkChild);
      yield* TestClock.adjust("5 seconds");
      const result = yield* Fiber.join(fiber);
      assert.ok(Result.isFailure(result));
      assert.equal(result.failure.reason, "timeout");
    }).pipe(Effect.provide(TestClock.layer())),
  );
  assert.equal(signal?.aborted, true);
  assert.equal(calls, 1);
});

await test("body deadlines cancel and unlock a stream without relying on transport abort support", async () => {
  let cancelled = 0;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("partial"));
    },
    cancel() {
      cancelled++;
    },
  });
  await Effect.runPromise(
    Effect.gen(function* () {
      const fiber = yield* requestText("https://example.com", {
        fetch: async () => new Response(body),
      }).pipe(Effect.result, Effect.forkChild);
      yield* TestClock.adjust("5 seconds");
      const result = yield* Fiber.join(fiber);
      assert.ok(Result.isFailure(result));
      assert.equal(result.failure.reason, "timeout");
    }).pipe(Effect.provide(TestClock.layer())),
  );
  assert.equal(cancelled, 1);
  assert.equal(body.locked, false);
});

await test("a response arriving after caller cancellation is closed and discarded", async () => {
  let start!: () => void;
  let finish!: (response: Response) => void;
  let closed!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const cancelled = new Promise<void>((resolve) => {
    closed = resolve;
  });
  const controller = new AbortController();
  const result = Effect.runPromiseExit(
    requestText("https://example.com", {
      fetch: () => {
        start();
        return pending;
      },
    }),
    { signal: controller.signal },
  );
  await started;
  controller.abort();
  await result;
  finish(
    new Response(
      new ReadableStream({
        cancel() {
          closed();
        },
      }),
    ),
  );
  await cancelled;
});

await test("oversized responses close their reader without replaying the request", async () => {
  let calls = 0;
  let closed = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(11));
    },
    cancel() {
      closed = true;
    },
  });
  await assert.rejects(
    Effect.runPromise(
      requestText("https://example.com", {
        maxBytes: 10,
        fetch: async () => {
          calls++;
          return new Response(body);
        },
      }),
    ),
    { reason: "decode", retryable: false },
  );
  assert.equal(calls, 1);
  assert.equal(closed, true);
  assert.equal(body.locked, false);
});
