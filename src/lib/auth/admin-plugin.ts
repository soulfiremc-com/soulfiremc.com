import { createAuthPlugin } from "@better-auth-ui/core";
import {
  type AdminPluginOptions,
  adminPlugin as coreAdminPlugin,
} from "@better-auth-ui/core/plugins/admin";

import { reviewModerationAdminTab } from "@/components/admin/review-moderation-tab";
import { StopImpersonating } from "@/components/auth/admin/stop-impersonating";

export const adminPlugin = createAuthPlugin(
  coreAdminPlugin.id,
  (options: AdminPluginOptions = {}) => ({
    ...coreAdminPlugin(options),
    adminTabs: [reviewModerationAdminTab],
    userMenuItems: [StopImpersonating],
  }),
);
