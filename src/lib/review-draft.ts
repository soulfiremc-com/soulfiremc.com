import type { ItemType } from "@/lib/review-core";

export type ReviewDraft = { rating: number; body: string };

/**
 * Identify the saved values a review form starts from. Equal values give the
 * same key, so refetched data does not reset unsaved edits.
 */
export function reviewFormSourceKey(
  source: { rating: number; body: string | null } | null | undefined,
) {
  return source ? JSON.stringify([source.rating, source.body ?? ""]) : null;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function reviewDraftKey(itemType: ItemType, slug: string) {
  return `review-draft:${itemType}:${slug}`;
}

function sessionDraftStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    // Storage access throws when the browser blocks site data.
    return null;
  }
}

/** Keep an unsent review while the visitor signs in. */
export function saveReviewDraft(
  itemType: ItemType,
  slug: string,
  draft: ReviewDraft,
  storage = sessionDraftStorage(),
) {
  try {
    storage?.setItem(reviewDraftKey(itemType, slug), JSON.stringify(draft));
  } catch {
    // A full or blocked storage only loses the draft.
  }
}

/** Read and remove a saved draft, so it restores only once. */
export function takeReviewDraft(
  itemType: ItemType,
  slug: string,
  storage = sessionDraftStorage(),
): ReviewDraft | null {
  const key = reviewDraftKey(itemType, slug);
  try {
    const value = storage?.getItem(key);
    storage?.removeItem(key);
    if (!value) return null;
    const draft: unknown = JSON.parse(value);
    if (
      typeof draft !== "object" ||
      draft === null ||
      !("rating" in draft) ||
      !("body" in draft)
    ) {
      return null;
    }
    const { rating, body } = draft;
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      typeof body !== "string"
    ) {
      return null;
    }
    return { rating, body: body.slice(0, 2000) };
  } catch {
    return null;
  }
}
