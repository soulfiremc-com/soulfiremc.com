import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "https://t.soulfiremc.com",
    ui_host: "https://eu.posthog.com",
    defaults: "2025-05-24",
    capture_exceptions: true,
    debug: import.meta.env.DEV,
    cookieless_mode: "on_reject",
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return children;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
