import { isLocale, localizePath } from "@/lib/i18n";
import { translate } from "@/lib/messages";
import { DocsOgImage } from "@/components/og/soulfire";
import { soulfireLogoDataUri } from "@/lib/og-image";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";
import {
  DirectoryOgImage,
  DownloadOgImage,
  HomeOgImage,
} from "@/components/og/site";
import { PROVIDERS as ACCOUNT_PROVIDERS } from "@/lib/accounts-data";
import { getSortedBlogPages } from "@/lib/blog";
import { stripOgSuffix } from "@/lib/og";
import { createOgImageResponse } from "@/lib/og-image";
import { PROVIDERS as PROXY_PROVIDERS } from "@/lib/proxies-data";

export const Route = createFileRoute("/og/site/{$}/image.webp")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const [page] = stripOgSuffix(slugs);

        if (!page) return new Response(null, { status: 404 });

        if (locale !== "en" && ["get-accounts", "get-proxies"].includes(page)) {
          const accounts = page === "get-accounts";
          return createOgImageResponse(
            <DocsOgImage
              title={translate(
                locale,
                accounts
                  ? "common.minecraftAltsMfaNfaAccounts"
                  : "common.proxyProvidersForSoulfire",
              )}
              description={translate(
                locale,
                accounts
                  ? "providers.accounts.social.description"
                  : "providers.proxies.social.description",
              )}
              section={translate(
                locale,
                accounts ? "nav.accounts" : "nav.proxies",
              )}
              slugs={[]}
              siteLabel={`soulfiremc.com${localizePath(`/${page}`, locale)}`}
              logoSrc={soulfireLogoDataUri}
            />,
          );
        }
        if (
          (locale !== "en" && ["home", "download", "pricing"].includes(page)) ||
          page === "pricing"
        ) {
          const title =
            page === "home"
              ? "home.meta.title"
              : page === "download"
                ? "download.title"
                : "support.meta.title";
          const description =
            page === "home"
              ? "home.meta.description"
              : page === "download"
                ? "download.meta.description"
                : "support.meta.description";
          return createOgImageResponse(
            <DocsOgImage
              title={translate(locale, title)}
              description={translate(locale, description)}
              slugs={[]}
              section={translate(
                locale,
                page === "home"
                  ? "common.brand"
                  : page === "download"
                    ? "nav.downloads"
                    : "nav.pricing",
              )}
              siteLabel={`soulfiremc.com${localizePath(page === "home" ? "/" : `/${page}`, locale)}`}
              logoSrc={soulfireLogoDataUri}
            />,
          );
        }
        let image: ReactElement;

        switch (page) {
          case "home":
            image = <HomeOgImage />;
            break;
          case "download":
            image = <DownloadOgImage />;
            break;
          case "blog": {
            const allPosts = getSortedBlogPages();
            image = (
              <DirectoryOgImage
                label="Blog"
                title="SoulFire Blog"
                description="Tutorials, field notes, and deep dives on Minecraft bot testing and development."
                accent="#ffb562"
                secondary="#ff7d99"
                count={allPosts.length}
                samples={allPosts.map((post) => post.data.title)}
              />
            );
            break;
          }
          case "get-proxies":
            image = (
              <DirectoryOgImage
                label="Proxies"
                title="Proxy Providers for SoulFire"
                description="Residential, datacenter, ISP, and mobile networks tested with SoulFire sessions."
                accent="#58c7ff"
                secondary="#4a7dff"
                count={PROXY_PROVIDERS.length}
                samples={PROXY_PROVIDERS.map((p) => p.name)}
              />
            );
            break;
          case "get-accounts": {
            const uniqueProviders = [
              ...new Map(ACCOUNT_PROVIDERS.map((p) => [p.slug, p])).values(),
            ];
            image = (
              <DirectoryOgImage
                label="Accounts"
                title="Minecraft Accounts for SoulFire"
                description="MFA and NFA providers with pricing and delivery details."
                accent="#75f1ba"
                secondary="#ffb562"
                count={uniqueProviders.length}
                samples={uniqueProviders.map((p) => p.name)}
              />
            );
            break;
          }
          default:
            return new Response(null, { status: 404 });
        }

        return createOgImageResponse(image);
      },
    },
  },
});
