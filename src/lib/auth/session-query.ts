import type { AuthClient } from "@better-auth-ui/core";
import { queryOptions } from "@tanstack/react-query";

/**
 * The session query that Better Auth UI runs, under the same query key, so
 * both read one cache entry and its sign-in and sign-out updates. Pages that
 * only show the session use this to avoid loading the Better Auth UI bundle.
 */
export function sessionQueryOptions(authClient: AuthClient) {
  return queryOptions({
    queryKey: ["auth", "getSession"],
    queryFn: ({ signal }) =>
      authClient.getSession({ fetchOptions: { signal, throw: true } }),
  });
}
