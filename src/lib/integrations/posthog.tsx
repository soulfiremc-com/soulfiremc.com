import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { attributeWebVitals } from "@/lib/web-vitals-attribution";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
export const isPostHogConfigured = Boolean(POSTHOG_KEY);

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    before_send: attributeWebVitals,
    api_host: "https://t.soulfiremc.com",
    ui_host: "https://eu.posthog.com",
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: import.meta.env.DEV,
    cookieless_mode: "on_reject",
    loaded: (client) => {
      client.register({ app_version: import.meta.env.VITE_APP_VERSION });
    },
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return children;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
