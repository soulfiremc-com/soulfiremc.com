import assert from "node:assert/strict";
import test from "node:test";
import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth/minimal";
import { captcha, emailOTP, username } from "better-auth/plugins";
import { CAPTCHA_ENDPOINTS } from "@/lib/auth/captcha-endpoints";

function createAuth() {
  return betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-secret-that-is-long-enough-for-better-auth",
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
    rateLimit: { enabled: false },
    emailAndPassword: { enabled: true },
    plugins: [
      username(),
      emailOTP({ sendVerificationOTP: async () => {} }),
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: "test-turnstile-secret",
        endpoints: CAPTCHA_ENDPOINTS,
      }),
    ],
  });
}

function post(path: string, body: unknown) {
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

await test("sign-in and reset endpoints reject requests without a captcha token", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ success: true })),
  );
  const auth = createAuth();
  const requests: [string, unknown][] = [
    ["/sign-in/email", { email: "a@example.com", password: "password123" }],
    ["/sign-in/username", { username: "someone", password: "password123" }],
    [
      "/sign-up/email",
      { email: "a@example.com", password: "password123", name: "A" },
    ],
    ["/request-password-reset", { email: "a@example.com" }],
    ["/email-otp/request-password-reset", { email: "a@example.com" }],
    ["/forget-password/email-otp", { email: "a@example.com" }],
  ];
  for (const [path, body] of requests) {
    const response = await auth.handler(post(path, body));
    assert.equal(response.status, 400, path);
    const error = await response.json<{ code?: string }>();
    assert.equal(error.code, "MISSING_RESPONSE", path);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

await test("email OTP resends work without a captcha token", async () => {
  const auth = createAuth();
  const response = await auth.handler(
    post("/email-otp/send-verification-otp", {
      email: "a@example.com",
      type: "email-verification",
    }),
  );
  assert.equal(response.status, 200);
});
