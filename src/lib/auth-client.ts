import { dashClient, sentinelClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import type { AuthClient } from "@better-auth-ui/core";
import type { BetterAuthClientPlugin } from "better-auth";
import {
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  oauthPopupClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";

function asClientPlugin(plugin: unknown): BetterAuthClientPlugin {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Better Auth plugins and the client are typed by their factories, which this wrapper cannot express
  return plugin as BetterAuthClientPlugin;
}

const clientOptions = {
  plugins: [
    oauthPopupClient(),
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

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Better Auth plugins and the client are typed by their factories, which this wrapper cannot express
export const authClient = createAuthClient(
  clientOptions,
) as unknown as AuthClient;
