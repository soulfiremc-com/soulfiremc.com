import type { PostHog, Properties } from "posthog-js";
import {
  filterExceptionNoise,
  isMachineTranslated,
} from "@/lib/integrations/exception-noise";
import { redactSecretUrls } from "@/lib/integrations/url-redaction";
import { attributeWebVitals } from "@/lib/web-vitals-attribution";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
export const isPostHogConfigured = Boolean(POSTHOG_KEY);

export type AnalyticsConsent = "granted" | "denied" | "pending";

// PostHog's own consent key, so choices made before lazy loading still apply.
const CONSENT_STORAGE_KEY = `__ph_opt_in_out_${POSTHOG_KEY}`;

/** Reads the stored consent choice without loading posthog-js. */
export function readAnalyticsConsent(): AnalyticsConsent {
  if (!isPostHogConfigured || typeof window === "undefined") return "pending";
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === null) return "pending";
    const value = String(JSON.parse(raw)).toLowerCase();
    if (["1", "true", "yes"].includes(value)) return "granted";
    if (["0", "false", "no"].includes(value)) return "denied";
  } catch {
    // Unreadable storage behaves like a first visit.
  }
  return "pending";
}

let client: Promise<PostHog | null> | null = null;

/**
 * Loads and initializes posthog-js once. It is kept out of the entry chunk and
 * loads only after the visitor has answered the consent banner.
 */
function loadPostHog(): Promise<PostHog | null> {
  if (!POSTHOG_KEY || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        before_send: [
          filterExceptionNoise,
          attributeWebVitals,
          redactSecretUrls,
        ],
        api_host: "https://t.soulfiremc.com",
        ui_host: "https://eu.posthog.com",
        defaults: "2025-05-24",
        capture_exceptions: true,
        debug: import.meta.env.DEV,
        cookieless_mode: "on_reject",
        loaded: (instance) => {
          instance.register({ app_version: import.meta.env.VITE_APP_VERSION });
        },
      });
      // With pending consent, cookieless_mode "on_reject" drops every capture,
      // so queued errors wait until the visitor answers the banner.
      if (posthog.is_capturing()) flushEarlyExceptions(posthog);
      return posthog;
    })
    .catch(() => {
      // A failed chunk load may be temporary, so a later call can retry.
      client = null;
      return null;
    });
  return client;
}

/** Stores the visitor's banner choice and sends errors queued before it. */
export async function applyAnalyticsConsent(
  status: "granted" | "denied",
): Promise<PostHog | null> {
  const posthog = await loadPostHog();
  if (!posthog) return null;
  if (status === "granted") posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
  flushEarlyExceptions(posthog);
  return posthog;
}

/** Captures an event once consent is known. Pending consent drops it. */
export function captureAnalyticsEvent(event: string, properties?: Properties) {
  if (readAnalyticsConsent() === "pending") return;
  void loadPostHog().then((posthog) => posthog?.capture(event, properties));
}

type PendingException = { error: unknown; properties: Properties };
const MAX_EARLY_EXCEPTIONS = 10;
let earlyExceptions: PendingException[] | null = null;

function rememberException(error: unknown, properties: Properties) {
  if (earlyExceptions && earlyExceptions.length < MAX_EARLY_EXCEPTIONS) {
    earlyExceptions.push({ error, properties });
  }
}

function onEarlyError(event: ErrorEvent) {
  // Errors without an Error object are opaque cross-origin "Script error."
  // reports, which the noise filter would drop anyway.
  if (event.error) rememberException(event.error, translationContext());
}

function onEarlyRejection(event: PromiseRejectionEvent) {
  rememberException(event.reason, translationContext());
}

function translationContext(): Properties {
  return { document_translated: isMachineTranslated(document) };
}

function flushEarlyExceptions(posthog: PostHog) {
  window.removeEventListener("error", onEarlyError);
  window.removeEventListener("unhandledrejection", onEarlyRejection);
  const pending = earlyExceptions ?? [];
  earlyExceptions = null;
  for (const { error, properties } of pending) {
    posthog.captureException(error, properties);
  }
}

/**
 * Reports an error that the app caught itself, such as a recoverable React
 * error. Before posthog-js loads, the error waits in a short queue.
 */
export function captureAnalyticsException(
  error: unknown,
  properties: Properties = {},
) {
  if (!isPostHogConfigured || typeof window === "undefined") return;
  const withContext = { ...properties, ...translationContext() };
  if (earlyExceptions) {
    rememberException(error, withContext);
    if (readAnalyticsConsent() === "pending") return;
    void loadPostHog();
    return;
  }
  // oxlint-disable-next-line promise/no-promise-in-callback -- error is the reported exception, not a Node-style callback error
  void loadPostHog().then((posthog) =>
    posthog?.captureException(error, withContext),
  );
}

function whenIdle(callback: () => void) {
  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 3000 });
    } else {
      setTimeout(callback, 1000);
    }
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

if (isPostHogConfigured && typeof window !== "undefined") {
  // PostHog's exception autocapture starts only after the lazy load, so keep
  // the first few uncaught errors until then.
  earlyExceptions = [];
  window.addEventListener("error", onEarlyError);
  window.addEventListener("unhandledrejection", onEarlyRejection);

  // Returning visitors already chose. Load after the page settles so analytics
  // does not compete with hydration. First visits wait for the banner.
  if (readAnalyticsConsent() !== "pending") whenIdle(() => void loadPostHog());
}
