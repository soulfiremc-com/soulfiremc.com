import { captchaPlugin } from "@better-auth-ui/react/plugins/captcha";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { AuthLink } from "@/components/auth-link";
import { AuthProvider } from "@/components/auth/auth-provider";
import { adminPlugin } from "@/lib/auth/admin-plugin";
import { authUiLocale } from "@/lib/auth/auth-ui-locale";
import { dashPlugin } from "@/lib/auth/dash-plugin";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { lastLoginMethodPlugin } from "@/lib/auth/last-login-method-plugin.ts";
import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";
import { AuthUiProvidersMounted } from "@/lib/auth/lazy-user-button";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_UI_BASE_PATHS,
  AUTH_UI_VIEW_PATHS,
  authRedirectPath,
} from "@/lib/auth-ui-config";
import { useLocale } from "@/lib/i18n-react";

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
  captchaPlugin({ render: lazyAuthUi("AuthTurnstile") }),
  deleteUserPlugin({ sendDeleteAccountVerification: true }),
  adminPlugin(),
  dashPlugin({ organization: false }),
  themePlugin({ useTheme }),
  lastLoginMethodPlugin(),
];

/**
 * Better Auth UI configuration for auth, account, and admin pages and for the
 * header user menu. It loads on demand, so other pages do not download it.
 */
export function AuthUIProviders({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const locale = useLocale();
  const authLocale = useMemo(
    () => authUiLocale(locale, authUiPlugins),
    [locale],
  );
  // Better Auth UI reads `redirectTo` from `window.location`, which the server
  // render lacks. Read it from the router so server and browser links match.
  const redirectTo = useRouterState({
    select: (state) =>
      authRedirectPath(
        "redirectTo" in state.location.search
          ? state.location.search.redirectTo
          : undefined,
      ),
  });

  return (
    <AuthProvider
      authClient={authClient}
      navigate={(options) => void navigate(options)}
      Link={AuthLink}
      redirectTo={redirectTo}
      basePaths={AUTH_UI_BASE_PATHS}
      viewPaths={AUTH_UI_VIEW_PATHS}
      socialProviders={["google", "discord", "github"]}
      socialSignInMode="popup"
      emailAndPassword={{
        forgotPassword: true,
        name: false,
        requireEmailVerification: true,
      }}
      plugins={authUiPlugins}
      locale={authLocale}
    >
      <AuthUiProvidersMounted value>{children}</AuthUiProvidersMounted>
    </AuthProvider>
  );
}
