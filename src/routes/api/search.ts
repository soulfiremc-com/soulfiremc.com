import { createFileRoute } from "@tanstack/react-router";
import { exportDocsSearch } from "@/lib/docs/search";

export const Route = createFileRoute("/api/search")({
  server: { handlers: { GET: () => exportDocsSearch("en") } },
});
