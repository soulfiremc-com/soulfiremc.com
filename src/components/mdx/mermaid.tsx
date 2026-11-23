"use client";

import { useTheme } from "next-themes";
import {
  Component,
  type ReactNode,
  Suspense,
  use,
  useDeferredValue,
  useId,
} from "react";
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

  // Keep the diagram's loading and error states local. Without these
  // boundaries, the lazy import suspends the whole docs page, and a chart
  // with a syntax error replaces the page with the route error screen.
  return (
    <MermaidErrorBoundary chart={chart}>
      <Suspense fallback={placeholder}>
        <MermaidContent chart={chart} />
      </Suspense>
    </MermaidErrorBoundary>
  );
}

class MermaidErrorBoundary extends Component<
  { chart: string; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <pre className="my-6 overflow-x-auto rounded-lg border p-4 text-sm">
        <code>{this.props.chart}</code>
      </pre>
    );
  }
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
  // Drop failures so a later render can try again.
  promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key);
  });
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  // Keep the current diagram visible while the other theme renders.
  const resolvedTheme = useDeferredValue(useTheme().resolvedTheme);
  const { default: mermaid } = use(
    cachePromise("mermaid", () => import("mermaid")),
  );

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => {
      // Configure Mermaid right before each render instead of on every
      // React render, which would repeat this global side effect.
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
