import type { ReactElement } from "react";
import { ImageResponse } from "takumi-js/response";
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

export function createOgImageResponse(element: ReactElement) {
  return new ImageResponse(element, {
    ...baseImageOptions,
    headers: imageHeaders,
  });
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
