import { createFileRoute } from "@tanstack/react-router";
import type { Node } from "fumadocs-core/page-tree";
import { translate } from "@/lib/messages";
import { truncateDescription } from "@/lib/seo";
import { absoluteUrl, siteDescription, siteName } from "@/lib/site";

const textHeaders = { "Content-Type": "text/plain; charset=utf-8" };

type Section = { heading: string; urls: string[] };
type DocsPage = {
  data: { title?: string; description?: string; type?: string };
  slugs: string[];
  url: string;
};

/** One Markdown list entry. Descriptions are kept to one short line. */
function pageEntry(page: DocsPage) {
  const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";
  const description = page.data.description
    ? truncateDescription(page.data.description)
    : "";
  return `- [${title}](${absoluteUrl(`${page.url}.mdx`)})${description ? `: ${description}` : ""}`;
}

const sitePages = [
  ["Download", "/download", "download.meta.description"],
  ["Pricing", "/pricing", "support.meta.description"],
  [
    "Minecraft account providers",
    "/get-accounts",
    "providers.accounts.social.description",
  ],
  ["Proxy providers", "/get-proxies", "providers.proxies.social.description"],
] as const;

/** Groups page URLs by sidebar folder, in sidebar order. */
function collectSections(nodes: Node[], section: Section, sections: Section[]) {
  const heading = section.heading;
  let current = section;

  for (const node of nodes) {
    if (node.type === "page") {
      if (!node.external) current.urls.push(node.url);
    } else if (node.type === "separator") {
      const name = typeof node.name === "string" ? node.name : undefined;
      current = { heading: name ? `${heading}: ${name}` : heading, urls: [] };
      sections.push(current);
    } else {
      const folder: Section = {
        heading: typeof node.name === "string" ? node.name : heading,
        urls: node.index ? [node.index.url] : [],
      };
      sections.push(folder);
      collectSections(node.children, folder, sections);
      // Pages after a folder belong to the parent heading again.
      current = { heading, urls: [] };
      sections.push(current);
    }
  }

  return sections;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      HEAD: () => new Response(null, { headers: textHeaders }),
      GET: async () => {
        const { getSource } = await import("@/lib/source");
        const source = await getSource();
        const pages = new Map(
          source.getPages("en").map((page) => [page.url, page]),
        );
        const listed = new Set<string>();
        // Generated API reference pages go under "Optional", which the
        // llms.txt format marks as safe to skip when context is short.
        const apiReference: string[] = [];
        const lines = [
          `# ${siteName}`,
          `> ${siteDescription}`,
          `Each docs link points to a Markdown copy of a documentation page. All guide pages are also available as one file at ${absoluteUrl("/llms-full.txt")}. The HTTP API reference is listed under Optional.`,
          "## Website",
          sitePages
            .map(
              ([title, path, description]) =>
                `- [${title}](${absoluteUrl(path)}): ${translate("en", description)}`,
            )
            .join("\n"),
        ];

        const root: Section = { heading: "Docs", urls: [] };
        const sections = collectSections(
          source.getPageTree("en").children,
          root,
          [root],
        );
        for (const { heading, urls } of sections) {
          const entries = urls.flatMap((url) => {
            const page = pages.get(url);
            if (!page || listed.has(url)) return [];
            listed.add(url);
            if (page.data.type === "openapi") {
              apiReference.push(pageEntry(page));
              return [];
            }
            return [pageEntry(page)];
          });
          if (entries.length > 0)
            lines.push(`## ${heading}`, entries.join("\n"));
        }

        const unlisted = [...pages.values()].filter(
          (page) => !listed.has(page.url),
        );
        const otherPages: string[] = [];
        for (const page of unlisted) {
          (page.data.type === "openapi" ? apiReference : otherPages).push(
            pageEntry(page),
          );
        }
        if (otherPages.length > 0) {
          lines.push("## Other pages", otherPages.join("\n"));
        }

        const { getSortedBlogPages } = await import("@/lib/blog");
        lines.push(
          "## Blog",
          getSortedBlogPages()
            .map(
              (post) =>
                `- [${post.data.title}](${absoluteUrl(post.url)})${post.data.description ? `: ${post.data.description}` : ""}`,
            )
            .join("\n"),
          "## Optional",
          [
            `- [OpenAPI spec](${absoluteUrl("/sf-openapi.json")}): Machine-readable OpenAPI document for the ${siteName} HTTP API.`,
            ...apiReference,
          ].join("\n"),
        );

        return new Response(lines.join("\n\n"), { headers: textHeaders });
      },
    },
  },
});
