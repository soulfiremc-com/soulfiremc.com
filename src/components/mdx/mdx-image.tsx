import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import type { ComponentProps } from "react";
import { Image } from "@/components/image";

export function MdxImage({
  src,
  width,
  height,
  zoomInProps,
  rmiz,
  ...props
}: ComponentProps<typeof ImageZoom>) {
  const source =
    typeof src === "object" && "default" in src ? src.default : src;
  const url = typeof source === "object" ? source.src : source;
  if (!url) return null;

  return (
    <ImageZoom src={url} zoomInProps={zoomInProps} rmiz={rmiz} {...props}>
      <Image
        {...props}
        src={url}
        width={
          width
            ? Number(width)
            : typeof source === "object"
              ? source.width
              : undefined
        }
        height={
          height
            ? Number(height)
            : typeof source === "object"
              ? source.height
              : undefined
        }
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
      />
    </ImageZoom>
  );
}
