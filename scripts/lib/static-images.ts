import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { blurhashToDataUri } from "@unpic/placeholder";
import { encode } from "blurhash";
import { Data, Effect } from "effect";
import sharp from "sharp";
import type { StaticImageManifest } from "../../src/lib/static-images";

class StaticImageError extends Data.TaggedError("StaticImageError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {
  override get message() {
    return `${this.operation}: ${this.cause instanceof Error ? this.cause.message : String(this.cause)}`;
  }
}

// Keep encoding bounded even on build machines with many CPU cores.
sharp.concurrency(1);
const widths = [48, 96, 192, 384, 768, 1280, 1920];
const outputName = "_images";

export function generateStaticImages({
  publicDirectory,
  metadataFile,
  preserveSources = [],
}: {
  publicDirectory: URL;
  metadataFile: URL;
  preserveSources?: readonly string[];
}) {
  return Effect.gen(function* () {
    const directory = fileURLToPath(publicDirectory);
    const output = join(directory, outputName);
    const files = (yield* listFiles(directory))
      .filter((file) => {
        const source = relative(directory, file).replaceAll("\\", "/");
        return (
          !source.startsWith(`${outputName}/`) &&
          /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(source)
        );
      })
      .sort();
    yield* makeDirectory(output);
    const generated = new Set<string>();
    const entries = yield* Effect.forEach(
      files,
      (file) =>
        Effect.gen(function* () {
          const source = `/${relative(directory, file).replaceAll("\\", "/")}`;
          const bytes = yield* readBytes(file);
          const info = yield* operation(`read image metadata: ${source}`, () =>
            sharp(bytes).metadata(),
          );
          const rotated =
            info.orientation !== undefined &&
            info.orientation >= 5 &&
            info.orientation <= 8;
          const width = rotated ? info.height : info.width;
          const height = rotated ? info.width : info.height;
          if (!width || !height) {
            return yield* Effect.fail(
              new StaticImageError({
                operation: "read image dimensions",
                cause: source,
              }),
            );
          }
          const metadata: StaticImageManifest[string] = { width, height };
          if (
            info.format === "svg" ||
            info.format === "gif" ||
            (info.pages ?? 1) > 1 ||
            preserveSources.includes(source)
          )
            return [source, metadata] as const;

          const opaque = yield* operation(
            `inspect transparency: ${source}`,
            async () => (await sharp(bytes).stats()).isOpaque,
          );
          if (opaque) {
            metadata.background = yield* operation(
              `generate placeholder: ${source}`,
              async () => {
                const { data, info: pixels } = await sharp(bytes)
                  .rotate()
                  .resize(32, 32, { fit: "inside", withoutEnlargement: true })
                  .ensureAlpha()
                  .raw()
                  .toBuffer({ resolveWithObject: true });
                return blurhashToDataUri(
                  encode(
                    new Uint8ClampedArray(data),
                    pixels.width,
                    pixels.height,
                    4,
                    3,
                  ),
                );
              },
            );
          }
          const hash = createHash("sha256")
            .update(bytes)
            .update("static-webp-v1-quality85")
            .digest("hex")
            .slice(0, 20);
          const sizes = [
            ...new Set([
              ...widths.filter((size) => size < width),
              Math.min(width, widths[widths.length - 1]),
            ]),
          ];
          metadata.variants = yield* Effect.forEach(
            sizes,
            (size) =>
              Effect.gen(function* () {
                const name = `${hash}-${size}.webp`;
                const target = join(output, name);
                generated.add(name);
                if (!(yield* exists(target))) {
                  const buffer = yield* operation(
                    `resize image: ${source} (${size}px)`,
                    () =>
                      sharp(bytes)
                        .rotate()
                        .resize({ width: size, withoutEnlargement: true })
                        .webp({ quality: 85, effort: 4 })
                        .toBuffer(),
                  );
                  yield* writeBytes(target, buffer);
                }
                return { width: size, src: `/${outputName}/${name}` };
              }),
            { concurrency: 2 },
          );
          return [source, metadata] as const;
        }),
      { concurrency: 2 },
    );
    const manifest = Object.fromEntries(entries);
    yield* writeText(
      fileURLToPath(metadataFile),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    const stale = (yield* listFiles(output)).filter(
      (file) => !generated.has(relative(output, file)),
    );
    yield* Effect.forEach(stale, removeFile, { concurrency: 4 });
    return { images: entries.length, variants: generated.size };
  });
}

import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";

function operation<A>(name: string, work: () => PromiseLike<A>) {
  return Effect.tryPromise({
    try: async () => work(),
    catch: (cause) => new StaticImageError({ operation: name, cause }),
  }).pipe(Effect.uninterruptible);
}
const readBytes = (file: string) =>
  operation("read image", () => readFile(file));
const writeBytes = (file: string, bytes: Uint8Array) =>
  operation("write image", () => writeFile(file, bytes));
const writeText = (file: string, text: string) =>
  operation("write image metadata", () => writeFile(file, text));
const makeDirectory = (directory: string) =>
  operation("create image directory", () =>
    mkdir(directory, { recursive: true }),
  );
const exists = (file: string) =>
  Effect.tryPromise(() => access(file)).pipe(
    Effect.match({ onSuccess: () => true, onFailure: () => false }),
  );
const removeFile = (file: string) =>
  operation("remove stale image", () => rm(file));
const listFiles = (directory: string) =>
  operation("list images", async () =>
    (await readdir(directory, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name)),
  );
