import type { ComponentProps } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Wide legal tables scroll sideways on phones. The scroll region takes focus
// and has a name, so keyboard users (Safari does not focus plain scroll
// containers) can reach the hidden columns with the arrow keys.
export function LegalTable({
  label,
  className,
  ...props
}: ComponentProps<typeof Table> & { label: string }) {
  return (
    <section
      aria-label={label}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable for keyboard scrolling
      tabIndex={0}
      className="overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-fd-ring *:data-[slot=table-container]:overflow-visible"
    >
      <Table
        className={cn("[&_td]:min-w-32 [&_td]:whitespace-normal", className)}
        {...props}
      />
    </section>
  );
}
