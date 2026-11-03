import assert from "node:assert/strict";
import { test } from "node:test";
import type { CaptureResult } from "posthog-js";
import { attributeWebVitals } from "../src/lib/web-vitals-attribution";

function event(properties: CaptureResult["properties"]): CaptureResult {
  return {
    uuid: "vitals-event",
    event: "$web_vitals",
    timestamp: new Date("2026-11-02T13:48:02Z"),
    properties: {
      $current_url: "https://soulfiremc.com/get-proxies",
      $pathname: "/get-proxies",
      $host: "soulfiremc.com",
      $session_id: "session-id",
      ...properties,
    },
  };
}

await test("attributes delayed metrics to their measured navigation without changing the measurement", () => {
  const measurement = {
    navigationURL: "https://soulfiremc.com/get-accounts?sort=price-asc",
    id: "cls-id",
    value: 0.55,
  };
  const original = event({
    $web_vitals_CLS_value: 0.55,
    $web_vitals_CLS_event: measurement,
  });
  const result = attributeWebVitals(original)!;
  assert.equal(result.properties.$pathname, "/get-accounts");
  assert.equal(result.properties.$current_url, measurement.navigationURL);
  assert.equal(result.properties.$web_vitals_CLS_pathname, "/get-accounts");
  assert.equal(
    result.properties.$web_vitals_CLS_url,
    measurement.navigationURL,
  );
  assert.equal(result.properties.$web_vitals_CLS_value, 0.55);
  assert.equal(result.properties.$web_vitals_CLS_event, measurement);
  assert.equal(result.properties.$session_id, "session-id");
  assert.equal(result.timestamp, original.timestamp);
  assert.equal(result.uuid, original.uuid);
  assert.equal(original.properties.$pathname, "/get-proxies");
});

await test("zero-valued metrics use their embedded URL when navigationURL is absent", () => {
  const result = attributeWebVitals(
    event({
      $web_vitals_CLS_value: 0,
      $web_vitals_CLS_event: {
        $current_url: "https://soulfiremc.com/download",
      },
    }),
  )!;
  assert.equal(result.properties.$pathname, "/download");
  assert.equal(result.properties.$web_vitals_CLS_value, 0);
});

await test("a shared navigation can attribute multiple metrics", () => {
  const metadata = { navigationURL: "https://soulfiremc.com/" };
  const result = attributeWebVitals(
    event({
      $web_vitals_LCP_value: 1300,
      $web_vitals_LCP_event: metadata,
      $web_vitals_INP_value: 104,
      $web_vitals_INP_event: metadata,
    }),
  )!;
  assert.equal(result.properties.$pathname, "/");
  assert.equal(result.properties.$web_vitals_page_attribution, "navigation");
});

await test("mixed-navigation batches retain each metric without claiming a shared page", () => {
  const result = attributeWebVitals(
    event({
      $web_vitals_LCP_value: 1300,
      $web_vitals_LCP_event: { navigationURL: "https://soulfiremc.com/" },
      $web_vitals_CLS_value: 0.2,
      $web_vitals_CLS_event: {
        navigationURL: "https://soulfiremc.com/download",
      },
    }),
  )!;
  assert.equal(result.properties.$web_vitals_LCP_pathname, "/");
  assert.equal(result.properties.$web_vitals_CLS_pathname, "/download");
  assert.equal(result.properties.$web_vitals_LCP_value, 1300);
  assert.equal(result.properties.$web_vitals_CLS_value, 0.2);
  assert.equal(result.properties.$web_vitals_page_attribution, "mixed");
  assert.equal(result.properties.$pathname, undefined);
  assert.equal(result.properties.$current_url, undefined);
});

await test("partially missing navigation cannot misattribute another metric", () => {
  const result = attributeWebVitals(
    event({
      $web_vitals_LCP_value: 1300,
      $web_vitals_LCP_event: { navigationURL: "https://soulfiremc.com/" },
      $web_vitals_CLS_value: 0.2,
    }),
  )!;
  assert.equal(result.properties.$web_vitals_page_attribution, "incomplete");
  assert.equal(result.properties.$pathname, undefined);
  assert.equal(result.properties.$web_vitals_CLS_value, 0.2);
});

await test("missing, malformed, and unsupported URLs preserve legacy measurements", () => {
  for (const navigationURL of [
    undefined,
    "/relative",
    "invalid",
    "data:text/plain,x",
  ]) {
    const original = event({
      $web_vitals_LCP_value: 1300,
      $web_vitals_LCP_event: { navigationURL },
    });
    assert.deepEqual(attributeWebVitals(original), original);
  }
});

await test("non-vital events and dropped events remain unchanged", () => {
  const pageview = { ...event({}), event: "$pageview" };
  assert.equal(attributeWebVitals(pageview), pageview);
  assert.equal(attributeWebVitals(null), null);
});
