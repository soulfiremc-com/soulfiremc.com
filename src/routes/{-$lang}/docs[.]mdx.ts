import { isLocale } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";

const markdownHeaders = { "Content-Type": "text/markdown; charset=utf-8" };

async function findPage(params: { lang?: string }) {
  if (params.lang && !isLocale(params.lang)) return undefined;
  const { getSource } = await import("@/lib/source");
  return (await getSource()).getPage(
    [],
    isLocale(params.lang) ? params.lang : "en",
  );
}

const notFoundResponse = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

export const Route = createFileRoute("/{-$lang}/docs.mdx")({
  server: {
    handlers: {
      HEAD: async ({ params }) =>
        (await findPage(params))
          ? new Response(null, { headers: markdownHeaders })
          : notFoundResponse(),
      GET: async ({ params, request }) => {
        const page = await findPage(params);
        if (!page) return notFoundResponse();

        const { getLLMText } = await import("@/lib/get-llm-text");
        return new Response(await getLLMText(page, request.signal), {
          headers: markdownHeaders,
        });
      },
    },
  },
});
