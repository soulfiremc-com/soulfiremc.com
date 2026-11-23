import latinExtendedFont from "@fontsource-variable/geist/files/geist-latin-ext-wght-normal.woff2?inline";
import cyrillicFont from "@fontsource-variable/geist/files/geist-cyrillic-wght-normal.woff2?inline";
import type { ReactElement } from "react";
import { ImageResponse } from "takumi-js/response";
import logoSvgUrl from "@/assets/logo-square.svg?inline";

function dataUriBytes(dataUri: string) {
  return Uint8Array.from(
    atob(dataUri.slice(dataUri.indexOf(",") + 1)),
    (character) => character.codePointAt(0) ?? 0,
  );
}

const cyrillic = dataUriBytes(cyrillicFont);
const latinExtended = dataUriBytes(latinExtendedFont);

const baseImageOptions = {
  format: "webp" as const,
  height: 630,
  width: 1200,
};

const imageHeaders = {
  // OG URLs carry no version, and images show prices and titles that change.
  // Cache for a day and refresh in the background instead of pinning a year.
  "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  "Content-Type": "image/webp",
};

export function createOgImageResponse(element: ReactElement) {
  return new ImageResponse(element, {
    ...baseImageOptions,
    fonts: [
      { name: "Geist Cyrillic", data: cyrillic },
      { name: "Geist Latin Extended", data: latinExtended },
    ],
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
    const publicPath = modulePath.replace(/^.*\/src\/assets/u, "");
    return [publicPath, dataUri];
  }),
);

export function getEmbeddedLogo(publicPath?: string) {
  if (!publicPath) return undefined;
  return logosByPublicPath.get(publicPath);
}
