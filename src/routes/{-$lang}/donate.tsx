import { createFileRoute, redirect } from "@tanstack/react-router";

// The URL owns the locale, so /de/donate opens /de/pricing.
export const Route = createFileRoute("/{-$lang}/donate")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/{-$lang}/pricing", params });
  },
});
