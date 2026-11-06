import { createFileRoute, notFound } from "@tanstack/react-router";
import { AccountOgImage } from "@/components/og/site";
import { getShopBySlug } from "@/lib/accounts-data";
import { stripOgSuffix } from "@/lib/og";
import { createOgImageResponse, getEmbeddedLogo } from "@/lib/og-image";

export const Route = createFileRoute("/og/accounts/{$}/image.webp")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const [shopSlug] = stripOgSuffix(slugs);
        const shop = shopSlug ? getShopBySlug(shopSlug) : undefined;

        if (!shop) throw notFound();

        const listings = Object.entries(shop.listings).map(
          ([category, listing]) => ({
            label: category === "mfa-accounts" ? "MFA" : "NFA",
            price: listing.price,
          }),
        );
        const description =
          Object.values(shop.listings)[0]?.summary ??
          "Minecraft account provider for Soulfire bot testing.";

        return createOgImageResponse(
          <AccountOgImage
            name={shop.name}
            listings={listings}
            description={description}
            logoSrc={getEmbeddedLogo(shop.logo)}
          />,
        );
      },
    },
  },
});
