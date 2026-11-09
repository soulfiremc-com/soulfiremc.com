import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getPreference() {
  return window.matchMedia(query).matches;
}

function getServerPreference() {
  return null;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getPreference, getServerPreference);
}
