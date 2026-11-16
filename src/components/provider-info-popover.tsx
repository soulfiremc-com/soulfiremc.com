import type { ReactElement, ReactNode } from "react";
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
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        nativeButton={false}
        render={trigger}
      />
      <PopoverContent className="w-auto max-w-64">
        <div className="flex flex-col gap-1 text-sm">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
