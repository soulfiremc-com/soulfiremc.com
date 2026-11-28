import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveReviewLink } from "@/lib/review-links";

// A shop's review link opens its review form and marks the review as invited.
export const Route = createFileRoute("/{-$lang}/review/$slug")({
  beforeLoad: ({ params }) => {
    const target = resolveReviewLink(params.slug);
    if (!target) throw notFound();
    throw redirect({
      to:
        target === "account"
          ? "/{-$lang}/get-accounts/$slug"
          : "/{-$lang}/get-proxies/$slug",
      params,
      search: { invite: true },
      hash: "reviews",
    });
  },
});
