import assert from "node:assert/strict";
import test from "node:test";
import { detectDownloadPlatform } from "@/lib/download-platform";

await test("phones and tablets do not receive desktop platform recommendations", () => {
  for (const browser of [
    {
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36",
      platform: "Linux armv8l",
    },
    {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
    },
    {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
      platform: "iPad",
    },
    {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    },
  ]) {
    assert.deepEqual(detectDownloadPlatform(browser), {
      mobile: true,
      os: null,
      cpu: null,
    });
  }
});

await test("desktop recommendations retain OS and architecture detection", () => {
  assert.deepEqual(
    detectDownloadPlatform({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
    }),
    { mobile: false, os: "windows", cpu: "x64" },
  );
  assert.deepEqual(
    detectDownloadPlatform({
      userAgent: "Mozilla/5.0 (X11; Linux aarch64)",
      platform: "Linux aarch64",
    }),
    { mobile: false, os: "linux", cpu: "arm64" },
  );
  assert.deepEqual(
    detectDownloadPlatform({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    { mobile: false, os: "macos", cpu: null },
  );
  assert.deepEqual(detectDownloadPlatform({ userAgent: "unknown" }), {
    mobile: false,
    os: null,
    cpu: null,
  });
});
