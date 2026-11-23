"use client";

import { useT } from "@/lib/i18n-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const cache = new Map<string, string>();

async function fetchMarkdown(markdownUrl: string) {
  const response = await fetch(markdownUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${markdownUrl}: ${response.status}`);
  }

  const content = await response.text();
  cache.set(markdownUrl, content);
  return content;
}

export function LLMCopyButton({
  /**
   * A URL to fetch the raw Markdown/MDX content of page
   */
  markdownUrl,
}: {
  markdownUrl: string;
}) {
  const t = useT();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const showStatus = (next: "copied" | "failed") => {
    window.clearTimeout(resetTimer.current);
    setStatus(next);
    resetTimer.current = window.setTimeout(() => {
      setStatus("idle");
    }, 1500);
  };

  const copy = async () => {
    const cached = cache.get(markdownUrl);
    if (cached) return navigator.clipboard.writeText(cached);

    const content = fetchMarkdown(markdownUrl);
    try {
      // Safari only keeps the user gesture when the clipboard write starts
      // before the fetch finishes.
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": content }),
      ]);
    } catch {
      // Older browsers reject a pending ClipboardItem value.
      await navigator.clipboard.writeText(await content);
    }
  };

  const onClick = async () => {
    setIsLoading(true);
    try {
      await copy();
      showStatus("copied");
    } catch {
      // The fetch or both clipboard writes failed. Say so instead of
      // leaving an unhandled rejection and no feedback.
      showStatus("failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      disabled={isLoading}
      aria-busy={isLoading}
      className={buttonVariants({
        color: "secondary",
        size: "sm",
        className: "gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground",
      })}
      onClick={() => void onClick()}
      type="button"
    >
      {status === "copied" ? <Check /> : <Copy />}
      <span aria-live="polite">
        {status === "copied"
          ? t("docs.copiedPage")
          : status === "failed"
            ? t("docs.copyPageFailed")
            : t("docs.copyPage")}
      </span>
    </button>
  );
}
