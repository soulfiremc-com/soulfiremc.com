import { useT, useLocale } from "@/lib/i18n-react";
import { localizeHref } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";
import { UserButton } from "@/components/auth/user/user-button";
import { getBaseLayoutOptions } from "@/lib/layout-options";

export function SiteShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const baseOptions = getBaseLayoutOptions(locale);

  return (
    <HomeLayout
      {...baseOptions}
      links={[
        {
          text: t("nav.docs"),
          url: localizeHref("/docs", locale),
          description: t("nav.docs.description"),
        },
        {
          text: t("nav.downloads"),
          url: localizeHref("/download", locale),
          description: t("download.title"),
        },
        {
          type: "menu",
          text: t("nav.resources"),
          items: [
            {
              text: t("nav.accounts"),
              url: localizeHref("/get-accounts", locale),
              description: t("nav.accounts.description"),
            },
            {
              text: t("nav.proxies"),
              url: localizeHref("/get-proxies", locale),
              description: t("nav.proxies.description"),
            },
            {
              text: t("nav.blog"),
              url: "/blog",
              description: t("nav.blog.description"),
            },
          ],
        },
        {
          text: t("nav.support"),
          url: localizeHref("/pricing", locale),
          description: t("nav.support.description"),
        },
        ...(baseOptions.links || []),
        {
          type: "custom",
          secondary: true,
          children: <UserButton size="icon" />,
        },
      ]}
    >
      {children}
      <footer className="border-t py-6 text-sm text-fd-muted-foreground">
        <div className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} SoulFire</p>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link
              to="/privacy-policy"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("legal.privacyPolicy")}
            </Link>
            <Link
              to="/terms-of-service"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("legal.termsOfService")}
            </Link>
            <Link
              to="/cookie-policy"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("legal.cookiePolicy")}
            </Link>
            <Link
              to="/imprint"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("legal.imprint")}
            </Link>
          </nav>
        </div>
      </footer>
    </HomeLayout>
  );
}
