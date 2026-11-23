import {
  isLocale,
  locales,
  localeNames,
  localeDestination,
  splitLocalePath,
} from "@/lib/i18n";
import { LocaleLink } from "@/components/locale-link";
import { LocaleProvider } from "@/components/locale-provider";
import { useLocale } from "@/lib/i18n-react";
import { fumadocsMessages } from "@/lib/messages/fumadocs";
import { captchaPlugin } from "@better-auth-ui/react/plugins/captcha";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ContentImage } from "@/components/content-image";
import { ThemeProvider, useTheme } from "next-themes";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { Toaster } from "@/components/ui/sonner";
import { adminPlugin } from "@/lib/auth/admin-plugin";
import { dashPlugin } from "@/lib/auth/dash-plugin";
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin";
import { emailOtpPlugin } from "@/lib/auth/email-otp-plugin";
import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";
import { lastLoginMethodPlugin } from "@/lib/auth/last-login-method-plugin.ts";
import { passkeyPlugin } from "@/lib/auth/passkey-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { usernamePlugin } from "@/lib/auth/username-plugin";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_UI_VIEW_PATHS,
  AUTH_UI_BASE_PATHS,
  DEFAULT_AUTH_REDIRECT_PATH,
} from "@/lib/auth-ui-config";
import { authUiLocale } from "@/lib/auth/auth-ui-locale";
import { translate } from "@/lib/messages";
import { isPostHogConfigured } from "@/lib/integrations/posthog";
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
  captchaPlugin({ render: lazyAuthUi("AuthTurnstile") }),
  deleteUserPlugin({ sendDeleteAccountVerification: true }),
  adminPlugin(),
  dashPlugin({ organization: false }),
  themePlugin({ useTheme }),
  lastLoginMethodPlugin(),
];

const REDIRECT_BASE = "https://redirect-check.invalid";

/**
 * Returns the path part of a same-site URL, or null. Parse with the URL rules
 * browsers use, since they strip tabs and newlines and so turn `/\t/evil.com`
 * into a protocol-relative URL that leaves the site.
 */
function toSameSitePath(value: string): string | null {
  if (!value.trim().startsWith("/")) return null;
  try {
    const url = new URL(value.trim(), REDIRECT_BASE);
    return url.origin === REDIRECT_BASE
      ? `${url.pathname}${url.search}${url.hash}`
      : null;
  } catch {
    return null;
  }
}

function AuthUIProviders({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const locale = useLocale();
  const authLocale = useMemo(
    () => authUiLocale(locale, authUiPlugins),
    [locale],
  );
  // Better Auth UI reads `redirectTo` from `window.location`, which the server
  // render lacks. Read it from the router so server and browser links match.
  const requestedRedirectTo = useRouterState({
    select: (state) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- redirectTo is read as unknown and checked before use
      const value = (state.location.search as { redirectTo?: unknown })
        .redirectTo;
      return typeof value === "string" ? toSameSitePath(value) : null;
    },
  });

  return (
    <AuthProvider
      authClient={authClient}
      navigate={(options) => void navigate(options)}
      Link={AuthLink}
      redirectTo={requestedRedirectTo ?? DEFAULT_AUTH_REDIRECT_PATH}
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
      {children}
    </AuthProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Select only the pathname, so search and hash changes do not re-render
  // the whole app.
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const router = useRouter();
  const navigate = useNavigate();
  const locale = splitLocalePath(pathname).locale;
  return (
    <LocaleProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RootProvider
          components={{ Link: LocaleLink, Image: ContentImage }}
          search={{
            options: {
              // oxlint-disable-next-line typescript/no-deprecated -- the site serves a static Orama index; the replacement client uses a different search engine
              type: "static",
              api:
                locale === "en" ? "/api/search" : `/api/search-index/${locale}`,
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
                  href: localeDestination(router.state.location.href, next),
                });
            },
          }}
        >
          <AuthUIProviders>
            {children}
            {isPostHogConfigured && <CookieConsentBanner />}
            <Toaster
              richColors
              containerAriaLabel={translate(locale, "common.notifications")}
              toastOptions={{
                closeButtonAriaLabel: translate(
                  locale,
                  "common.closeNotification",
                ),
              }}
            />
          </AuthUIProviders>
        </RootProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
