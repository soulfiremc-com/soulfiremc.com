import { createAuthPlugin } from "@better-auth-ui/core";
import {
  usernamePlugin as coreUsernamePlugin,
  type UsernamePluginOptions,
} from "@better-auth-ui/core/plugins/username";

import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";

const SignInUsername = lazyAuthUi("SignInUsername");
const UsernameField = lazyAuthUi("UsernameField");

export const usernamePlugin = createAuthPlugin(
  coreUsernamePlugin.id,
  (options: UsernamePluginOptions = {}) => {
    const core = coreUsernamePlugin(options);

    return {
      ...core,
      additionalFields: core.additionalFields?.map((field) =>
        field.name === "username"
          ? {
              ...field,
              render: UsernameField,
            }
          : field,
      ),
      views: {
        auth: { signIn: SignInUsername },
      },
    };
  },
);
