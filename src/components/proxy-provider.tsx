import { Image } from "@/components/image";
import { ProviderInfoPopover } from "@/components/provider-info-popover";
import { Badge as UiBadge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n-react";
import { BADGE_CONFIG, type Badge, type Provider } from "@/lib/proxies-data";
import { cn } from "@/lib/utils";

const LOGO_SIZES = {
  card: {
    sizes: "48px",
    breakpoints: [48, 96, 144],
    image: "p-2",
    fallback: "text-2xl",
  },
  page: {
    sizes: "56px",
    breakpoints: [56, 112, 168],
    image: "p-3",
    fallback: "text-4xl",
  },
} as const;

/** Fills its parent, which sets the logo's size and shape. */
export function ProxyProviderLogo({
  provider,
  size,
}: {
  provider: Provider;
  size: keyof typeof LOGO_SIZES;
}) {
  const t = useT();
  const config = LOGO_SIZES[size];
  if (provider.logo) {
    return (
      <Image
        src={provider.logo}
        alt={t("providers.accounts.logo", { provider: provider.name })}
        fill
        sizes={config.sizes}
        breakpoints={[...config.breakpoints]}
        className={cn("size-full object-contain", config.image)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 font-bold text-primary",
        config.fallback,
      )}
    >
      {provider.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function ProxyProviderBadge({ badge }: { badge: Badge }) {
  const t = useT();
  const config = BADGE_CONFIG[badge];
  return (
    <ProviderInfoPopover
      trigger={
        <UiBadge
          variant="outline"
          className={cn(
            "cursor-help border-transparent",
            config.className /* oxlint-disable-line shadcn/require-static-classes -- Classes come from a finite provider or badge theme map. */,
          )}
        >
          {config.icon}
          {t(config.label)}
        </UiBadge>
      }
    >
      <p>{t(config.description)}</p>
    </ProviderInfoPopover>
  );
}

/** Lists proxy types as one line of text, so cards stay short. */
export function ProxyTypeList({ types }: { types: readonly Badge[] }) {
  const t = useT();
  return (
    <p className="text-sm text-muted-foreground">
      <span className="sr-only">{t("providers.proxies.proxyTypes")}: </span>
      {types.map((type) => t(BADGE_CONFIG[type].label)).join(" · ")}
    </p>
  );
}
