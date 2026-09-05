import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CouponCode({
  code,
  discount,
}: {
  code: string;
  discount?: string;
}) {
  const [copied, handleCopy] = useCopyButton(() =>
    navigator.clipboard.writeText(code),
  );

  return (
    <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 p-3">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">
          {discount ? `Use code for ${discount}` : "Coupon code"}
        </p>
        <p className="font-mono font-semibold text-pink-600 dark:text-pink-400">
          {code}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="text-muted-foreground hover:bg-pink-500/10"
        aria-label="Copy coupon code"
      >
        {copied ? <Check className="text-green-500" /> : <Copy />}
      </Button>
    </div>
  );
}
