/**
 * Mark auth mutation options so the global error toaster skips them, for
 * forms that already show the error next to the field.
 *
 * Better Auth UI hooks replace `meta` instead of merging it, which drops the
 * factory's `awaits` list. Without it, a verified sign-in redirects before the
 * session query refreshes and lands on the sign-in page again. Build the
 * mutation from the factory options with this helper instead.
 */
export function withInlineErrors<T extends { meta?: Record<string, unknown> }>(
  options: T,
): T {
  return { ...options, meta: { ...options.meta, errorPresentation: "inline" } };
}
