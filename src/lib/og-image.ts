import { extractResourceUrls, fetchResources } from "@takumi-rs/helpers";
import { extractEmojis } from "@takumi-rs/helpers/emoji";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import init, { Renderer } from "@takumi-rs/wasm";
import takumiWasmModule from "@takumi-rs/wasm/auto";
import type { ReactElement } from "react";
import logoSvgUrl from "@/assets/logo-square.svg?inline";

const baseImageOptions = {
  format: "webp" as const,
  height: 630,
  width: 1200,
};

const imageHeaders = {
  "Cache-Control": "public, immutable, max-age=31536000",
  "Content-Type": "image/webp",
};

let rendererPromise: Promise<Renderer> | undefined;

function getRenderer() {
  rendererPromise ??= init({ module_or_path: takumiWasmModule }).then(
    () => new Renderer(),
  );
  return rendererPromise;
}

export async function createOgImageResponse(element: ReactElement) {
  const renderer = await getRenderer();
  const { node: originalNode, stylesheets } = await fromJsx(element);
  const node = extractEmojis(originalNode, "twemoji");
  const fetchedResources = await fetchResources(extractResourceUrls(node));

  const image = renderer.render(node, {
    ...baseImageOptions,
    fetchedResources,
    stylesheets,
  });

  const body = new Uint8Array(image).buffer as ArrayBuffer;
  return new Response(body, { headers: imageHeaders });
}

export const soulfireLogoDataUri = logoSvgUrl;

const embeddedLogos = import.meta.glob<string>(
  "/src/assets/{accounts,providers}/*.{png,svg,gif,jpg,jpeg,webp}",
  { query: "?inline", import: "default", eager: true },
);

const logosByPublicPath = new Map<string, string>(
  Object.entries(embeddedLogos).map(([modulePath, dataUri]) => {
    const publicPath = modulePath.replace(/^.*\/src\/assets/, "");
    return [publicPath, dataUri];
  }),
);

export function getEmbeddedLogo(publicPath?: string) {
  if (!publicPath) return undefined;
  return logosByPublicPath.get(publicPath);
}
