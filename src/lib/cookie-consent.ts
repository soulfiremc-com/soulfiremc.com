import { useSyncExternalStore } from "react";
import { readAnalyticsConsent } from "@/lib/integrations/posthog";

export const REOPEN_EVENT = "soulfire:cookie-consent-open";
export const CONSENT_CHANGE_EVENT = "soulfire:cookie-consent-change";

/** Shows the consent banner again so a visitor can change their choice. */
export function reopenCookieConsent() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

function subscribeToConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
}

/** Reads the current choice after hydration. Null until then. */
export function useAnalyticsConsent() {
  return useSyncExternalStore(
    subscribeToConsent,
    readAnalyticsConsent,
    () => null,
  );
}
