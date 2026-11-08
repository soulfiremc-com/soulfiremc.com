export type StaticImageMetadata = {
  width: number;
  height: number;
  background?: string;
  variants?: { width: number; src: string }[];
};

export type StaticImageManifest = Record<string, StaticImageMetadata>;

function selectVariant(
  variants: NonNullable<StaticImageMetadata["variants"]>,
  width: number,
) {
  return (
    variants.find((variant) => variant.width >= width) ??
    variants[variants.length - 1]
  );
}

export function getStaticImageWidths(
  image: StaticImageMetadata,
  requested?: number[],
) {
  const variants = image.variants;
  if (!variants?.length) return [];
  return [
    ...new Set(
      (requested ?? variants.map((variant) => variant.width)).map(
        (width) => selectVariant(variants, width).width,
      ),
    ),
  ];
}

export function getStaticImage(manifest: StaticImageManifest, src: string) {
  if (
    !src.startsWith("/") ||
    src.startsWith("//") ||
    !Object.hasOwn(manifest, src)
  ) {
    return undefined;
  }
  return manifest[src];
}

export function createStaticImageTransformer(manifest: StaticImageManifest) {
  return (src: string | URL, operations: { width?: number }) => {
    const source = src.toString();
    const image = getStaticImage(manifest, source);
    if (!image?.variants?.length) return source;
    const width = operations.width ?? image.width;
    return selectVariant(image.variants, width).src;
  };
}
