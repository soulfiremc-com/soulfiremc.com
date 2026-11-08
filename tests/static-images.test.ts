import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { Effect } from "effect";
import sharp from "sharp";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateStaticImages } from "../scripts/lib/static-images";
import {
  createStaticImageTransformer,
  getStaticImage,
  getStaticImageWidths,
  type StaticImageManifest,
} from "../src/lib/static-images";
import { Image } from "../src/components/image";
import imageMetadata from "../src/lib/image-metadata.json" with { type: "json" };

void test("generate static variants, reserve oriented dimensions, and preserve special images", async () => {
  const directory = await mkdtemp(join(tmpdir(), "static-images-"));
  const publicDirectory = join(directory, "public");
  const metadataFile = join(directory, "images.json");
  try {
    await mkdir(publicDirectory);
    const opaque = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#286db8" },
    })
      .png()
      .toBuffer();
    const transparent = await sharp({
      create: {
        width: 64,
        height: 32,
        channels: 4,
        background: { r: 20, g: 60, b: 90, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const rotated = await sharp(opaque)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const frames = Buffer.concat([
      Buffer.alloc(8 * 8 * 3, 0),
      Buffer.alloc(8 * 8 * 3, 255),
    ]);
    const animated = await sharp(frames, {
      raw: { width: 8, height: 16, channels: 3, pageHeight: 8 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    assert.equal((await sharp(animated).metadata()).pages, 2);
    await Promise.all([
      writeFile(join(publicDirectory, "photo sample.png"), opaque),
      writeFile(join(publicDirectory, "transparent.png"), transparent),
      writeFile(join(publicDirectory, "rotated.jpg"), rotated),
      writeFile(join(publicDirectory, "skin.png"), opaque),
      writeFile(join(publicDirectory, "animated.webp"), animated),
      writeFile(
        join(publicDirectory, "vector.svg"),
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"/>',
      ),
    ]);
    const run = () =>
      Effect.runPromise(
        generateStaticImages({
          publicDirectory: pathToFileURL(`${publicDirectory}/`),
          metadataFile: pathToFileURL(metadataFile),
          preserveSources: ["/skin.png"],
        }),
      );
    await run();
    const manifest: StaticImageManifest = JSON.parse(
      await readFile(metadataFile, "utf8"),
    );
    const photo = manifest["/photo sample.png"];
    assert.match(photo.background ?? "", /^data:image\/bmp;base64,/);
    assert.equal(manifest["/transparent.png"].background, undefined);
    const alphaVariant = manifest["/transparent.png"].variants?.[0];
    assert.ok(alphaVariant);
    assert.equal(
      (await sharp(join(publicDirectory, alphaVariant.src)).stats()).isOpaque,
      false,
    );
    assert.deepEqual(
      [manifest["/rotated.jpg"].width, manifest["/rotated.jpg"].height],
      [80, 120],
    );
    for (const src of ["/vector.svg", "/animated.webp", "/skin.png"]) {
      assert.equal(manifest[src].variants, undefined, src);
      assert.equal(manifest[src].background, undefined, src);
    }
    for (const metadata of Object.values(manifest)) {
      for (const variant of metadata.variants ?? []) {
        const actual = await sharp(
          join(publicDirectory, variant.src),
        ).metadata();
        assert.equal(actual.width, variant.width);
        assert.ok(variant.width <= metadata.width);
        assert.ok(
          Math.abs(
            (actual.height ?? 0) / variant.width -
              metadata.height / metadata.width,
          ) <=
            1 / variant.width,
        );
      }
    }
    const transform = createStaticImageTransformer(manifest);
    const selectedWidths = getStaticImageWidths(photo, [32, 48, 64, 2000]);
    assert.deepEqual(selectedWidths, [48, 96, 120]);
    for (const width of selectedWidths) {
      const actual = await sharp(
        join(publicDirectory, transform("/photo sample.png", { width })),
      ).metadata();
      assert.equal(actual.width, width);
    }
    const firstManifest = await readFile(metadataFile, "utf8");
    await writeFile(join(publicDirectory, "_images", "obsolete.webp"), opaque);
    await run();
    assert.equal(await readFile(metadataFile, "utf8"), firstManifest);
    assert.ok(
      !(await readdir(join(publicDirectory, "_images"))).includes(
        "obsolete.webp",
      ),
    );
    await writeFile(join(publicDirectory, "photo sample.png"), transparent);
    await run();
    const changed: StaticImageManifest = JSON.parse(
      await readFile(metadataFile, "utf8"),
    );
    assert.notEqual(
      changed["/photo sample.png"].variants?.[0].src,
      photo.variants?.[0].src,
    );
    assert.ok(
      !(await readdir(join(publicDirectory, "_images"))).includes(
        photo.variants![0].src.split("/").pop()!,
      ),
    );
    for (const src of [
      "https://example.com/photo.png",
      "//example.com/photo.png",
      "blob:local-photo",
      "/missing.png",
      "/photo sample.png?version=1",
    ]) {
      assert.equal(getStaticImage(manifest, src), undefined);
      assert.equal(transform(src, { width: 48 }), src);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

void test("render static placeholders and responsive URLs while preserving remote and opt-out sources", () => {
  const images: StaticImageManifest = imageMetadata;
  const entry = Object.entries(images).find(
    ([, image]) => image.background && image.variants?.length,
  );
  assert.ok(entry, "an opaque static asset has generated metadata");
  const [src, image] = entry;
  const html = renderToStaticMarkup(
    createElement(Image, { src, alt: "Static sample", width: 96 }),
  );
  assert.match(html, /srcSet="\/_images\//);
  assert.match(html, /background-image:url\(/);
  assert.match(html, /aspect-ratio:/);
  assert.ok(!html.includes("/cdn-cgi/image/"));
  for (const [source, extra] of [
    [src, { unoptimized: true }],
    [src, { className: "[image-rendering:pixelated]" }],
    ["https://example.com/avatar.png", {}],
  ] as const) {
    const markup = renderToStaticMarkup(
      createElement(Image, {
        src: source,
        alt: "Original",
        width: 48,
        height: 48,
        ...extra,
      }),
    );
    assert.ok(markup.includes(`src="${source}"`));
    assert.ok(!markup.includes("srcSet="));
    assert.ok(!markup.includes("background-image:"));
  }
  assert.ok(image.width > 0);
});
