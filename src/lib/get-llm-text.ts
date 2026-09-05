import { getOpenApiPageText, isOpenApiPage } from "@/lib/docs/openapi";
import { getSource } from "@/lib/source";

export async function getLLMText(page: {
  data: {
    description?: string;
    getText?: (mode: "processed") => Promise<string>;
    title?: string;
    type?: string;
  };
  slugs: string[];
  url: string;
}) {
  if (isOpenApiPage(page)) {
    return getOpenApiPageText(page);
  }

  const getText = page.data.getText;
  if (!getText) {
    const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";
    return `# ${title}
URL: ${page.url}

${page.data.description ?? ""}`;
  }

  const processed = await getText("processed");
  const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";

  return `# ${title}
URL: ${page.url}

${page.data.description ?? ""}

${processed}`;
}

export async function getFullLLMText() {
  const source = await getSource();
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return scanned.join("\n\n");
}
