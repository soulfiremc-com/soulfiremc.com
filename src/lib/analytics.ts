import posthog from "posthog-js";
import { getClientDownloadMeasurement } from "./download-measurement";
import { isPostHogConfigured } from "./integrations/posthog";

export function trackClientDownload(
  selection: Parameters<typeof getClientDownloadMeasurement>[0],
) {
  if (!isPostHogConfigured || typeof window === "undefined") return;

  try {
    if (posthog.get_explicit_consent_status() === "pending") return;
    const measurement = getClientDownloadMeasurement(selection);
    if (measurement) {
      posthog.capture(measurement.event, measurement.properties);
    }
  } catch {
    // Analytics must not prevent an installer or store from opening.
  }
}
