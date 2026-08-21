import {
  type BasePaths,
  basePaths,
  type ViewPaths,
  viewPaths,
} from "@better-auth-ui/core";

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
