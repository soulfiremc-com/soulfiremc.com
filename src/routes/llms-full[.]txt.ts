import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, siteName } from "@/lib/site";

const textHeaders = { "Content-Type": "text/plain; charset=utf-8" };

const preamble = [
  `# ${siteName} documentation`,
  `This file holds every ${siteName} guide page as Markdown. The HTTP API reference is not included. Read the OpenAPI spec at ${absoluteUrl("/sf-openapi.json")} or the endpoint list in ${absoluteUrl("/llms.txt")} instead.`,
].join("\n\n");

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      HEAD: () => new Response(null, { headers: textHeaders }),
      GET: async ({ request }) => {
        const { getFullLLMText } = await import("@/lib/get-llm-text");
        const text = await getFullLLMText(request.signal);
        return new Response(`${preamble}\n\n${text}`, {
          headers: textHeaders,
        });
      },
    },
  },
});
