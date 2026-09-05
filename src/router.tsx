import { QueryClient } from "@tanstack/react-query";
import { createRouter, deepEqual } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        structuralSharing: (previous, next) =>
          deepEqual(previous, next) ? previous : next,
      },
    },
  });

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    scrollRestorationBehavior: "auto",
    defaultStructuralSharing: true,
    context: {
      queryClient,
    },
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
}
