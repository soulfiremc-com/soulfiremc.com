import { ArrowUpRight } from "lucide-react";
import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-react";
import { cn } from "@/lib/utils";

type EnderDashSponsorPlacement = "homepage" | "docs-footer";

const sponsorCampaignByPlacement = {
  homepage: "homepage-sponsor",
  "docs-footer": "docs-sponsored-footer",
} satisfies Record<EnderDashSponsorPlacement, string>;

function getSponsorHref(placement: EnderDashSponsorPlacement) {
  const url = new URL("https://enderdash.com/");
  url.searchParams.set("utm_source", "soulfiremc.com");
  url.searchParams.set("utm_medium", "sponsored");
  url.searchParams.set("utm_campaign", sponsorCampaignByPlacement[placement]);
  return url.toString();
}

/** A quiet sponsor note that should never outweigh the page's own content. */
export function EnderDashSponsor({
  className,
  placement,
}: {
  className?: string;
  placement: EnderDashSponsorPlacement;
}) {
  const t = useT();
  const href = getSponsorHref(placement);

  return (
    <aside
      aria-label={t("sponsor.ariaLabel")}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <a
          href={href}
          rel="sponsored"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950 p-1.5"
        >
          <Image
            src="/sponsors/enderdash-logo.png"
            alt={t("sponsor.logoAlt")}
            width={36}
            height={36}
            className="h-auto w-full"
          />
        </a>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">
            {t("sponsor.footerTitle")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {t("sponsor.sponsored")}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("sponsor.footerDescription")}
          </p>
        </div>
      </div>
      <Button
        render={
          <a href={href} rel="sponsored">
            {t("sponsor.visit")}
            <ArrowUpRight />
          </a>
        }
        nativeButton={false}
        variant="outline"
        size="sm"
        className="w-fit shrink-0"
      />
    </aside>
  );
}
