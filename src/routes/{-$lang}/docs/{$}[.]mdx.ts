import { isLocale } from "@/lib/i18n";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$lang}/docs/{$}.mdx")({
  server: {
    handlers: {
      HEAD: async () =>
        new Response(null, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
          },
        }),
      GET: async ({ params, request }) => {
        if (params.lang && !isLocale(params.lang)) throw notFound();
        const [{ getLLMText }, { getSource }] = await Promise.all([
          import("@/lib/get-llm-text"),
          import("@/lib/source"),
        ]);
        const slugs = params._splat?.split("/").filter(Boolean) ?? [];
        const page = (await getSource()).getPage(
          slugs,
          isLocale(params.lang) ? params.lang : "en",
        );
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
