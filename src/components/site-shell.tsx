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
          text: t("Docs"),
          url: localizeHref("/docs", locale),
          description: t("Learn how to use SoulFire"),
        },
        {
          text: t("Downloads"),
          url: localizeHref("/download", locale),
          description: t("Download SoulFire"),
        },
        {
          type: "menu",
          text: t("Resources"),
          items: [
            {
              text: t("Accounts"),
              url: localizeHref("/get-accounts", locale),
              description: t("Find Minecraft accounts for your bots"),
            },
            {
              text: t("Proxies"),
              url: localizeHref("/get-proxies", locale),
              description: t("Find proxies for your bot sessions"),
            },
            {
              text: t("Blog"),
              url: "/blog",
              description: t("News and guides from SoulFire"),
            },
          ],
        },
        {
          text: t("Support"),
          url: localizeHref("/pricing", locale),
          description: t("Support SoulFire development"),
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
              {t("Privacy Policy")}
            </Link>
            <Link
              to="/terms-of-service"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("Terms of Service")}
            </Link>
            <Link
              to="/cookie-policy"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("Cookie Policy")}
            </Link>
            <Link
              to="/imprint"
              className="hover:text-fd-foreground transition-colors"
            >
              {t("Imprint")}
            </Link>
          </nav>
        </div>
      </footer>
    </HomeLayout>
  );
}
