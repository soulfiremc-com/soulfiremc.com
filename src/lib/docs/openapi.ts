import { createOpenAPI } from "fumadocs-openapi/server";
import type { OpenAPIPageProps_Spec } from "fumadocs-openapi/ui";
import openApiDocument from "../../../public/sf-openapi.json" with {
  type: "json",
};

export type OpenApiPageLike = {
  data: {
    description?: string;
    getOpenAPIPageProps: () => OpenAPIPageProps_Spec;
    title: string;
    type?: string;
  };
  slugs: string[];
  url: string;
};

type OpenApiOperation = {
  description?: string;
  parameters?: Array<{
    description?: string;
    in?: string;
    name?: string;
    required?: boolean;
  }>;
  requestBody?: {
    content?: Record<string, unknown>;
    required?: boolean;
  };
  responses?: Record<
    string,
    {
      description?: string;
    }
  >;
  summary?: string;
  tags?: string[];
};

type OpenApiSection = {
  content: string;
  heading: string;
  id: string;
};

type OpenApiContentDocument = {
  paths?: Record<string, Record<string, unknown>>;
  webhooks?: Record<string, Record<string, unknown>>;
};

type OpenApiInput = Exclude<
  NonNullable<NonNullable<Parameters<typeof createOpenAPI>[0]>["input"]>,
  string[]
>;
type OpenApiInputDocument = Exclude<
  OpenApiInput[string],
  string | (() => unknown)
>;

export const openapi = createOpenAPI({
  input: {
    sf: openApiDocument as unknown as OpenApiInputDocument,
  },
});

export function isOpenApiPage(page: {
  data: { type?: string };
  slugs: string[];
  url: string;
}): page is OpenApiPageLike {
  return page.data.type === "openapi";
}

export async function getOpenApiPageText(page: OpenApiPageLike) {
  const sections = await getOpenApiSections(page);
  const lines = [`# ${page.data.title}`, `URL: ${page.url}`];

  if (page.data.description) {
    lines.push("", cleanText(page.data.description));
  }

  for (const section of sections) {
    lines.push("", `## ${section.heading}`, "", section.content);
  }

  return lines.join("\n");
}

export async function getOpenApiStructuredData(page: OpenApiPageLike) {
  const sections = await getOpenApiSections(page);

  return {
    contents: sections.map((section) => ({
      content: section.content,
      heading: section.id,
    })),
    headings: sections.map((section) => ({
      content: section.heading,
      id: section.id,
    })),
  };
}

async function getOpenApiSections(
  page: OpenApiPageLike,
): Promise<OpenApiSection[]> {
  const props = page.data.getOpenAPIPageProps();
  const document = props.payload.bundled as OpenApiContentDocument;
  const sections: OpenApiSection[] = [];

  for (const item of props.operations ?? []) {
    const pathItem = document.paths?.[item.path] as
      | Record<string, unknown>
      | undefined;
    const operation = pathItem?.[item.method] as OpenApiOperation | undefined;

    sections.push({
      content: formatSectionContent({
        description: operation?.description,
        heading: `${item.method.toUpperCase()} ${item.path}`,
        parameters: operation?.parameters,
        requestBody: operation?.requestBody,
        responses: operation?.responses,
        summary: operation?.summary,
        tags: operation?.tags,
      }),
      heading: `${item.method.toUpperCase()} ${item.path}`,
      id: toHeadingId(item.method, item.path),
    });
  }

  for (const item of props.webhooks ?? []) {
    const pathItem = document.webhooks?.[item.name] as
      | Record<string, unknown>
      | undefined;
    const operation = pathItem?.[item.method] as OpenApiOperation | undefined;

    sections.push({
      content: formatSectionContent({
        description: operation?.description,
        heading: `Webhook ${item.method.toUpperCase()} /${item.name}`,
        parameters: operation?.parameters,
        requestBody: operation?.requestBody,
        responses: operation?.responses,
        summary: operation?.summary,
        tags: operation?.tags,
      }),
      heading: `Webhook ${item.method.toUpperCase()} /${item.name}`,
      id: toHeadingId(item.method, item.name),
    });
  }

  if (sections.length > 0) {
    return sections;
  }

  return [
    {
      content: page.data.description
        ? cleanText(page.data.description)
        : "Generated SoulFire API reference page.",
      heading: page.data.title,
      id: toHeadingId("page", page.slugs.join("/")),
    },
  ];
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatSectionContent({
  description,
  heading: _heading,
  parameters,
  requestBody,
  responses,
  summary,
  tags,
}: {
  description?: string;
  heading: string;
  parameters?: OpenApiOperation["parameters"];
  requestBody?: OpenApiOperation["requestBody"];
  responses?: OpenApiOperation["responses"];
  summary?: string;
  tags?: string[];
}) {
  const lines: string[] = [];

  if (summary) {
    lines.push(cleanText(summary));
  }

  if (description && cleanText(description) !== cleanText(summary ?? "")) {
    lines.push(cleanText(description));
  }

  if (tags && tags.length > 0) {
    lines.push(`Tags: ${tags.join(", ")}`);
  }

  if (parameters && parameters.length > 0) {
    lines.push(
      `Parameters: ${parameters
        .map((parameter) => {
          const location = parameter.in ? `${parameter.in} ` : "";
          const name = parameter.name ?? "unnamed";
          const required = parameter.required ? "required" : "optional";
          const descriptionText = parameter.description
            ? `, ${cleanText(parameter.description)}`
            : "";

          return `${location}${name} (${required}${descriptionText ? descriptionText : ""})`;
        })
        .join("; ")}`,
    );
  }

  const contentTypes = Object.keys(requestBody?.content ?? {});
  if (contentTypes.length > 0) {
    lines.push(
      `Request body: ${contentTypes.join(", ")}${requestBody?.required ? " (required)" : ""}`,
    );
  }

  const responseEntries = Object.entries(responses ?? {});
  if (responseEntries.length > 0) {
    lines.push(
      `Responses: ${responseEntries
        .map(([status, response]) => {
          const descriptionText = response.description
            ? ` - ${cleanText(response.description)}`
            : "";

          return `${status}${descriptionText}`;
        })
        .join("; ")}`,
    );
  }

  return lines.join("\n\n");
}

function toHeadingId(method: string, value: string) {
  return `${method.toLowerCase()}-${value}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
