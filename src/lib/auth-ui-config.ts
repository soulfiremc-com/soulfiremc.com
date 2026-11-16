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
