import { Effect } from "effect";
import { getOpenApiPageText, isOpenApiPage } from "@/lib/docs/openapi";
import { getSource } from "@/lib/source";
import {
  DocumentationError,
  DocumentationSource,
  documentationPageText,
  fullDocumentationText,
  type DocumentationPage,
} from "@/lib/content-workflows";
import { runWebsiteEffect } from "@/lib/effect-runtime";

const documentationSource: ContextShape = {
  pages: Effect.tryPromise({
    try: async () => (await getSource()).getPages("en"),
    catch: (cause) => new DocumentationError({ operation: "source", cause }),
  }),
  openapi: (page) =>
    Effect.try({
      try: () => {
        if (!isOpenApiPage(page)) throw new Error("Not an OpenAPI page");
        return getOpenApiPageText(page);
      },
      catch: (cause) => new DocumentationError({ operation: "openapi", cause }),
    }),
};
type ContextShape = import("effect").Context.Service.Shape<
  typeof DocumentationSource
>;

export function getLLMText(page: DocumentationPage, signal?: AbortSignal) {
  return runWebsiteEffect(
    documentationPageText(page).pipe(
      Effect.provideService(DocumentationSource, documentationSource),
    ),
    signal,
  );
}

export function getFullLLMText(signal?: AbortSignal) {
  return runWebsiteEffect(
    fullDocumentationText().pipe(
      Effect.provideService(DocumentationSource, documentationSource),
    ),
    signal,
  );
}
