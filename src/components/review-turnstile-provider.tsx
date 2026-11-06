"use client";

import { Effect } from "effect";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  type BoundTurnstileObject,
  Turnstile,
  type TurnstileProps,
} from "react-turnstile";

import { createReviewChallenge } from "@/lib/review-challenge";

type ReviewTurnstileContextValue = {
  executeTurnstile: () => Promise<string>;
};

const DEFAULT_CONTEXT: ReviewTurnstileContextValue = {
  executeTurnstile: async () => {
    throw new Error("Cloudflare Turnstile is unavailable.");
  },
};

const TURNSTILE_ACTION = "review";

const ReviewTurnstileContext =
  createContext<ReviewTurnstileContextValue>(DEFAULT_CONTEXT);

function toError(message: string, error?: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(message);
}

export function ReviewTurnstileProvider({ children }: { children: ReactNode }) {
  const siteKey = import.meta.env.VITE_REVIEW_TURNSTILE_SITE_KEY;
  const widgetRef = useRef<BoundTurnstileObject | null>(null);
  const challenge = useMemo(() => createReviewChallenge(), []);

  const resolvePending = useCallback(
    (token: string, boundTurnstile?: BoundTurnstileObject) => {
      if (boundTurnstile) {
        widgetRef.current = boundTurnstile;
      }

      challenge.resolve(token);
    },
    [challenge],
  );

  const rejectPending = useCallback(
    (
      message: string,
      error?: unknown,
      boundTurnstile?: BoundTurnstileObject,
    ) => {
      if (boundTurnstile) {
        widgetRef.current = boundTurnstile;
      }

      challenge.reject(message, error);
    },
    [challenge],
  );

  useEffect(() => {
    return () => {
      rejectPending("Cloudflare Turnstile was unloaded.");
    };
  }, [rejectPending]);

  const executeTurnstile = useCallback(() => {
    if (!siteKey) {
      return Promise.reject(
        new Error("Cloudflare Turnstile is not configured for this site."),
      );
    }

    const boundTurnstile = widgetRef.current;
    if (!boundTurnstile) {
      return Promise.reject(
        new Error("Cloudflare Turnstile is still loading. Please try again."),
      );
    }

    return Effect.runPromise(
      challenge
        .execute(boundTurnstile)
        .pipe(Effect.mapError((error) => toError(error.message, error.cause))),
    );
  }, [challenge, siteKey]);

  const handleLoad = useCallback<NonNullable<TurnstileProps["onLoad"]>>(
    (_widgetId, boundTurnstile) => {
      widgetRef.current = boundTurnstile;
    },
    [],
  );

  const handleError = useCallback<NonNullable<TurnstileProps["onError"]>>(
    (error, boundTurnstile) => {
      rejectPending(
        "Cloudflare Turnstile could not verify this review.",
        error,
        boundTurnstile,
      );
    },
    [rejectPending],
  );

  const handleExpire = useCallback<NonNullable<TurnstileProps["onExpire"]>>(
    (_token, boundTurnstile) => {
      rejectPending(
        "Cloudflare Turnstile verification expired. Please try again.",
        undefined,
        boundTurnstile,
      );
    },
    [rejectPending],
  );

  const handleTimeout = useCallback<NonNullable<TurnstileProps["onTimeout"]>>(
    (boundTurnstile) => {
      rejectPending(
        "Cloudflare Turnstile verification timed out. Please try again.",
        undefined,
        boundTurnstile,
      );
    },
    [rejectPending],
  );

  const handleUnsupported = useCallback<
    NonNullable<TurnstileProps["onUnsupported"]>
  >(
    (boundTurnstile) => {
      rejectPending(
        "This browser does not support Cloudflare Turnstile verification.",
        undefined,
        boundTurnstile,
      );
    },
    [rejectPending],
  );

  const contextValue = useMemo<ReviewTurnstileContextValue>(
    () => ({
      executeTurnstile,
    }),
    [executeTurnstile],
  );

  return (
    <ReviewTurnstileContext.Provider value={contextValue}>
      {children}
      {siteKey ? (
        <Turnstile
          sitekey={siteKey}
          action={TURNSTILE_ACTION}
          size="invisible"
          appearance="execute"
          execution="execute"
          responseField={false}
          onLoad={handleLoad}
          onVerify={resolvePending}
          onError={handleError}
          onExpire={handleExpire}
          onTimeout={handleTimeout}
          onUnsupported={handleUnsupported}
        />
      ) : null}
    </ReviewTurnstileContext.Provider>
  );
}

export function useReviewTurnstile() {
  return useContext(ReviewTurnstileContext);
}
