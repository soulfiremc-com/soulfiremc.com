"use client";

import { useLocation } from "@tanstack/react-router";
import {
  Collapsible,
  CollapsibleContent,
} from "fumadocs-ui/components/ui/collapsible";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { type SyntheticEvent, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface Feedback {
  opinion: "good" | "bad";
  url?: string;
  message: string;
}

export type ActionResponse = object;

interface Result extends Feedback {
  response?: ActionResponse;
}

export function Feedback() {
  const location = useLocation();
  const url = location.pathname;
  const posthog = usePostHog();
  const [previous, setPrevious] = useState<Result | null>(null);
  const [opinion, setOpinion] = useState<"good" | "bad" | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const item = localStorage.getItem(`docs-feedback-${url}`);

    if (item === null) return;
    setPrevious(JSON.parse(item) as Result);
  }, [url]);

  useEffect(() => {
    const key = `docs-feedback-${url}`;

    if (previous) localStorage.setItem(key, JSON.stringify(previous));
    else localStorage.removeItem(key);
  }, [previous, url]);

  function submit(e?: SyntheticEvent) {
    if (opinion == null) return;

    startTransition(async () => {
      const feedback: Feedback = {
        opinion,
        message,
      };

      posthog.capture("on_rate_docs", feedback);
      setPrevious(feedback);
      setMessage("");
      setOpinion(null);
    });

    e?.preventDefault();
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
                  submit(e);
                }
              }}
            />
            <Button
              type="submit"
              variant="outline"
              className="w-fit"
              disabled={isPending}
            >
              Submit
            </Button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
