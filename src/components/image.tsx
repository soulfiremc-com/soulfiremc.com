import {
  Image as UnpicImage,
  type ImageProps as UnpicImageProps,
} from "@unpic/react";
import { Image as BaseImage } from "@unpic/react/base";
import { cn } from "cn";
import type { Ref } from "react";
import { getProviderForUrl } from "unpic";
import imageMetadata from "@/lib/image-metadata.json" with { type: "json" };

type ImageMetadata = { width: number; height: number; background?: string };
const metadata: Record<string, ImageMetadata> = imageMetadata;

type ImageProps = Omit<
  UnpicImageProps,
  "layout" | "width" | "height" | "aspectRatio"
> & {
  width?: number;
  height?: number;
  fill?: boolean;
  ref?: Ref<HTMLImageElement>;
};

function originalSource(src: string | URL) {
  return src.toString();
}

export function Image({
  src,
  width,
  height,
  fill = false,
  objectFit = "contain",
  background,
  className,
  cdn,
  fallback,
  operations,
  options,
  ...props
}: ImageProps) {
  const image = metadata[src];
  const aspectRatio = image ? image.width / image.height : undefined;
  const resolvedWidth =
    width ??
    (height && aspectRatio ? Math.round(height * aspectRatio) : image?.width);
  const resolvedHeight =
    height ??
    (width && aspectRatio ? Math.round(width / aspectRatio) : image?.height);
  const dimensions =
    !fill && resolvedWidth && resolvedHeight
      ? {
          layout: "constrained" as const,
          width: resolvedWidth,
          height: resolvedHeight,
        }
      : { layout: "fullWidth" as const };

  const imageProps = {
    ...props,
    ...dimensions,
    src,
    objectFit,
    background: background ?? image?.background,
    className: cn(
      "bg-origin-content bg-clip-content",
      objectFit === "contain" && "bg-contain! bg-center",
      fill && "h-full!",
      className,
    ),
  };
  const provider = cdn ?? getProviderForUrl(src) ?? fallback;

  return provider ? (
    <UnpicImage
      {...imageProps}
      cdn={provider}
      operations={operations}
      options={options}
    />
  ) : (
    // Local and unsupported sources have no resize service or responsive variants.
    <BaseImage {...imageProps} transformer={originalSource} breakpoints={[]} />
  );
}
