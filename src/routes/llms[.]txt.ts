import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      HEAD: async () =>
        new Response(null, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }),
      GET: async () => {
        const { getSource } = await import("@/lib/source");
        const source = await getSource();
        const scanned: string[] = [];
        scanned.push("# Docs");
        const map = new Map<string, string[]>();

        for (const page of source.getPages("en")) {
          const dir = page.slugs[0] ?? "overview";
          const list = map.get(dir) ?? [];
          list.push(
            `- [${page.data.title ?? page.slugs.at(-1) ?? "Docs"}](${page.url}): ${page.data.description ?? ""}`,
          );
          map.set(dir, list);
        }

        for (const [key, value] of map) {
          scanned.push(`## ${key}`);
          scanned.push(value.join("\n"));
        }

        return new Response(scanned.join("\n\n"), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      },
    },
  },
});
