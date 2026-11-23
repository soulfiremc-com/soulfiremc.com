import * as React from "react";

// Matches Tailwind's `max-md` variant. Reading the same media query that
// drives the change event keeps the value in sync at fractional zoom widths,
// where `window.innerWidth` is rounded.
const MOBILE_QUERY = "(width < 48rem)";

function subscribeToMobileQuery(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => {
    mql.removeEventListener("change", onChange);
  };
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
