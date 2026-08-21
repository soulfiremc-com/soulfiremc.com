import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

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
  );
});
