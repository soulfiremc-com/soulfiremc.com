import { createFileRoute } from "@tanstack/react-router";
import type { Node } from "fumadocs-core/page-tree";
import { translate } from "@/lib/messages";
import { absoluteUrl, siteDescription, siteName } from "@/lib/site";

const textHeaders = { "Content-Type": "text/plain; charset=utf-8" };

type Section = { heading: string; urls: string[] };

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
        const lines = [
          `# ${siteName}`,
          `> ${siteDescription}`,
          `Each docs link points to a Markdown copy of a documentation page. The full documentation is also available as one file at ${absoluteUrl("/llms-full.txt")}.`,
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
            const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";
            const description = page.data.description?.trim();
            return [
              `- [${title}](${absoluteUrl(`${url}.mdx`)})${description ? `: ${description}` : ""}`,
            ];
          });
          if (entries.length > 0)
            lines.push(`## ${heading}`, entries.join("\n"));
        }

        const unlisted = [...pages.values()].filter(
          (page) => !listed.has(page.url),
        );
        if (unlisted.length > 0) {
          lines.push(
            "## Other pages",
            unlisted
              .map(
                (page) =>
                  `- [${page.data.title ?? page.slugs.at(-1) ?? "Docs"}](${absoluteUrl(`${page.url}.mdx`)})`,
              )
              .join("\n"),
          );
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
        );

        return new Response(lines.join("\n\n"), { headers: textHeaders });
      },
    },
  },
});
