import {
  isLocale,
  locales,
  localeNames,
  localeDestination,
  splitLocalePath,
} from "@/lib/i18n";
import { LocaleLink } from "@/components/locale-link";
import { LocaleProvider } from "@/components/locale-provider";
import { fumadocsMessages } from "@/lib/messages/fumadocs";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { use } from "react";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { ContentImage } from "@/components/content-image";
import { ThemeProvider } from "next-themes";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { LazySearchDialog } from "@/components/lazy-search-dialog";
import { Toaster } from "@/components/ui/sonner";
import { preloadAuthUi } from "@/lib/auth/lazy-auth-ui";
import { isAuthUiPath } from "@/lib/auth-ui-config";
import { translate } from "@/lib/messages";
import { isPostHogConfigured } from "@/lib/integrations/posthog";

// Only auth, account, and admin pages need the Better Auth UI provider. It
// loads with their forms, which the router preloads before those pages render.
// No Suspense boundary sits here, so a client navigation keeps showing the
// previous page until the provider is ready.
function AuthUIPageProviders({ children }: { children: React.ReactNode }) {
  const { AuthUIProviders } = use(preloadAuthUi());
  return <AuthUIProviders>{children}</AuthUIProviders>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Select only the locale, so other URL changes do not re-render the whole
  // app. Read it from the rendered matches: the location changes before the
  // root route has loaded the next locale's messages.
  const locale = useRouterState({
    select: (state) =>
      splitLocalePath(state.matches.at(-1)?.pathname ?? state.location.pathname)
        .locale,
  });
  // Switch providers with the rendered page, not the URL, so the outgoing page
  // does not remount inside the auth provider while the next one loads.
  const authUiPage = useRouterState({
    select: (state) =>
      isAuthUiPath(state.matches.at(-1)?.pathname ?? state.location.pathname),
  });
  const router = useRouter();
  const navigate = useNavigate();
  return (
    <LocaleProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RootProvider
          components={{ Link: LocaleLink, Image: ContentImage }}
          search={{
            SearchDialog: LazySearchDialog,
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
          {authUiPage ? (
            <AuthUIPageProviders>{children}</AuthUIPageProviders>
          ) : (
            children
          )}
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
        </RootProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
