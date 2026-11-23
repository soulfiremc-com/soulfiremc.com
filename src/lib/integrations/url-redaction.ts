import type { CaptureResult } from "posthog-js";

// Password reset links carry a one-time `token`, and OAuth redirects carry a
// `code`. Either one in a captured URL would let anyone with analytics access
// use it. A nested URL, such as `redirectTo=%2Freset%3Ftoken%3D...`, encodes
// the separators as `%3F`, `%26`, `%23`, and `%3D`, once per encoding level
// (`%253F` when encoded twice).
const ENCODED = "%(?:25)*";
const SECRET_QUERY_PARAM = new RegExp(
  String.raw`((?:[?&#]|${ENCODED}(?:3F|26|23))(?:token|code)(?:=|${ENCODED}3D))(?:(?!${ENCODED}(?:26|23))[^&#\s"'<>])*`,
  "giu",
);

function redactSecretQueryParams(value: string): string {
  return value.replaceAll(SECRET_QUERY_PARAM, "$1redacted");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactSecretQueryParams(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  // Only plain objects are copied, so values such as dates stay intact.
  if (value && typeof value === "object") {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactValue(item)]),
    );
  }
  return value;
}

function redact<T>(value: T): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- redactValue keeps the shape of the object it copies
  return redactValue(value) as T;
}

/**
 * Removes secret query parameter values from every event property, including
 * `$current_url`, `$referrer`, person properties, and exception messages.
 */
export function redactSecretUrls(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: redact(event.properties),
    ...(event.$set ? { $set: redact(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: redact(event.$set_once) } : {}),
  };
}
