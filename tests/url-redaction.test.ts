import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecretUrls } from "../src/lib/integrations/url-redaction";

test("removes reset tokens from page and referrer URLs", () => {
  const timestamp = new Date("2026-01-01T00:00:00Z");
  const result = redactSecretUrls({
    uuid: "pageview",
    event: "$pageview",
    properties: {
      $current_url:
        "https://soulfiremc.com/auth/reset-password?token=secret-1&lang=de",
      $referrer: "https://soulfiremc.com/auth/callback?code=secret-2",
      $exception_list: [
        { value: "Failed at /auth/reset-password?token=secret-3" },
      ],
      $pathname: "/auth/reset-password",
      count: 2,
    },
    $set_once: {
      $initial_current_url:
        "https://soulfiremc.com/auth/reset-password?lang=de&TOKEN=secret-4#top",
    },
    timestamp,
  });

  assert.ok(result);
  assert.deepEqual(result.properties, {
    $current_url:
      "https://soulfiremc.com/auth/reset-password?token=redacted&lang=de",
    $referrer: "https://soulfiremc.com/auth/callback?code=redacted",
    $exception_list: [
      { value: "Failed at /auth/reset-password?token=redacted" },
    ],
    $pathname: "/auth/reset-password",
    count: 2,
  });
  assert.deepEqual(result.$set_once, {
    $initial_current_url:
      "https://soulfiremc.com/auth/reset-password?lang=de&TOKEN=redacted#top",
  });
  assert.equal(result.timestamp, timestamp);
});

test("removes tokens from URL-encoded nested redirect parameters", () => {
  const result = redactSecretUrls({
    uuid: "pageview",
    event: "$pageview",
    properties: {
      $current_url:
        "https://soulfiremc.com/auth/sign-in?redirectTo=%2Fauth%2Freset-password%3Flang%3Dde%26token%3Dsecret-1%26next%3D1&lang=de",
      $referrer:
        "https://soulfiremc.com/auth/sign-in?redirectTo=%2Fauth%2Fcallback%3Fcode%3Dsecret-2",
      double:
        "https://soulfiremc.com/out?to=https%3A%2F%2Fx.test%2F%3Fnext%3D%252Freset%253Ftoken%253Dsecret-3%2523top",
      lowercase: "/auth/sign-in?redirectTo=%2freset%3ftoken%3dsecret-4",
    },
  });

  assert.ok(result);
  assert.deepEqual(result.properties, {
    $current_url:
      "https://soulfiremc.com/auth/sign-in?redirectTo=%2Fauth%2Freset-password%3Flang%3Dde%26token%3Dredacted%26next%3D1&lang=de",
    $referrer:
      "https://soulfiremc.com/auth/sign-in?redirectTo=%2Fauth%2Fcallback%3Fcode%3Dredacted",
    double:
      "https://soulfiremc.com/out?to=https%3A%2F%2Fx.test%2F%3Fnext%3D%252Freset%253Ftoken%253Dredacted%2523top",
    lowercase: "/auth/sign-in?redirectTo=%2freset%3ftoken%3dredacted",
  });
});

test("keeps URLs without secret parameters and dropped events unchanged", () => {
  const url =
    "https://soulfiremc.com/docs?tokens=1&barcode=2&q=token&r=%2Fa%3Ftokens%3D1%26barcode%3D2";
  const result = redactSecretUrls({
    uuid: "pageview",
    event: "$pageview",
    properties: { $current_url: url },
  });

  assert.ok(result);
  assert.equal(result.properties["$current_url"], url);
  assert.equal("$set" in result, false);
  assert.equal(redactSecretUrls(null), null);
});
