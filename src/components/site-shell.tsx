import { useT, useLocale } from "@/lib/i18n-react";
import { localizeHref } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { UserButton } from "@/components/auth/user/user-button";
import { getBaseLayoutOptions } from "@/lib/layout-options";
import { cn } from "@/lib/utils";

// Fumadocs wraps the layout in <main>, but each page renders its own <main>.
// A plain container keeps one top-level main and lets the footer stay a
// contentinfo landmark.
function ShellContainer({
  className,
  ...props
}: ComponentPropsWithoutRef<"main">) {
  return (
    <div
      id="nd-home-layout"
      {...props}
      className={cn(
        "flex min-h-dvh flex-1 flex-col [--fd-layout-width:1400px]",
        className,
      )}
    />
  );
}

// The Fumadocs mobile menu ignores Escape. Close it and return focus to its
// toggle, like the other overlays on the site.
function closeMobileMenuOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const header = document.getElementById("nd-nav");
  if (!header?.hasAttribute("data-open")) return;
  const toggle = Array.from(
    header.querySelectorAll<HTMLButtonElement>(
      'button[aria-expanded="true"][aria-controls]',
    ),
  ).find((button) =>
    header.contains(
      document.getElementById(button.getAttribute("aria-controls") ?? ""),
    ),
  );
  if (!toggle) return;
  toggle.click();
  toggle.focus();
}

export function SiteShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const baseOptions = getBaseLayoutOptions(locale);

  useEffect(() => {
    document.addEventListener("keydown", closeMobileMenuOnEscape);
    return () =>
      document.removeEventListener("keydown", closeMobileMenuOnEscape);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md border bg-fd-background text-sm font-medium text-fd-foreground shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-2"
      >
        {t("nav.skipToContent")}
      </a>
      <HomeLayout
        {...baseOptions}
        slots={{ container: ShellContainer }}
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
          // Fumadocs renders desktop nav items inside a <ul>, so the custom
          // item needs its own <li>. The mobile menu wraps items in a <div>.
          {
            type: "custom",
            secondary: true,
            on: "nav",
            children: (
              <li className="list-none">
                <UserButton size="icon" />
              </li>
            ),
          },
          {
            type: "custom",
            secondary: true,
            on: "menu",
            children: <UserButton size="icon" />,
          },
        ]}
      >
        <div
          id="main-content"
          tabIndex={-1}
          className="scroll-mt-14 outline-none"
        />
        {children}
        <footer className="mt-auto border-t py-6 text-sm text-fd-muted-foreground">
          <div className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
            {/* Pages are prerendered, so the build year can trail the visitor's clock. */}
            <p suppressHydrationWarning>
              &copy; {new Date().getFullYear()} SoulFire
            </p>
            <nav
              aria-label={t("nav.legal")}
              className="flex flex-wrap justify-center gap-x-4"
            >
              <Link
                to="/privacy-policy"
                className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
              >
                {t("legal.privacyPolicy")}
              </Link>
              <Link
                to="/terms-of-service"
                className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
              >
                {t("legal.termsOfService")}
              </Link>
              <Link
                to="/cookie-policy"
                className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
              >
                {t("legal.cookiePolicy")}
              </Link>
              <Link
                to="/imprint"
                className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
              >
                {t("legal.imprint")}
              </Link>
            </nav>
          </div>
        </footer>
      </HomeLayout>
    </>
  );
}
