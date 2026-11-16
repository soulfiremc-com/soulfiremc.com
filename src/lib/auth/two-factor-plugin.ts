import { createAuthPlugin } from "@better-auth-ui/core";
import {
  twoFactorPlugin as coreTwoFactorPlugin,
  type TwoFactorPluginOptions,
} from "@better-auth-ui/core/plugins/two-factor";

import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";

const TwoFactorChallenge = lazyAuthUi("TwoFactorChallenge");
const TwoFactorSettings = lazyAuthUi("TwoFactorSettings");

export const twoFactorPlugin = createAuthPlugin(
  coreTwoFactorPlugin.id,
  (options: TwoFactorPluginOptions = {}) => ({
    ...coreTwoFactorPlugin(options),
    securityCards: [TwoFactorSettings],
    views: {
      auth: { twoFactor: TwoFactorChallenge },
    },
  }),
);
