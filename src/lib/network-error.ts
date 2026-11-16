// Browsers word failed fetches and failed route chunk imports differently.
const networkErrorPattern =
  /failed to fetch|networkerror|network request failed|load failed|dynamically imported module|importing a module script failed/i;

/** Whether an error came from a lost connection rather than from the page itself. */
export function isNetworkError(error: unknown, online = true): boolean {
  if (!online) return true;
  return (
    error instanceof Error &&
    (error.name === "ChunkLoadError" || networkErrorPattern.test(error.message))
  );
}
