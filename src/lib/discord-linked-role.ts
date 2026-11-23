export const linkedRoleStatuses = [
  "linked",
  "accountNotFound",
  "cancelled",
  "expired",
  "failed",
] as const;

export type LinkedRoleStatus = (typeof linkedRoleStatuses)[number];

export const LINKED_ROLE_START_PATH = "/api/discord/linked-role";
export const LINKED_ROLE_RESULT_PATH = "/discord/linked-role";
/** Discord only accepts the callback URL registered for the application. */
export const LINKED_ROLE_CALLBACK_URL =
  "https://soulfiremc.com/api/discord/linked-role/callback";
const PLATFORM_USERNAME_MAX_LENGTH = 100;

export function isLinkedRoleStatus(value: unknown): value is LinkedRoleStatus {
  return (linkedRoleStatuses as readonly unknown[]).includes(value);
}

export function getLinkedRoleResultUrl(
  status: LinkedRoleStatus,
  requestUrl: string,
): string {
  const url = new URL(LINKED_ROLE_RESULT_PATH, requestUrl);
  url.searchParams.set("status", status);
  return url.toString();
}

/** Discord rejects the whole role connection when the username is too long. */
export function getLinkedRolePlatformUsername(name: string): string {
  return Array.from(name).slice(0, PLATFORM_USERNAME_MAX_LENGTH).join("");
}

/**
 * Checks the OAuth callback before any Discord request. Returns the code when
 * the callback may continue, or the status page to show instead.
 */
export function checkLinkedRoleCallback(
  searchParams: URLSearchParams,
  storedState: string | undefined,
): { code: string } | { status: LinkedRoleStatus } {
  // Discord sends `error=access_denied` when the user selects Cancel. An error
  // callback changes nothing, so it does not need a valid state.
  const error = searchParams.get("error");
  if (error) {
    return { status: error === "access_denied" ? "cancelled" : "failed" };
  }
  const state = searchParams.get("state");
  if (!state || !storedState || state !== storedState) {
    return { status: "expired" };
  }
  const code = searchParams.get("code");
  return code ? { code } : { status: "failed" };
}
