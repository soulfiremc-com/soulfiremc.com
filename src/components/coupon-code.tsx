import type { MessageKey } from "@/lib/messages";
import { useT } from "@/lib/i18n-react";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CouponCode({
  code,
  discount,
}: {
  code: string;
  discount?: MessageKey;
}) {
  const t = useT();
  const [copied, handleCopy] = useCopyButton(() =>
    navigator.clipboard.writeText(code),
  );

  return (
    <div className="flex items-center gap-2 rounded-lg bg-offer/10 p-3">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {discount
            ? t("offers.useCodeFor", { discount: t(discount) })
            : t("offers.couponCode")}
        </p>
        <p className="font-mono font-semibold text-offer">{code}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="text-muted-foreground hover:bg-offer/10"
        aria-label={t("offers.copyCouponCode")}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? t("offers.couponCopied") : ""}
      </span>
    </div>
  );
}

/** A discount that applies when the visitor registers through the provider link. */
export function LinkDiscountNotice({
  message,
  href,
}: {
  message: MessageKey;
  href: string;
}) {
  const t = useT();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center justify-between gap-2 rounded-lg bg-offer/10 p-3 text-sm font-medium text-offer transition-colors outline-none hover:bg-offer/15 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {t(message)}
      <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
    </a>
  );
}
