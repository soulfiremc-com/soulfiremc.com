import { translate } from "@/lib/messages";
import { isLocale, localizePath } from "@/lib/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { DocsOgImage } from "@/components/og/soulfire";
import { stripOgSuffix } from "@/lib/og";
import { createOgImageResponse, soulfireLogoDataUri } from "@/lib/og-image";
import { getSource } from "@/lib/source";

export const Route = createFileRoute("/og/docs/{$}/image.webp")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const source = await getSource();
        const locale = isLocale(slugs[0]) ? slugs[0] : "en";
        if (isLocale(slugs[0])) slugs.shift();
        const page = source.getPage(stripOgSuffix(slugs), locale);

        if (!page) throw notFound();

        return createOgImageResponse(
          <DocsOgImage
            title={page.data.title ?? page.slugs.at(-1) ?? "Docs"}
            description={page.data.description}
            slugs={page.slugs}
            section={
              page.slugs.length === 0
                ? translate(locale, "common.documentation")
                : page.slugs[0] === "start-here"
                  ? translate(locale, "docs.getStarted")
                  : undefined
            }
            siteLabel={`soulfiremc.com${localizePath("/docs", locale)}`}
            logoSrc={soulfireLogoDataUri}
          />,
        );
      },
    },
  },
});
