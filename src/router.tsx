import { environmentManager, QueryClient } from "@tanstack/react-query";
import { createRouter, deepEqual } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { preloadAuthUi } from "@/lib/auth/lazy-auth-ui";
import { isAuthUiPath } from "@/lib/auth-ui-config";
import { preloadDocsContentForHydration } from "@/lib/docs/hydration";
import { splitLocalePath } from "@/lib/i18n";
import { loadMessages } from "@/lib/messages";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // A failed server render should fail fast instead of stalling the
        // document through retry backoff.
        retry: environmentManager.isServer() ? 0 : 3,
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
    hydrate: async () => {
      await Promise.all([
        preloadDocsContentForHydration(),
        preloadAuthUiForHydration(),
        // Server-rendered text must match the first client render.
        loadMessages(splitLocalePath(window.location.pathname).locale),
      ]);
    },
  });

  // Auth forms and settings cards load on demand. Start that load with the
  // route chunks so the page does not render empty cards first.
  router.subscribe("onBeforeLoad", ({ toLocation }) => {
    if (isAuthUiPath(toLocation.pathname)) void preloadAuthUi();
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
}

/** Loads the auth UI of a server-rendered auth page before React hydrates. */
async function preloadAuthUiForHydration() {
  if (!isAuthUiPath(window.location.pathname)) return;
  try {
    await preloadAuthUi();
  } catch {
    // React loads the components again while rendering and reports a failure.
  }
}
