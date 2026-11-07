import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/{$}.mdx")({
  server: {
    handlers: {
      HEAD: async () =>
        new Response(null, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
          },
        }),
      GET: async ({ params, request }) => {
        const [{ getLLMText }, { getSource }] = await Promise.all([
          import("@/lib/get-llm-text"),
          import("@/lib/source"),
        ]);
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const page = (await getSource()).getPage(slugs);
        if (!page) {
          throw notFound();
        }

        return new Response(await getLLMText(page, request.signal), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
          },
        });
      },
    },
  },
});
