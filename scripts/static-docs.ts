import { locales, localizePath, splitLocalePath } from "../src/lib/i18n.ts";
import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { Effect } from "effect";
import { fromCrossJSON, toJSONAsync } from "seroval";
import { type Plugin, preview } from "vite";

export const docsMetadataFunctionId = "docs-metadata";

export function docsFunctionId(options: {
  filename: string;
  functionName: string;
}) {
  if (
    options.filename
      .replaceAll("\\", "/")
      .endsWith("/routes/{-$lang}/docs/$.tsx") &&
    options.functionName === "serverLoader_createServerFn_handler"
  ) {
    return docsMetadataFunctionId;
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return files.flat();
}

// Cloudflare prerenders in an isolated Worker, where TanStack's middleware cannot
// write to the host filesystem. Snapshot its public RPC through a local preview
// after prerendering, using the same Seroval JSON format as TanStack's static middleware.
export function staticDocsMetadata(): Plugin {
  return {
    name: "static-docs-metadata",
    enforce: "post",
    apply: "build",
    buildApp: {
      order: "post",
      async handler(builder) {
        const output = builder.environments.client?.config.build.outDir;
        if (!output) throw new Error("Client build output is unavailable");
        await Effect.runPromise(
          Effect.acquireUseRelease(
            Effect.tryPromise(() =>
              preview({
                configFile: builder.config.configFile,
                preview: { port: 0, open: false },
              }),
            ),
            (server) =>
              Effect.gen(function* () {
                const origin = server.resolvedUrls?.local[0];
                if (!origin)
                  throw new Error("Metadata preview URL is unavailable");
                const files = yield* Effect.tryPromise(() => listFiles(output));
                // Fallback URLs are excluded from SEO, but client navigation still
                // needs a static metadata response for every supported locale.
                const paths = new Set(
                  files
                    .map((file) => relative(output, file).replaceAll("\\", "/"))
                    .filter((file) => file.endsWith(".html"))
                    .map(
                      (file) => splitLocalePath(`/${file.slice(0, -5)}`).path,
                    )
                    .filter(
                      (path) => path === "/docs" || path.startsWith("/docs/"),
                    ),
                );
                const pages = [...paths]
                  .flatMap((path) =>
                    locales.map(
                      (locale) => `${localizePath(path, locale).slice(1)}.html`,
                    ),
                  )
                  .sort();
                if (!pages.length)
                  throw new Error("No prerendered documentation pages found");
                yield* Effect.forEach(
                  pages,
                  (page) =>
                    Effect.tryPromise(async () => {
                      const { path: absolute, locale } = splitLocalePath(
                        `/${page.slice(0, -".html".length)}`,
                      );
                      const path = absolute.slice(1);
                      const slugs =
                        path === "docs"
                          ? []
                          : path
                              .slice("docs/".length)
                              .split("/")
                              .map(decodeURIComponent);
                      const data = [locale, ...slugs];
                      const payload = await toJSONAsync({ data });
                      const url = new URL(
                        `/_serverFn/${docsMetadataFunctionId}`,
                        origin,
                      );
                      url.searchParams.set("payload", JSON.stringify(payload));
                      const result = await fetch(url, {
                        headers: {
                          "x-tsr-serverfn": "true",
                          accept: "application/json",
                          origin: new URL(origin).origin,
                          "sec-fetch-site": "same-origin",
                        },
                        signal: AbortSignal.timeout(30_000),
                      });
                      if (
                        !result.ok ||
                        !result.headers
                          .get("content-type")
                          ?.includes("application/json")
                      ) {
                        await result.body?.cancel();
                        throw new Error(
                          `Metadata request failed for /${path}: ${result.status}`,
                        );
                      }
                      const response = fromCrossJSON(await result.json(), {});
                      if (
                        !response ||
                        typeof response !== "object" ||
                        ("error" in response && response.error !== undefined) ||
                        !("result" in response) ||
                        !response.result
                      ) {
                        throw new Error(
                          `Cannot snapshot docs metadata for /${path}`,
                        );
                      }
                      // Match the cache key of the pinned staticFunctionMiddleware.
                      // Slugs are string arrays, so no object-key sorting is needed.
                      const hash = JSON.stringify(data)
                        .replace(/[/\\?%*:|"<>]/g, "-")
                        .replace(/\s+/g, "_");
                      const key = createHash("sha1")
                        .update(`${docsMetadataFunctionId}__${hash}`)
                        .digest("hex");
                      const destination = join(
                        output,
                        "__tsr/staticServerFnCache",
                        `${key}.json`,
                      );
                      const json = JSON.stringify(await toJSONAsync(response));
                      await mkdir(dirname(destination), { recursive: true });
                      await writeFile(destination, json);
                    }),
                  { concurrency: 4 },
                );
                console.info(
                  `[static-docs] Wrote ${pages.length} metadata snapshots`,
                );
              }),
            (server) => Effect.promise(() => server.close()),
          ),
        );
      },
    },
  };
}
