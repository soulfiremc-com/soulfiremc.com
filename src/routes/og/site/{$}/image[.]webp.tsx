import { isLocale, localizePath } from "@/lib/i18n";
import { type MessageKey, translate } from "@/lib/messages";
import { DocsOgImage } from "@/components/og/soulfire";
import { soulfireLogoDataUri, createOgImageResponse } from "@/lib/og-image";
import { createFileRoute } from "@tanstack/react-router";
import { stripOgSuffix } from "@/lib/og";

type SitePageImage = {
  path: string;
  title: MessageKey;
  description: MessageKey;
  section: MessageKey;
};

const sitePageImages: Record<string, SitePageImage> = {
  home: {
    path: "/",
    title: "home.meta.title",
    description: "home.meta.description",
    section: "common.brand",
  },
  download: {
    path: "/download",
    title: "download.title",
    description: "download.meta.description",
    section: "nav.downloads",
  },
  pricing: {
    path: "/pricing",
    title: "support.meta.title",
    description: "support.meta.description",
    section: "nav.pricing",
  },
  "get-accounts": {
    path: "/get-accounts",
    title: "common.minecraftAltsMfaNfaAccounts",
    description: "providers.accounts.social.description",
    section: "nav.accounts",
  },
  "get-proxies": {
    path: "/get-proxies",
    title: "common.proxyProvidersForSoulfire",
    description: "providers.proxies.social.description",
    section: "nav.proxies",
  },
};

export const Route = createFileRoute("/og/site/{$}/image.webp")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const [page] = stripOgSuffix(slugs);

        // The blog has no localized copies, so its image stays English.
        if (page === "blog" && locale === "en") {
          return createOgImageResponse(
            <DocsOgImage
              title="SoulFire Blog"
              description="Guides for testing Minecraft servers with bots: load, anti-bot, authentication, and proxies."
              section={translate(locale, "nav.blog")}
              siteLabel="soulfiremc.com/blog"
              logoSrc={soulfireLogoDataUri}
            />,
          );
        }

        const image =
          page && Object.hasOwn(sitePageImages, page)
            ? sitePageImages[page]
            : undefined;
        if (!image) return new Response(null, { status: 404 });

        return createOgImageResponse(
          <DocsOgImage
            title={translate(locale, image.title)}
            description={translate(locale, image.description)}
            section={translate(locale, image.section)}
            siteLabel={`soulfiremc.com${localizePath(image.path, locale).replace(/\/$/u, "")}`}
            logoSrc={soulfireLogoDataUri}
          />,
        );
      },
    },
  },
});
