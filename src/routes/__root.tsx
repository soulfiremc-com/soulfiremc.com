import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import type { QueryClient } from "@tanstack/react-query";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
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
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex max-w-lg flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </main>
    </Providers>
  ),
  notFoundComponent: () => (
    <Providers>
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex max-w-lg flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground">
            The page you requested does not exist.
          </p>
        </div>
      </main>
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
  return (
    <html lang="en" suppressHydrationWarning>
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
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Third-party widget bootstrap
            dangerouslySetInnerHTML={{
              __html: `
                if (window.kofiWidgetOverlay) {
                  kofiWidgetOverlay.draw('alexprogrammerde', {
                    'type': 'floating-chat',
                    'floating-chat.donateButton.text': 'Support me',
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
