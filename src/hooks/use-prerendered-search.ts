import { useHydrated } from "@tanstack/react-router";

export function usePrerenderedSearch<T>(search: T, defaults: T): T {
  return useHydrated() ? search : defaults;
}
