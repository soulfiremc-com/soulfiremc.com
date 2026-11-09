import { createFileRoute } from "@tanstack/react-router";
import { isLocale } from "@/lib/i18n";
import { exportDocsSearch } from "@/lib/docs/search";

export const Route = createFileRoute("/api/search-index/$lang")({
  server: {
    handlers: {
      GET: ({ params }) =>
        isLocale(params.lang)
          ? exportDocsSearch(params.lang)
          : new Response(null, { status: 404 }),
    },
  },
});
