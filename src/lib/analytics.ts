import { getClientDownloadMeasurement } from "./download-measurement";
import { captureAnalyticsEvent } from "./integrations/posthog";

export function trackClientDownload(
  selection: Parameters<typeof getClientDownloadMeasurement>[0],
) {
  try {
    const measurement = getClientDownloadMeasurement(selection);
    if (measurement) {
      captureAnalyticsEvent(measurement.event, measurement.properties);
    }
  } catch {
    // Analytics must not prevent an installer or store from opening.
  }
}
