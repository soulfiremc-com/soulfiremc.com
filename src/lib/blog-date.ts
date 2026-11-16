const blogDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Formats a front-matter date. Dates are calendar days stored as UTC
 * midnight, so formatting in the viewer's time zone would shift them by a day
 * and make the client render differ from the server render.
 */
export function formatBlogDate(value: string | Date) {
  return blogDateFormat.format(new Date(value));
}
