import { captchaPlugin } from "@better-auth-ui/react/plugins/captcha";
import { useNavigate } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ThemeProvider, useTheme } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { Toaster } from "@/components/ui/sonner";
import { adminPlugin } from "@/lib/auth/admin-plugin";
import { dashPlugin } from "@/lib/auth/dash-plugin";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { lastLoginMethodPlugin } from "@/lib/auth/last-login-method-plugin.ts";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_UI_BASE_PATHS,
  AUTH_UI_VIEW_PATHS,
  DEFAULT_AUTH_REDIRECT_PATH,
} from "@/lib/auth-ui-config";
import { PostHogProvider } from "@/lib/integrations/posthog";
import { AuthLink } from "./auth-link";

const authUiPlugins = [
  usernamePlugin({ isUsernameAvailable: true }),
  emailOtpPlugin({
    emailVerification: true,
    passwordReset: true,
    changeEmail: true,
    verifyCurrentEmail: true,
  }),
  twoFactorPlugin(),
  passkeyPlugin(),
  captchaPlugin({ render: AuthTurnstile }),
  deleteUserPlugin({ sendDeleteAccountVerification: true }),
  adminPlugin(),
  dashPlugin({ organization: false }),
  themePlugin({ useTheme }),
  lastLoginMethodPlugin(),
];

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
      plugins={authUiPlugins}
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
