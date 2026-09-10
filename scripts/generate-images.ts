import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { blurhashToDataUri } from "@unpic/placeholder";
import { encode } from "blurhash";
import sharp from "sharp";

const publicDirectory = new URL("../public/", import.meta.url);
const files = await readdir(publicDirectory, { recursive: true });
const images: Record<
  string,
  { width: number; height: number; background?: string }
> = {};

for (const file of files.sort()) {
  if (!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file)) continue;

  const image = sharp(fileURLToPath(new URL(file, publicDirectory)));
  const metadata = await image.metadata();
  const { width, height } = metadata;
  if (!width || !height) throw new Error(`Missing image dimensions: ${file}`);

  let background: string | undefined;
  // Backgrounds remain visible after loading, so preserve transparency and animation.
  if (
    metadata.format !== "svg" &&
    (metadata.pages ?? 1) === 1 &&
    (await image.stats()).isOpaque
  ) {
    const { data, info } = await image
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    background = blurhashToDataUri(
      encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3),
    );
  }

  images[`/${file}`] = { width, height, ...(background ? { background } : {}) };
}

await writeFile(
  new URL("../src/lib/image-metadata.json", import.meta.url),
  `${JSON.stringify(images, null, 2)}\n`,
);
