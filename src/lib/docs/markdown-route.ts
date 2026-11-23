import { isLocale } from "@/lib/i18n";

type DocsMarkdownParams = { lang?: string; _splat?: string };

const markdownHeaders = { "Content-Type": "text/markdown; charset=utf-8" };

async function findPage({ lang, _splat }: DocsMarkdownParams) {
  if (lang && !isLocale(lang)) return undefined;
  const { getSource } = await import("@/lib/source");
  const slugs = _splat?.split("/").filter(Boolean) ?? [];
  return (await getSource()).getPage(slugs, isLocale(lang) ? lang : "en");
}

const notFoundResponse = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

/** Serves the Markdown copy of a docs page for `/docs.mdx` and `/docs/*.mdx`. */
export const docsMarkdownHandlers = {
  HEAD: async ({ params }: { params: DocsMarkdownParams }) =>
    (await findPage(params))
      ? new Response(null, { headers: markdownHeaders })
      : notFoundResponse(),
  GET: async ({
    params,
    request,
  }: {
    params: DocsMarkdownParams;
    request: Request;
  }) => {
    const page = await findPage(params);
    if (!page) return notFoundResponse();

    const { getLLMText } = await import("@/lib/get-llm-text");
    return new Response(await getLLMText(page, request.signal), {
      headers: markdownHeaders,
    });
  },
};
