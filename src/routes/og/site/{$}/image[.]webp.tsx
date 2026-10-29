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
        const [page] = stripOgSuffix(slugs);

        if (!page) return new Response(null, { status: 404 });

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
