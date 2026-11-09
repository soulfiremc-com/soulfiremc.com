import { isLocale, localizePath } from "@/lib/i18n";
import { translate } from "@/lib/messages";
import { DocsOgImage } from "@/components/og/soulfire";
import { soulfireLogoDataUri } from "@/lib/og-image";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProxyOgImage } from "@/components/og/site";
import { stripOgSuffix } from "@/lib/og";
import { createOgImageResponse, getEmbeddedLogo } from "@/lib/og-image";
import { getProviderBySlug } from "@/lib/proxies-data";

export const Route = createFileRoute("/og/proxies/{$}/image.webp")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const [providerSlug] = stripOgSuffix(slugs);
        const provider = providerSlug
          ? getProviderBySlug(providerSlug)
          : undefined;

        if (!provider) throw notFound();

        if (locale !== "en")
          return createOgImageResponse(
            <DocsOgImage
              title={provider.name}
              description={translate(locale, provider.summary)}
              slugs={[]}
              section={translate(locale, "Get Proxies")}
              siteLabel={`soulfiremc.com${localizePath(`/get-proxies/${provider.slug}`, locale)}`}
              logoSrc={getEmbeddedLogo(provider.logo) || soulfireLogoDataUri}
            />,
          );
        return createOgImageResponse(
          <ProxyOgImage
            name={provider.name}
            summary={provider.summary}
            badges={provider.badges}
            logoSrc={getEmbeddedLogo(provider.logo)}
          />,
        );
      },
    },
  },
});
