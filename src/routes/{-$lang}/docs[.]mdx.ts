import { docsMarkdownHandlers } from "@/lib/docs/markdown-route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$lang}/docs.mdx")({
  server: { handlers: docsMarkdownHandlers },
});
