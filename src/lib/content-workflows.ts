import { Context, Data, Effect } from "effect";

export interface DocumentationPage {
  readonly data: {
    readonly description?: string;
    readonly getText?: (mode: "processed") => Promise<string>;
    readonly title?: string;
    readonly type?: string;
  };
  readonly slugs: string[];
  readonly url: string;
}

export class DocumentationError extends Data.TaggedError("DocumentationError")<{
  readonly operation: "source" | "page" | "openapi";
  readonly cause: unknown;
}> {
  override get message() {
    return "Unable to load documentation";
  }
}

export class DocumentationSource extends Context.Service<
  DocumentationSource,
  {
    readonly pages: Effect.Effect<
      readonly DocumentationPage[],
      DocumentationError
    >;
    readonly openapi: (
      page: DocumentationPage,
    ) => Effect.Effect<string, DocumentationError>;
  }
>()("soulfire/DocumentationSource") {}

export const documentationPageText = Effect.fn("Documentation.pageText")(
  function* (page: DocumentationPage) {
    if (page.data.type === "openapi") {
      const source = yield* DocumentationSource;
      return yield* source.openapi(page);
    }
    const title = page.data.title ?? page.slugs.at(-1) ?? "Docs";
    const introduction = `# ${title}\nURL: ${page.url}\n\n${page.data.description ?? ""}`;
    const getText = page.data.getText;
    if (!getText) return introduction;
    const processed = yield* Effect.tryPromise({
      try: () => getText("processed"),
      catch: (cause) => new DocumentationError({ operation: "page", cause }),
    });
    return `${introduction}\n\n${processed}`;
  },
);

export const fullDocumentationText = Effect.fn("Documentation.fullText")(
  function* () {
    const source = yield* DocumentationSource;
    const pages = yield* source.pages;
    const text = yield* Effect.forEach(pages, documentationPageText, {
      concurrency: 4,
    });
    return text.join("\n\n");
  },
);
