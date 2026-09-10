import { ArrowUpRight } from "lucide-react";
import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EnderDashSponsorPlacement = "homepage" | "docs-footer" | "blog-footer";

type EnderDashSponsorProps = {
  className?: string;
  placement: EnderDashSponsorPlacement;
  variant?: "feature" | "footer";
};

const featureTitle =
  "Advanced administration for Minecraft servers without replacing your stack.";

const featureDescription =
  "EnderDash lets you manage your existing Minecraft servers from one dashboard by installing a single plugin. Run commands, read logs, manage files, invite your whole team, manage players, and keep Ocelot close at hand without changing your current infrastructure or panel.";

const footerTitle = "Need a more capable admin panel for your server?";

const footerDescription =
  "EnderDash adds an advanced dashboard to your existing Minecraft servers with a single plugin, batteries included.";

const featureHighlights = [
  "Run commands with tab completion",
  "Read logs and manage files",
  "Invite your whole team",
  "Manage players with Ocelot AI",
];

const sponsorCampaignByPlacement = {
  homepage: "homepage-sponsor",
  "docs-footer": "docs-sponsored-footer",
  "blog-footer": "blog-sponsored-footer",
} satisfies Record<EnderDashSponsorPlacement, string>;

function getSponsorHref(placement: EnderDashSponsorPlacement) {
  const url = new URL("https://enderdash.com/");
  url.searchParams.set("utm_source", "soulfiremc.com");
  url.searchParams.set("utm_medium", "sponsored");
  url.searchParams.set("utm_campaign", sponsorCampaignByPlacement[placement]);
  return url.toString();
}

function SponsorLogo({
  href,
  variant,
}: {
  href: string;
  variant: "feature" | "footer";
}) {
  if (variant === "feature") {
    return (
      <a
        href={href}
        className="flex size-32 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:size-36"
      >
        <span className="flex size-full items-center justify-center rounded-xl bg-zinc-950 p-4">
          <Image
            src="/sponsors/enderdash-logo.png"
            alt="EnderDash logo"
            width={96}
            height={96}
            className="h-auto w-full"
          />
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <Image
        src="/sponsors/enderdash-logo.png"
        alt="EnderDash logo"
        width={48}
        height={48}
        className="h-auto w-full"
      />
    </a>
  );
}

function SponsorButton({
  href,
  label,
  size,
}: {
  href: string;
  label: string;
  size: "default" | "lg";
}) {
  return (
    <Button
      asChild
      size={size}
      className="w-fit gap-2 border border-white/10 bg-white text-zinc-950 shadow-none hover:bg-zinc-200"
    >
      <a href={href}>
        {label}
        <ArrowUpRight />
      </a>
    </Button>
  );
}

export function EnderDashSponsor({
  className,
  placement,
  variant = "footer",
}: EnderDashSponsorProps) {
  const href = getSponsorHref(placement);

  if (variant === "feature") {
    return (
      <section
        aria-label="Partnered with EnderDash"
        className={cn(
          "overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-50",
          className,
        )}
      >
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-10">
          <div className="flex flex-col gap-5">
            <p className="text-xs font-medium text-zinc-400">Partnership</p>
            <div className="flex flex-col gap-3">
              <h2 className="max-w-4xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {featureTitle}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
                {featureDescription}
              </p>
            </div>
            <ul className="grid gap-x-8 gap-y-2 text-sm text-zinc-300 sm:grid-cols-2">
              {featureHighlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-200" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SponsorButton href={href} label="Visit EnderDash" size="lg" />
              <p className="text-sm text-zinc-400">
                Works with existing infrastructure and panels.
              </p>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <SponsorLogo href={href} variant="feature" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside
      aria-label="Partnered with EnderDash"
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-50",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-4">
          <SponsorLogo href={href} variant="footer" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs font-medium text-zinc-400">Sponsored</p>
            <p className="text-base font-semibold tracking-tight text-balance">
              {footerTitle}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              {footerDescription}
            </p>
          </div>
        </div>
        <SponsorButton href={href} label="Check out EnderDash" size="default" />
      </div>
    </aside>
  );
}
