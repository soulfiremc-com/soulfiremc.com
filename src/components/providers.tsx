import { captchaPlugin } from "@better-auth-ui/react/plugins";
import { useNavigate } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { Toaster } from "@/components/ui/sonner";
import { adminPlugin } from "@/lib/auth/admin-plugin";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { lastLoginMethodPlugin } from "@/lib/auth/last-login-method-plugin.ts";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_UI_BASE_PATHS,
  AUTH_UI_VIEW_PATHS,
  DEFAULT_AUTH_REDIRECT_PATH,
} from "@/lib/auth-ui-config";
import { PostHogProvider } from "@/lib/integrations/posthog";
import { AuthLink } from "./auth-link";

function AuthUIProviders({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      navigate={navigate}
      Link={AuthLink}
      redirectTo={DEFAULT_AUTH_REDIRECT_PATH}
      basePaths={AUTH_UI_BASE_PATHS}
      viewPaths={AUTH_UI_VIEW_PATHS}
      socialProviders={["google", "discord", "github"]}
      emailAndPassword={{
        forgotPassword: true,
        name: false,
        requireEmailVerification: true,
      }}
      plugins={[
        usernamePlugin({ isUsernameAvailable: true }),
        passkeyPlugin(),
        captchaPlugin({ render: AuthTurnstile }),
        deleteUserPlugin({ sendDeleteAccountVerification: true }),
        adminPlugin(),
        themePlugin({ useTheme }),
        lastLoginMethodPlugin(),
      ]}
      localization={{
        auth: {
          name: "Display Name",
          namePlaceholder: "Display Name",
        },
      }}
    >
      {children}
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PostHogProvider>
          <RootProvider>
            <AuthUIProviders>
              {children}
              <Toaster richColors />
            </AuthUIProviders>
          </RootProvider>
        </PostHogProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
