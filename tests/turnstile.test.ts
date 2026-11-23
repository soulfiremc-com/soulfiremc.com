import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import {
  getExpectedTurnstileHostname,
  validateTurnstileTokenEffect,
} from "@/lib/turnstile";

const validateTurnstileToken = (
  input: Parameters<typeof validateTurnstileTokenEffect>[0],
) =>
  Effect.runPromise(
    validateTurnstileTokenEffect(input).pipe(
      Effect.match({
        onFailure: (error) => ({
          success: false,
          errorCodes: error.errorCodes,
        }),
        onSuccess: () => ({ success: true, errorCodes: [] as string[] }),
      }),
    ),
  );

await test("Turnstile validates tokens and configuration before making requests", async (t) => {
  const original = process.env["REVIEW_TURNSTILE_SECRET_KEY"];
  t.after(() => {
    if (original === undefined)
      delete process.env["REVIEW_TURNSTILE_SECRET_KEY"];
    else process.env["REVIEW_TURNSTILE_SECRET_KEY"] = original;
  });
  delete process.env["REVIEW_TURNSTILE_SECRET_KEY"];
  const fetch = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ success: true })),
  );
  for (const token of ["", "x".repeat(2049)]) {
    assert.deepEqual(await validateTurnstileToken({ token }), {
      success: false,
      errorCodes: ["invalid-input-response"],
    });
  }
  assert.deepEqual(await validateTurnstileToken({ token: "token" }), {
    success: false,
    errorCodes: ["missing-input-secret"],
  });
  assert.equal(fetch.mock.callCount(), 0);
});

await test("Turnstile checks response schemas, action and hostname without retrying tokens", async (t) => {
  const original = process.env["REVIEW_TURNSTILE_SECRET_KEY"];
  process.env["REVIEW_TURNSTILE_SECRET_KEY"] = "test-secret";
  t.after(() => {
    if (original === undefined)
      delete process.env["REVIEW_TURNSTILE_SECRET_KEY"];
    else process.env["REVIEW_TURNSTILE_SECRET_KEY"] = original;
  });
  const input = {
    token: "token",
    remoteIp: "192.0.2.1",
    expectedAction: "review",
    expectedHostname: "example.com",
  };
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    (_url: string, init: RequestInit) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
      const form = init.body as FormData;
      assert.equal(init.method, "POST");
      assert.equal(init.cache, "no-store");
      assert.equal(form.get("secret"), "test-secret");
      assert.equal(form.get("response"), "token");
      assert.equal(form.get("remoteip"), "192.0.2.1");
      assert.ok(form.get("idempotency_key"));
      assert.ok(init.signal instanceof AbortSignal);
      return Promise.resolve(
        Response.json({
          success: true,
          action: "review",
          hostname: "example.com",
        }),
      );
    },
  );
  assert.deepEqual(await validateTurnstileToken(input), {
    success: true,
    errorCodes: [],
  });

  for (const [payload, expected] of [
    [
      { success: false, "error-codes": ["timeout-or-duplicate"] },
      "timeout-or-duplicate",
    ],
    [
      { success: true, action: "other", hostname: "example.com" },
      "action-mismatch",
    ],
    [
      { success: true, action: "review", hostname: "other.com" },
      "hostname-mismatch",
    ],
    [{ success: "true" }, "internal-error"],
  ] as const) {
    fetch.mock.mockImplementation(() =>
      Promise.resolve(Response.json(payload)),
    );
    assert.deepEqual(await validateTurnstileToken(input), {
      success: false,
      errorCodes: [expected],
    });
  }
  const before = fetch.mock.callCount();
  fetch.mock.mockImplementation(() =>
    Promise.resolve(new Response(null, { status: 503 })),
  );
  assert.deepEqual(await validateTurnstileToken(input), {
    success: false,
    errorCodes: ["internal-error"],
  });
  assert.equal(fetch.mock.callCount(), before + 1);
});

await test("Turnstile expects the bare request hostname without its port", () => {
  assert.equal(
    getExpectedTurnstileHostname("SoulFireMC.com"),
    "soulfiremc.com",
  );
  assert.equal(
    getExpectedTurnstileHostname("preview.example.com:8443"),
    "preview.example.com",
  );
  for (const host of ["localhost:3000", "127.0.0.1:8787", "[::1]:3000"]) {
    assert.equal(getExpectedTurnstileHostname(host), null);
  }
});
