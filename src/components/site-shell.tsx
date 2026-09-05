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
          type: "main",
          text: "Documentation",
          url: "/docs",
          description: "Learn how to use SoulFire",
        },
        {
          type: "main",
          text: "Downloads",
          url: "/download",
          description: "Download SoulFire",
        },
        {
          type: "main",
          text: "Blog",
          url: "/blog",
          description: "SoulFire Blog",
        },
        {
          type: "main",
          text: "Get Accounts",
          url: "/get-accounts",
          description: "Get Accounts for SoulFire",
        },
        {
          type: "main",
          text: "Get Proxies",
          url: "/get-proxies",
          description: "Get Proxies for SoulFire",
        },
        {
          type: "main",
          text: "Resources",
          url: "/resources",
          description: "SoulFire plugins and scripts",
        },
        {
          type: "main",
          text: "Pricing",
          url: "/pricing",
          description: "Support SoulFire",
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
