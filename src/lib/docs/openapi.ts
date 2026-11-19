import { referencedSchemas } from "./openapi-contract";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { OpenAPIPageProps_Spec } from "fumadocs-openapi/ui";
import openApiDocument from "../../../public/sf-openapi.json" with { type: "json" };

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
  security?: unknown;
  summary?: string;
  tags?: string[];
};

type OpenApiSection = {
  content: string;
  heading: string;
  id: string;
};

type OpenApiContentDocument = {
  components?: { schemas?: Record<string, unknown>; securitySchemes?: unknown };
  security?: unknown;
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

/** Splits a service tag such as `MCAuthService` into `MC Auth Service`. */
export function formatOpenApiTagName(name: string) {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2");
}

export const openapi = createOpenAPI({
  input: {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fumadocs-openapi types the bundled document loosely; the API spec has this shape
    sf: {
      ...openApiDocument,
      // Fumadocs splits every capital letter, which turns `MC` into `M C`.
      // oxlint-disable-next-line oxc/no-map-spread -- the copies must not change the imported OpenAPI document
      tags: openApiDocument.tags.map((tag) => ({
        ...tag,
        "x-displayName": formatOpenApiTagName(tag.name),
      })),
    } as unknown as OpenApiInputDocument,
  },
});

export function isOpenApiPage(page: {
  data: { type?: string };
  slugs: string[];
  url: string;
}): page is OpenApiPageLike {
  return page.data.type === "openapi";
}

export function getOpenApiPageText(page: OpenApiPageLike) {
  const sections = getOpenApiSections(page, true);
  const lines = [`# ${page.data.title}`, `URL: ${page.url}`];

  if (page.data.description) {
    lines.push("", cleanText(page.data.description));
  }

  for (const section of sections) {
    lines.push("", `## ${section.heading}`, "", section.content);
  }

  return lines.join("\n");
}

export function getOpenApiStructuredData(page: OpenApiPageLike) {
  const sections = getOpenApiSections(page);

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

function getOpenApiSections(
  page: OpenApiPageLike,
  includeContracts = false,
): OpenApiSection[] {
  const props = page.data.getOpenAPIPageProps();
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fumadocs-openapi types the bundled document loosely; the API spec has this shape
  const document = props.payload.bundled as OpenApiContentDocument;
  const sections: OpenApiSection[] = [];

  for (const item of props.operations ?? []) {
    const pathItem = document.paths?.[item.path];
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fumadocs-openapi types the bundled document loosely; the API spec has this shape
    const operation = pathItem?.[item.method] as OpenApiOperation | undefined;

    sections.push({
      content: includeContracts
        ? formatContractContent(operation ?? {}, document)
        : formatSectionContent(operation ?? {}),
      heading: `${item.method.toUpperCase()} ${item.path}`,
      id: toHeadingId(item.method, item.path),
    });
  }

  for (const item of props.webhooks ?? []) {
    const pathItem = document.webhooks?.[item.name];
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fumadocs-openapi types the bundled document loosely; the API spec has this shape
    const operation = pathItem?.[item.method] as OpenApiOperation | undefined;

    sections.push({
      content: includeContracts
        ? formatContractContent(operation ?? {}, document)
        : formatSectionContent(operation ?? {}),
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

function formatContractContent(
  operation: OpenApiOperation,
  document: OpenApiContentDocument,
) {
  const contract = {
    security: operation.security ?? document.security,
    parameters: operation.parameters,
    requestBody: operation.requestBody,
    responses: operation.responses,
  };
  const schemas = referencedSchemas(
    contract,
    document.components?.schemas ?? {},
  );
  return `${formatSectionContent(operation)}\n\n### Request, response, and authentication contracts\n\n\`\`\`json\n${JSON.stringify({ ...contract, components: { securitySchemes: document.components?.securitySchemes, schemas } }, null, 2)}\n\`\`\``;
}

function cleanText(value: string) {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function formatSectionContent({
  description,
  parameters,
  requestBody,
  responses,
  summary,
  tags,
}: OpenApiOperation) {
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

          return `${location}${name} (${required}${descriptionText})`;
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
    .replaceAll(/[^a-z0-9]+/giu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .toLowerCase();
}
