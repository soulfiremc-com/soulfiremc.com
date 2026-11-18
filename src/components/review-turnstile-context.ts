import { createContext, useContext } from "react";

export type ReviewTurnstileContextValue = {
  executeTurnstile: () => Promise<string>;
};

const DEFAULT_CONTEXT: ReviewTurnstileContextValue = {
  executeTurnstile: async () => {
    throw new Error("Cloudflare Turnstile is unavailable.");
  },
};

export const ReviewTurnstileContext =
  createContext<ReviewTurnstileContextValue>(DEFAULT_CONTEXT);

export function useReviewTurnstile() {
  return useContext(ReviewTurnstileContext);
}
