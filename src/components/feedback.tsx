"use client";

import { useLocation } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
} from "fumadocs-ui/components/ui/collapsible";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { type SubmitEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PageFeedback {
  opinion: "good" | "bad";
  message: string;
}

export function Feedback() {
  const url = useLocation({ select: (location) => location.pathname });
  return <FeedbackForm key={url} url={url} />;
}

function FeedbackForm({ url }: { url: string }) {
  const posthog = usePostHog();
  const storageKey = `docs-feedback-${url}`;
  const [previous, setPrevious] = useState<PageFeedback | null>(null);
  const [opinion, setOpinion] = useState<"good" | "bad" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const item = localStorage.getItem(storageKey);
      if (item) setPrevious(JSON.parse(item) as PageFeedback);
    } catch {
      // Feedback remains available when browser storage is unavailable.
    }
  }, [storageKey]);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (opinion === null) return;

    const feedback: PageFeedback = { opinion, message };
    posthog.capture("on_rate_docs", feedback);
    setPrevious(feedback);
    setMessage("");
    setOpinion(null);

    try {
      localStorage.setItem(storageKey, JSON.stringify(feedback));
    } catch {
      // Capturing feedback does not depend on browser storage.
    }
  }

  const activeOpinion = previous?.opinion ?? opinion;

  return (
    <Collapsible
      open={opinion !== null || previous !== null}
      onOpenChange={(v) => {
        if (!v) setOpinion(null);
      }}
      className="border-y py-3"
    >
      <div className="flex flex-row items-center gap-2">
        <p className="text-sm font-medium pe-2">How is this page?</p>
        <ToggleGroup
          type="single"
          value={activeOpinion ?? ""}
          onValueChange={(value) => {
            if (value && previous === null) {
              setOpinion(value as "good" | "bad");
            }
          }}
          spacing={2}
        >
          <ToggleGroupItem
            value="good"
            disabled={previous !== null}
            className="rounded-full data-[state=on]:[&_svg]:fill-current"
          >
            <ThumbsUp data-icon="inline-start" />
            Good
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bad"
            disabled={previous !== null}
            className="rounded-full data-[state=on]:[&_svg]:fill-current"
          >
            <ThumbsDown data-icon="inline-start" />
            Bad
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <CollapsibleContent className="mt-3">
        {previous ? (
          <div className="px-3 py-6 flex flex-col items-center gap-3 bg-fd-card text-fd-muted-foreground text-sm text-center rounded-xl">
            <p>Thank you for your feedback!</p>
            <div className="flex flex-row items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOpinion(previous.opinion);
                  setPrevious(null);
                  try {
                    localStorage.removeItem(storageKey);
                  } catch {
                    // The form can still be submitted again.
                  }
                }}
              >
                Submit Again
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Textarea
              autoFocus
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-24 resize-none bg-fd-secondary text-fd-secondary-foreground placeholder:text-fd-muted-foreground"
              placeholder="Leave your feedback..."
              onKeyDown={(e) => {
                if (!e.shiftKey && e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button type="submit" variant="outline" className="w-fit">
              Submit
            </Button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
