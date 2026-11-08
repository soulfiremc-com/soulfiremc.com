import type { ImageProps } from "fumadocs-core/framework";
import { Image } from "@/components/image";

function dimension(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function ContentImage({
  src,
  alt = "",
  width,
  height,
  ...props
}: ImageProps) {
  const source =
    typeof src === "object" && "default" in src ? src.default : src;
  const url = typeof source === "object" ? source.src : source;
  if (!url) return null;
  return (
    <Image
      {...props}
      src={url}
      alt={alt}
      width={dimension(
        width ?? (typeof source === "object" ? source.width : undefined),
      )}
      height={dimension(
        height ?? (typeof source === "object" ? source.height : undefined),
      )}
    />
  );
}
