"use client";

import { useTheme } from "next-themes";
import { Suspense, use, useDeferredValue, useId } from "react";
import { useHydrated } from "@tanstack/react-router";

export function Mermaid({ chart }: { chart: string }) {
  const mounted = useHydrated();

  const placeholder = (
    <div
      aria-hidden="true"
      className="my-6 h-40 animate-pulse rounded-lg bg-fd-muted"
    />
  );

  if (!mounted) return placeholder;

  // Keep the diagram's loading state local. Without this boundary, the
  // lazy mermaid import suspends the whole docs page and hides it.
  return (
    <Suspense fallback={placeholder}>
      <MermaidContent chart={chart} />
    </Suspense>
  );
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(
  key: string,
  setPromise: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the cache stores the promise that the same loader produced for this key
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  // Keep the current diagram visible while the other theme renders.
  const resolvedTheme = useDeferredValue(useTheme().resolvedTheme);
  const { default: mermaid } = use(
    cachePromise("mermaid", () => import("mermaid")),
  );

  mermaid.initialize({
    startOnLoad: false,
    layout: "dagre",
    look: "classic",
    securityLevel: "loose",
    fontFamily: "inherit",
    themeCSS: "margin: 1.5rem auto 0;",
    theme: resolvedTheme === "dark" ? "dark" : "default",
    // The dark theme's gray edge label box drops its text to 4.4:1.
    // Set both values so a light render does not keep the dark override.
    themeVariables: {
      edgeLabelBackground:
        resolvedTheme === "dark" ? "#262626" : "rgba(232, 232, 232, 0.8)",
    },
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => {
      return mermaid.render(id, chart.replaceAll(String.raw`\n`, "\n"));
    }),
  );

  return (
    <div
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      // oxlint-disable-next-line react/no-danger -- Mermaid renders the diagram to an SVG string
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
