import { useT, useLocale } from "@/lib/i18n-react";
import { localizeHref } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  discordUrl,
  getBaseLayoutOptions,
  githubUrl,
} from "@/lib/layout-options";
import { HeaderUserButton } from "@/lib/auth/lazy-user-button";
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

function openMobileMenuToggle(): HTMLButtonElement | undefined {
  const header = document.querySelector("#nd-nav");
  if (!(header instanceof HTMLElement) || !("open" in header.dataset))
    return undefined;
  return Array.from(
    header.querySelectorAll<HTMLButtonElement>(
      'button[aria-expanded="true"][aria-controls]',
    ),
  ).find((button) => {
    const id = button.getAttribute("aria-controls");
    return (
      !!id && header.contains(document.querySelector(`#${CSS.escape(id)}`))
    );
  });
}

// The Fumadocs mobile menu ignores Escape. Close it and return focus to its
// toggle, like the other overlays on the site.
function closeMobileMenuOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const toggle = openMobileMenuToggle();
  if (!toggle) return;
  toggle.click();
  toggle.focus();
}

// The open menu covers the top of the page. When Tab moves past its last
// item, close it so the newly focused content is not hidden behind it.
// Popovers such as the language list render in a portal outside the layout,
// so focus moving into them keeps the menu open.
function closeMobileMenuOnFocusLeave(event: FocusEvent) {
  const target = event.target;
  if (!(target instanceof Node)) return;
  const layout = document.querySelector("#nd-home-layout");
  const header = document.querySelector("#nd-nav");
  if (!layout?.contains(target) || header?.contains(target)) return;
  openMobileMenuToggle()?.click();
}

export function SiteShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const baseOptions = getBaseLayoutOptions(locale);

  useEffect(() => {
    document.addEventListener("keydown", closeMobileMenuOnEscape);
    document.addEventListener("focusin", closeMobileMenuOnFocusLeave);
    return () => {
      document.removeEventListener("keydown", closeMobileMenuOnEscape);
      document.removeEventListener("focusin", closeMobileMenuOnFocusLeave);
    };
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
        slots={{ ...baseOptions.slots, container: ShellContainer }}
        links={[
          // Flat links in journey order. Nested pages keep their section
          // highlighted, so visitors can see where they are.
          {
            text: t("nav.docs"),
            url: localizeHref("/docs", locale),
            active: "nested-url",
          },
          {
            text: t("nav.downloads"),
            url: localizeHref("/download", locale),
          },
          {
            text: t("nav.accounts"),
            url: localizeHref("/get-accounts", locale),
            active: "nested-url",
          },
          {
            text: t("nav.proxies"),
            url: localizeHref("/get-proxies", locale),
            active: "nested-url",
          },
          {
            text: t("nav.pricing"),
            url: localizeHref("/pricing", locale),
          },
          ...(baseOptions.links ?? []),
          // Fumadocs renders desktop nav items inside a <ul>, so the custom
          // item needs its own <li>. The mobile menu wraps items in a <div>.
          {
            type: "custom",
            secondary: true,
            on: "nav",
            children: (
              <li className="list-none">
                <HeaderUserButton />
              </li>
            ),
          },
          {
            type: "custom",
            secondary: true,
            on: "menu",
            children: <HeaderUserButton />,
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
          <nav
            aria-label={t("footer.links")}
            className="mx-auto mb-4 flex w-full max-w-(--fd-layout-width) flex-wrap justify-center gap-x-4 px-4 sm:justify-start"
          >
            <Link
              to="/{-$lang}/docs/$"
              params={{
                lang: locale === "en" ? undefined : locale,
                _splat: "",
              }}
              className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
            >
              {t("nav.docs")}
            </Link>
            <a
              href={discordUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
            >
              {t("footer.discordHelp")}
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
            >
              GitHub
            </a>
            <Link
              to="/blog"
              className="inline-flex min-h-8 items-center transition-colors hover:text-fd-foreground"
            >
              {t("nav.blog")}
            </Link>
          </nav>
          <div className="mx-auto flex w-full max-w-(--fd-layout-width) flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
            {/* Pages are prerendered, so the build year can trail the visitor's clock. */}
            <p suppressHydrationWarning>
              {/* oxlint-disable-next-line react/purity -- the footer shows the current year */}
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
