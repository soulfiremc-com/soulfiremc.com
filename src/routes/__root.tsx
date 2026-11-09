import { useT } from "@/lib/i18n-react";
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
import {
  createStructuredDataGraph,
  getOrganizationStructuredData,
  getWebsiteStructuredData,
  jsonLdScript,
  siteDescription,
  siteName,
  siteUrl,
} from "@/lib/seo";

import appCss from "../style.css?url";

export interface RouterAppContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteName },
      { name: "description", content: siteDescription },
      { name: "theme-color", content: "#3289BF" },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteName },
      { property: "og:title", content: siteName },
      { property: "og:description", content: siteDescription },
      { property: "og:url", content: siteUrl },
      { property: "og:image", content: `${siteUrl}/og/site/home/image.webp` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: siteName },
      { name: "twitter:description", content: siteDescription },
      { name: "twitter:image", content: `${siteUrl}/og/site/home/image.webp` },
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
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: ({ error }) => (
    <Providers>
      <MessagePage
        title="Something went wrong"
        text={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        }
      />
    </Providers>
  ),
  notFoundComponent: () => (
    <Providers>
      <MessagePage
        title="Page not found"
        text="The page you requested does not exist."
      />
    </Providers>
  ),
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
        ></script>
      </head>
      <body suppressHydrationWarning>
        <ClientOnly fallback={null}>
          <script src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (window.kofiWidgetOverlay) {
                  kofiWidgetOverlay.draw('alexprogrammerde', {
                    'type': 'floating-chat',
                    'floating-chat.donateButton.text': ${JSON.stringify(translate(locale, "Support me"))},
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

function MessagePage({ title, text }: { title: string; text: string }) {
  const t = useT();
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-lg flex-col gap-3 text-center">
        <h1 className="text-3xl font-semibold">{t(title)}</h1>
        <p className="text-muted-foreground">{t(text)}</p>
      </div>
    </main>
  );
}
