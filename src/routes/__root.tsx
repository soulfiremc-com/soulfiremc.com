import { translate } from "@/lib/messages";
import { splitLocalePath } from "@/lib/i18n";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import type { QueryClient } from "@tanstack/react-query";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { NotFoundPage, RouteErrorPage } from "@/components/route-status-page";
import {
  createStructuredDataGraph,
  getOrganizationStructuredData,
  getWebsiteStructuredData,
  jsonLdScript,
  siteName,
  siteUrl,
} from "@/lib/seo";

import appCss from "../style.css?url";

export type RouterAppContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: ({ matches }) => {
    // Child routes override these defaults. A global 404 has no child head, so
    // localize the fallback and keep missing pages out of search results.
    const locale = splitLocalePath(matches.at(-1)?.pathname ?? "/").locale;
    const notFound = matches.some(
      (match) => match._notFound || match.status === "notFound",
    );
    const title = notFound
      ? `${translate(locale, "errors.pageNotFound")} - ${siteName}`
      : siteName;
    const description = notFound
      ? translate(locale, "errors.thePageYouRequestedDoesNotExist")
      : translate(locale, "home.meta.description");
    return {
      meta: [
        // oxlint-disable-next-line unicorn/text-encoding-identifier-case -- HTML requires the UTF-8 encoding label.
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: "#3289BF" },
        {
          name: "robots",
          content: notFound ? "noindex, follow" : "index, follow",
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: siteName },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: siteUrl },
        { property: "og:image", content: `${siteUrl}/og/site/home/image.webp` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        {
          name: "twitter:image",
          content: `${siteUrl}/og/site/home/image.webp`,
        },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "SoulFire Blog Feed",
          href: "/blog/feed.xml",
        },
      ],
      scripts: [
        jsonLdScript(
          createStructuredDataGraph([
            getOrganizationStructuredData(),
            getWebsiteStructuredData(),
          ]),
        ),
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: (props) => (
    <Providers>
      <RouteErrorPage {...props} />
    </Providers>
  ),
  // Not-found content renders inside RootComponent's Outlet, which already has Providers.
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = useRouterState({
    select: (state) => splitLocalePath(state.location.pathname).locale,
  });
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="qRgsfQEDB7kSuRdyL3PfiA"
          async
        />
      </head>
      <body suppressHydrationWarning>
        <ClientOnly fallback={null}>
          <script src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js" />
          <script
            // oxlint-disable-next-line react/no-danger -- the Ko-fi widget is configured with a static inline script
            dangerouslySetInnerHTML={{
              __html: `
                if (window.kofiWidgetOverlay) {
                  kofiWidgetOverlay.draw('alexprogrammerde', {
                    'type': 'floating-chat',
                    'floating-chat.donateButton.text': ${JSON.stringify(translate(locale, "errors.supportMe"))},
                    'floating-chat.donateButton.background-color': '#794bc4',
                    'floating-chat.donateButton.text-color': '#fff'
                  });
                }
              `,
            }}
          />
        </ClientOnly>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
