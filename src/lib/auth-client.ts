import { dashClient, sentinelClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import type { AuthClient } from "@better-auth-ui/react";
import type { BetterAuthClientPlugin } from "better-auth";
import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";

function asClientPlugin(plugin: unknown): BetterAuthClientPlugin {
  return plugin as BetterAuthClientPlugin;
}

const clientOptions = {
  plugins: [
    inferAdditionalFields<typeof auth>(),
    twoFactorClient(),
    usernameClient(),
    emailOTPClient(),
    passkeyClient(),
    adminClient(),
    lastLoginMethodClient(),
    asClientPlugin(dashClient()),
    asClientPlugin(
      sentinelClient({
        identifyUrl: import.meta.env.VITE_BETTER_AUTH_IDENTIFY_URL,
      }),
    ),
  ],
};

export const authClient = createAuthClient(
  clientOptions,
) as unknown as AuthClient;
