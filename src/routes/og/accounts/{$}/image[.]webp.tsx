import { isLocale, localizePath } from "@/lib/i18n";
import { translate, resolveMessage } from "@/lib/messages";
import { DocsOgImage } from "@/components/og/soulfire";
import { soulfireLogoDataUri } from "@/lib/og-image";
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
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const [shopSlug] = stripOgSuffix(slugs);
        const shop = shopSlug ? getShopBySlug(shopSlug) : undefined;

        if (!shop) throw notFound();

        const listings = Object.entries(shop.listings).map(
          ([category, listing]) => ({
            label: category === "mfa-accounts" ? "MFA" : "NFA",
            price: resolveMessage(locale, listing.price),
          }),
        );
        const description =
          Object.values(shop.listings).map((listing) =>
            translate(locale, listing.summary),
          )[0] ?? "Minecraft account provider for SoulFire bot testing.";

        if (locale !== "en")
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
