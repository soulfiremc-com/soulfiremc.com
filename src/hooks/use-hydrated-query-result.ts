import { useHydrated } from "@tanstack/react-router";

/** Keep non-suspending values stable while streamed queries reach the client. */
export function useHydratedQueryResult<T>(query: {
  data: T | undefined;
  isPending: boolean;
}) {
  const hydrated = useHydrated();
  // A streamed result can resolve after the server rendered a skeleton but
  // before React hydrates it. Reveal the result only after hydration commits.
  return {
    data: hydrated ? query.data : undefined,
    isPending: !hydrated || query.isPending,
  };
}
