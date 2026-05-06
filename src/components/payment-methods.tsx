import { CreditCard } from "lucide-react";

export function PaymentMethods({ methods }: { methods?: string[] }) {
  if (!methods?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        Payments
      </span>
      {methods.map((method) => (
        <span
          key={method}
          className="rounded-md border bg-background px-1.5 py-0.5"
        >
          {method}
        </span>
      ))}
    </div>
  );
}
