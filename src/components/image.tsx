import { Image as UnpicImage } from "@unpic/react/base";
import { cn } from "cn";
import type { ComponentProps } from "react";
import {
  createStaticImageTransformer,
  getStaticImage,
  getStaticImageWidths,
  type StaticImageManifest,
} from "@/lib/static-images";
import imageMetadata from "@/lib/image-metadata.json" with { type: "json" };

const images: StaticImageManifest = imageMetadata;
const transform = createStaticImageTransformer(images);

export type ImageProps = Omit<
  ComponentProps<"img">,
  "src" | "srcSet" | "width" | "height" | "style"
> & {
  src: string;
  width?: number;
  height?: number;
  fill?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  breakpoints?: number[];
  layout?: "fixed" | "constrained" | "fullWidth";
  unoptimized?: boolean;
  priority?: boolean;
  background?: string;
};

export function Image({
  src,
  width,
  height,
  fill = false,
  objectFit = "contain",
  breakpoints,
  layout,
  unoptimized = false,
  priority,
  background,
  className,
  ...props
}: ImageProps) {
  const metadata = getStaticImage(images, src);
  const aspectRatio = metadata ? metadata.width / metadata.height : undefined;
  const resolvedWidth =
    width ??
    (height && aspectRatio
      ? Math.round(height * aspectRatio)
      : metadata?.width);
  const resolvedHeight =
    height ??
    (width && aspectRatio ? Math.round(width / aspectRatio) : metadata?.height);
  const classes = cn(
    "bg-origin-content bg-clip-content",
    {
      contain: "object-contain",
      cover: "object-cover",
      fill: "object-fill",
      none: "object-none",
      "scale-down": "object-scale-down",
    }[objectFit],
    objectFit === "contain" && "bg-contain! bg-center",
    fill && "h-full! w-full!",
    className,
  );
  const pixelated = className?.includes("image-rendering:pixelated");
  const variants = !unoptimized && !pixelated ? metadata?.variants : undefined;
  const placeholder =
    background ?? (variants?.length ? metadata?.background : undefined);

  if (!metadata || !variants?.length) {
    return (
      <img
        {...props}
        src={src}
        width={resolvedWidth}
        height={resolvedHeight}
        loading={priority ? "eager" : (props.loading ?? "lazy")}
        fetchPriority={priority ? "high" : props.fetchPriority}
        className={classes}
      />
    );
  }

  return (
    <UnpicImage
      {...props}
      src={src}
      {...(layout === "fullWidth" || fill || !resolvedWidth || !resolvedHeight
        ? { layout: "fullWidth" as const, aspectRatio }
        : {
            layout: layout ?? "constrained",
            width: resolvedWidth,
            height: resolvedHeight,
          })}
      priority={priority}
      objectFit={objectFit}
      background={placeholder}
      breakpoints={getStaticImageWidths(metadata, breakpoints)}
      transformer={transform}
      className={classes}
    />
  );
}
