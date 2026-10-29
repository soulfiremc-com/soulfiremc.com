import { Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { ReactNode } from "react";
import { UserButton } from "@/components/auth/user/user-button";
import { getBaseLayoutOptions } from "@/lib/layout-options";

export function SiteShell({ children }: { children: ReactNode }) {
  const baseOptions = getBaseLayoutOptions();

  return (
    <HomeLayout
      {...baseOptions}
      links={[
        {
          text: "Docs",
          url: "/docs",
          description: "Learn how to use SoulFire",
        },
        {
          text: "Downloads",
          url: "/download",
          description: "Download SoulFire",
        },
        {
          text: "Accounts",
          url: "/get-accounts",
          description: "Find Minecraft accounts for your bots",
        },
        {
          text: "Proxies",
          url: "/get-proxies",
          description: "Find proxies for your bot sessions",
        },
        {
          type: "menu",
          text: "More",
          secondary: true,
          items: [
            {
              text: "Blog",
              url: "/blog",
              description: "News and guides from SoulFire",
            },
            {
              text: "Pricing",
              url: "/pricing",
              description: "Support SoulFire development",
            },
          ],
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
          <nav className="flex gap-4">
            <Link
              to="/privacy-policy"
              className="hover:text-fd-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="hover:text-fd-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/cookie-policy"
              className="hover:text-fd-foreground transition-colors"
            >
              Cookie Policy
            </Link>
            <Link
              to="/imprint"
              className="hover:text-fd-foreground transition-colors"
            >
              Imprint
            </Link>
          </nav>
        </div>
      </footer>
    </HomeLayout>
  );
}
