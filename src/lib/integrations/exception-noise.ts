import type { CaptureResult } from "posthog-js";

/**
 * Browser translators rewrite text nodes before or during hydration. Chrome
 * marks the root element, Google Translate wraps text in `<font>` elements,
 * and Edge (Microsoft Translator) adds `_msttexthash` or `_msthash` attributes.
 */
export function isMachineTranslated(doc: Document | undefined): boolean {
  if (!doc?.documentElement) return false;
  const root = doc.documentElement;
  if (
    root.classList.contains("translated-ltr") ||
    root.classList.contains("translated-rtl")
  ) {
    return true;
  }

  try {
    return (
      doc.querySelector(
        '[_msttexthash], [_msthash], font[style="vertical-align: inherit;"]',
      ) !== null
    );
  } catch {
    return false;
  }
}

const HYDRATION_ERROR =
  /react\.dev\/errors\/(?:418|423|425)\b|Hydration failed|didn't match the client/i;

type ExceptionFrame = { filename?: unknown };
type Exception = {
  value?: unknown;
  stacktrace?: { frames?: ExceptionFrame[] } | null;
};

const EXTENSION_URL =
  /^(?:chrome|moz|safari|safari-web|ms-browser)-extension:\/\//;

function framesOf(exception: Exception): string[] {
  const frames = exception.stacktrace?.frames;
  if (!Array.isArray(frames)) return [];
  return frames
    .map((frame) => frame?.filename)
    .filter((filename): filename is string => typeof filename === "string");
}

/**
 * Returns why an exception cannot point at SoulFire code, or null when it may.
 *
 * - `opaque_cross_origin`: the browser hides cross-origin script errors as
 *   "Script error." without a stack, so nothing in them is actionable.
 * - `browser_extension`: every stack frame belongs to an extension.
 * - `wallet_injection`: wallet extensions and in-app browsers inject scripts
 *   that touch `window.ethereum`. The site's own wallet code ships in bundled
 *   `/assets/` files, so a frame there keeps the error.
 */
export function classifyExceptionNoise(exception: Exception): string | null {
  const message = typeof exception.value === "string" ? exception.value : "";
  const files = framesOf(exception);

  if (message === "Script error." && files.length === 0) {
    return "opaque_cross_origin";
  }
  if (files.length > 0 && files.every((file) => EXTENSION_URL.test(file))) {
    return "browser_extension";
  }
  if (
    message.includes("window.ethereum") &&
    !files.some((file) => file.includes("/assets/"))
  ) {
    return "wallet_injection";
  }
  return null;
}

/**
 * Drops `$exception` events that cannot be fixed in this codebase and tags
 * the rest with whether a browser translator had changed the page.
 *
 * A hydration error on a machine-translated page is dropped because the
 * translator changed the server HTML before React compared it. Hydration
 * errors on untranslated pages and every other error still reach PostHog.
 */
export function filterExceptionNoise(
  event: CaptureResult | null,
  doc: Document | undefined = typeof document === "undefined"
    ? undefined
    : document,
): CaptureResult | null {
  if (event?.event !== "$exception") return event;

  const exceptions = event.properties.$exception_list as unknown;
  const list = Array.isArray(exceptions) ? (exceptions as Exception[]) : [];
  if (list.length > 0 && list.every((item) => classifyExceptionNoise(item))) {
    return null;
  }

  const recorded = event.properties.document_translated as unknown;
  const translated =
    typeof recorded === "boolean" ? recorded : isMachineTranslated(doc);
  if (
    translated &&
    list.some(
      (item) =>
        typeof item.value === "string" && HYDRATION_ERROR.test(item.value),
    )
  ) {
    return null;
  }

  return {
    ...event,
    properties: { ...event.properties, document_translated: translated },
  };
}
