import {
  type BasePaths,
  basePaths,
  type ViewPaths,
  viewPaths,
} from "@better-auth-ui/core";
import { splitLocalePath } from "@/lib/i18n";

export const AUTH_UI_BASE_PATHS = {
  ...basePaths,
  settings: "/account",
} satisfies BasePaths;

export const AUTH_UI_VIEW_PATHS = {
  ...viewPaths,
  settings: {
    ...viewPaths.settings,
    account: "settings",
    activity: "activity",
  },
} satisfies ViewPaths;

export const DEFAULT_AUTH_REDIRECT_PATH = `${AUTH_UI_BASE_PATHS.settings}/${AUTH_UI_VIEW_PATHS.settings.account}`;

export const ADMIN_REVIEW_PATH = "reviews";

const REDIRECT_BASE = "https://redirect-check.invalid";

/**
 * Where to go after sign-in: the `redirectTo` search value when it is a path
 * on this site, otherwise the account settings. Parse with the URL rules
 * browsers use, since they strip tabs and newlines and so turn `/\t/evil.com`
 * into a protocol-relative URL that leaves the site.
 */
export function authRedirectPath(redirectTo: unknown): string {
  if (typeof redirectTo !== "string") return DEFAULT_AUTH_REDIRECT_PATH;
  const value = redirectTo.trim();
  if (!value.startsWith("/")) return DEFAULT_AUTH_REDIRECT_PATH;
  try {
    const url = new URL(value, REDIRECT_BASE);
    return url.origin === REDIRECT_BASE
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_AUTH_REDIRECT_PATH;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}

const AUTH_UI_PAGE_BASE_PATHS = [
  AUTH_UI_BASE_PATHS.auth,
  AUTH_UI_BASE_PATHS.settings,
  AUTH_UI_BASE_PATHS.admin,
];

/** Whether the page at `pathname` renders auth forms or account settings. */
export function isAuthUiPath(pathname: string) {
  const { path } = splitLocalePath(pathname);
  return AUTH_UI_PAGE_BASE_PATHS.some(
    (basePath) => path === basePath || path.startsWith(`${basePath}/`),
  );
}

/**
 * Where to return after signing in from the page at `currentPath`. Auth,
 * account, and admin pages pass on their own `redirectTo` value, because
 * returning to the form would leave the visitor where they started.
 */
export function signInReturnPath(currentPath: string, redirectTo: string) {
  const pathname = currentPath.split(/[?#]/u, 1)[0] ?? "";
  return isAuthUiPath(pathname)
    ? authRedirectPath(redirectTo)
    : authRedirectPath(currentPath);
}
