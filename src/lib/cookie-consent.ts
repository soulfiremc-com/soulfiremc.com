import { useEffect, useState } from "react";
import {
  type AnalyticsConsent,
  readAnalyticsConsent,
} from "@/lib/integrations/posthog";

export const REOPEN_EVENT = "soulfire:cookie-consent-open";
export const CONSENT_CHANGE_EVENT = "soulfire:cookie-consent-change";

/** Shows the consent banner again so a visitor can change their choice. */
export function reopenCookieConsent() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

/** Reads the current choice after hydration. Null until then. */
export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  useEffect(() => {
    const update = () => setConsent(readAnalyticsConsent());
    update();
    window.addEventListener(CONSENT_CHANGE_EVENT, update);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, update);
  }, []);
  return consent;
}
