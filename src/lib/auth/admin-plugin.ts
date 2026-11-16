import { createAuthPlugin } from "@better-auth-ui/core";
import {
  type AdminPluginOptions,
  adminPlugin as coreAdminPlugin,
} from "@better-auth-ui/core/plugins/admin";

import { reviewModerationAdminTab } from "@/components/admin/review-moderation-tab";
import { StopImpersonating } from "@/components/auth/admin/stop-impersonating";
import { DEFAULT_AUTH_REDIRECT_PATH } from "@/lib/auth-ui-config";

export const adminPlugin = createAuthPlugin(
  coreAdminPlugin.id,
  (options: AdminPluginOptions = {}) => ({
    ...coreAdminPlugin({
      // The admin pages deny the impersonated user, so open their settings.
      impersonationRedirectTo: DEFAULT_AUTH_REDIRECT_PATH,
      ...options,
    }),
    adminTabs: [reviewModerationAdminTab],
    userMenuItems: [StopImpersonating],
  }),
);
