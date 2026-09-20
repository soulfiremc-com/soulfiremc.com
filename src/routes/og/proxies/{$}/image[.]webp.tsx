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
        const [providerSlug] = stripOgSuffix(slugs);
        const provider = providerSlug
          ? getProviderBySlug(providerSlug)
          : undefined;

        if (!provider) throw notFound();

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
