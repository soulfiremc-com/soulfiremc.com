import { isLocale, localizePath } from "@/lib/i18n";
import { translate } from "@/lib/messages";
import { DocsOgImage } from "@/components/og/soulfire";
import {
  soulfireLogoDataUri,
  createOgImageResponse,
  getEmbeddedLogo,
} from "@/lib/og-image";
import { createFileRoute } from "@tanstack/react-router";
import { getShopBySlug } from "@/lib/accounts-data";
import { stripOgSuffix } from "@/lib/og";

export const Route = createFileRoute("/og/accounts/{$}/image.webp")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const [shopSlug] = stripOgSuffix(slugs);
        const shop = shopSlug ? getShopBySlug(shopSlug) : undefined;

        if (!shop) return new Response(null, { status: 404 });

        return createOgImageResponse(
          <DocsOgImage
            title={shop.name}
            description={Object.values(shop.listings)
              .map((listing) => translate(locale, listing.summary))
              .join(" ")}
            slugs={[]}
            section={translate(locale, "common.getAccounts")}
            siteLabel={`soulfiremc.com${localizePath(`/get-accounts/${shop.slug}`, locale)}`}
            logoSrc={getEmbeddedLogo(shop.logo) || soulfireLogoDataUri}
          />,
        );
      },
    },
  },
});
