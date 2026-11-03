import type { CaptureResult } from "posthog-js";

const METRICS = ["CLS", "FCP", "INP", "LCP"] as const;

function getNavigationUrl(measurement: unknown): URL | null {
  if (!measurement || typeof measurement !== "object") return null;

  const metadata = measurement as Record<string, unknown>;
  const value = metadata.navigationURL ?? metadata.$current_url;
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export function attributeWebVitals(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event || event.event !== "$web_vitals") return event;

  const properties = { ...event.properties };
  const urls = new Map<string, URL>();
  let missingNavigation = false;

  for (const metric of METRICS) {
    const value = properties[`$web_vitals_${metric}_value`] as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;

    const url = getNavigationUrl(properties[`$web_vitals_${metric}_event`]);
    if (!url) {
      missingNavigation = true;
      continue;
    }

    properties[`$web_vitals_${metric}_url`] = url.href;
    properties[`$web_vitals_${metric}_pathname`] = url.pathname;
    urls.set(url.href, url);
  }

  if (urls.size === 1 && !missingNavigation) {
    const url = [...urls.values()][0];
    properties.$current_url = url.href;
    properties.$pathname = url.pathname;
    properties.$host = url.host;
    properties.$web_vitals_page_attribution = "navigation";
  } else if (urls.size > 0) {
    // A batch can contain measurements from different navigations. Keep their
    // metric-specific URLs instead of assigning every value to one page.
    delete properties.$current_url;
    delete properties.$pathname;
    properties.$web_vitals_page_attribution = missingNavigation
      ? "incomplete"
      : "mixed";
  }

  return { ...event, properties };
}
