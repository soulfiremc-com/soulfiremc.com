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

test("keeps URLs without secret parameters and dropped events unchanged", () => {
  const url = "https://soulfiremc.com/docs?tokens=1&barcode=2&q=token";
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
