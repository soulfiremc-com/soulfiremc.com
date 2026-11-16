import { type ReactElement, type ReactNode, useId } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Explains a provider badge. It opens on hover with a mouse and on tap or
 * Enter otherwise, so touch and keyboard users can read the details too.
 */
export function ProviderInfoPopover({
  trigger,
  children,
}: {
  trigger: ReactElement;
  children: ReactNode;
}) {
  const triggerId = useId();
  return (
    <Popover>
      <PopoverTrigger
        id={triggerId}
        openOnHover
        delay={200}
        nativeButton={false}
        render={trigger}
      />
      {/* The badge names the dialog that keyboard users land in. */}
      <PopoverContent aria-labelledby={triggerId} className="w-auto max-w-64">
        <div className="flex flex-col gap-1 text-sm">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
