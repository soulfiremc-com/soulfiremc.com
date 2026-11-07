import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      HEAD: async () =>
        new Response(null, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }),
      GET: async ({ request }) => {
        const { getFullLLMText } = await import("@/lib/get-llm-text");
        return new Response(await getFullLLMText(request.signal), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      },
    },
  },
});
