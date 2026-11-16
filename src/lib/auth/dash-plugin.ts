import { createAuthPlugin } from "@better-auth-ui/core";
import {
  dashPlugin as coreDashPlugin,
  type DashPluginOptions,
} from "@better-auth-ui/core/plugins/dash";
import { useAuthPlugin } from "@better-auth-ui/react";
import { Activity } from "lucide-react";
import { createElement } from "react";

import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";

const AdminActivity = lazyAuthUi("AdminActivity");
const AdminUserActivity = lazyAuthUi("AdminUserActivity");
const OrganizationActivity = lazyAuthUi("OrganizationActivity");
const UserActivity = lazyAuthUi("UserActivity");

/** Reads the label at render time so it follows the page language. */
function ActivityLabel() {
  const { localization } = useAuthPlugin(coreDashPlugin);
  return createElement(
    "span",
    { className: "inline-flex items-center gap-1" },
    createElement(Activity, { className: "text-muted-foreground" }),
    localization.activity,
  );
}

const activityLabel = createElement(ActivityLabel);

export const dashPlugin = createAuthPlugin(
  coreDashPlugin.id,
  (options: DashPluginOptions = {}) => {
    const core = coreDashPlugin(options);
    return {
      ...core,
      ...(core.admin
        ? {
            adminTabs: [
              {
                id: "activity",
                path: core.viewPaths.settings.activity,
                label: activityLabel,
                component: AdminActivity,
              },
            ],
            adminUserTabs: [
              {
                id: "activity",
                label: activityLabel,
                component: AdminUserActivity,
              },
            ],
          }
        : {}),
      ...(core.user
        ? {
            settingsTabs: [
              {
                view: "activity" as const,
                label: activityLabel,
                component: UserActivity,
              },
            ],
          }
        : {}),
      ...(core.organization
        ? {
            organizationTabs: [
              {
                id: "activity",
                path: core.viewPaths.settings.activity,
                label: activityLabel,
                component: OrganizationActivity,
              },
            ],
          }
        : {}),
    };
  },
);
