import { Dialog } from "@base-ui/react/dialog";
import type { DefaultSearchDialogProps } from "fumadocs-ui/components/dialog/search-default";
import { lazy, Suspense, useEffect, useState } from "react";

const loadSearchDialog = () =>
  import("fumadocs-ui/components/dialog/search-default");

const DefaultSearchDialog = lazy(loadSearchDialog);

const SEARCH_TRIGGER_SELECTOR = "[data-search], [data-search-full]";

function preloadOnTriggerIntent(event: Event) {
  if (
    event.target instanceof Element &&
    event.target.closest(SEARCH_TRIGGER_SELECTOR)
  )
    void loadSearchDialog();
}

/**
 * Fumadocs mounts its search dialog on every page, which loads the dialog and
 * the Orama client at hydration. This dialog loads them when search first
 * opens. Until then an empty dialog root keeps the search buttons attached to
 * the shared dialog handle, so a click still opens search.
 */
export function LazySearchDialog(props: DefaultSearchDialogProps) {
  // Keep the dialog mounted after the first open, so it can animate closed and
  // reopen at once.
  const [requested, setRequested] = useState(false);
  if (props.open && !requested) setRequested(true);

  useEffect(() => {
    if (requested) return undefined;
    document.addEventListener("pointerover", preloadOnTriggerIntent);
    document.addEventListener("focusin", preloadOnTriggerIntent);
    return () => {
      document.removeEventListener("pointerover", preloadOnTriggerIntent);
      document.removeEventListener("focusin", preloadOnTriggerIntent);
    };
  }, [requested]);

  const placeholder = (
    <Dialog.Root
      open={props.open}
      onOpenChange={props.onOpenChange}
      handle={props.dialogHandle}
    />
  );
  if (!requested) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <DefaultSearchDialog {...props} />
    </Suspense>
  );
}
