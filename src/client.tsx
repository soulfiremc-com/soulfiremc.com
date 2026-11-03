import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import posthog from "posthog-js";
import { isPostHogConfigured } from "@/lib/integrations/posthog";
import { createRecoverableErrorHandler } from "@/lib/react-error-reporting";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  // Avoid reload loops for genuine network failures.
  const key = "vite-preload-reload";
  const lastReload = Number(sessionStorage.getItem(key) ?? 0);

  if (Date.now() - lastReload > 10_000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
    {
      onRecoverableError: import.meta.env.DEV
        ? undefined
        : createRecoverableErrorHandler(
            isPostHogConfigured
              ? (error, properties) =>
                  posthog.captureException(error, properties)
              : undefined,
          ),
    },
  );
});
