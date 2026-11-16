import {
  isLocale,
  locales,
  localeNames,
  localeDestination,
  localizeHref,
  splitLocalePath,
} from "@/lib/i18n";
import { LocaleProvider, useLocale } from "@/lib/i18n-react";
import { fumadocsMessages } from "@/lib/messages/fumadocs";
import { captchaPlugin } from "@better-auth-ui/react/plugins/captcha";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ContentImage } from "@/components/content-image";
import { ThemeProvider, useTheme } from "next-themes";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthTurnstile } from "@/components/auth-turnstile";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
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
import {
  isPostHogConfigured,
  PostHogProvider,
} from "@/lib/integrations/posthog";
import { AuthLink } from "./auth-link";

const authUiPlugins = [
  usernamePlugin({ isUsernameAvailable: true }),
  emailOtpPlugin({
    emailVerification: true,
    passwordReset: true,
    changeEmail: true,
    verifyCurrentEmail: true,
    localization: { emailOtp: "Email code" },
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
      socialSignInMode="popup"
      emailAndPassword={{
        forgotPassword: true,
        name: false,
        requireEmailVerification: true,
      }}
      plugins={authUiPlugins}
      localization={{
        // Brand copy uses sentence case.
        auth: {
          forgotPassword: "Forgot password",
          name: "Display name",
          namePlaceholder: "Display name",
          resetPassword: "Reset password",
          signIn: "Sign in",
          signOut: "Sign out",
          signUp: "Sign up",
          verifyEmail: "Verify email",
        },
      }}
    >
      {children}
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const location = useRouterState({ select: (state) => state.location });
  const navigate = useNavigate();
  const locale = splitLocalePath(location.pathname).locale;
  return (
    <LocaleProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PostHogProvider>
          <RootProvider
            components={{ Link: LocaleLink, Image: ContentImage }}
            search={{
              options: {
                type: "static",
                api:
                  locale === "en"
                    ? "/api/search"
                    : `/api/search-index/${locale}`,
              },
            }}
            i18n={{
              locale,
              locales: locales.map((code) => ({
                locale: code,
                name: localeNames[code],
              })),
              translations: fumadocsMessages(locale),
              onLocaleChange: (next) => {
                if (isLocale(next))
                  void navigate({
                    href: localeDestination(location.href, next),
                  });
              },
            }}
          >
            <AuthUIProviders>
              {children}
              {isPostHogConfigured && <CookieConsentBanner />}
              <Toaster richColors />
            </AuthUIProviders>
          </RootProvider>
        </PostHogProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}

function LocaleLink({
  href = "",
  prefetch = true,
  onClick,
  ...props
}: React.ComponentProps<"a"> & { prefetch?: boolean }) {
  const locale = useLocale();
  const to = localizeHref(href, locale);
  return (
    <Link
      to={to}
      preload={prefetch ? "intent" : false}
      onClick={(event) => {
        onClick?.(event);
        if (!isSamePageClick(event, to)) return;
        // The router restores the current scroll position on a same-URL
        // navigation, which cancels the scroll. Skip that no-op navigation.
        event.preventDefault();
        scrollToTop();
      }}
      {...props}
    />
  );
}

/** A link to the current page navigates nowhere, so return to the top instead. */
function isSamePageClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  to: string,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !to.startsWith("/") ||
    to.includes("#")
  )
    return false;
  const target = new URL(to, window.location.href);
  return (
    target.pathname === window.location.pathname &&
    target.search === window.location.search
  );
}

function scrollToTop() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}
