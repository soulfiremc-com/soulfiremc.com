import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import * as FilesComponents from "fumadocs-ui/components/files";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Step, Steps } from "fumadocs-ui/components/steps";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, FC } from "react";
import { Image } from "@/components/image";
import { DonutCalculator } from "@/components/mdx/donut-calculator";
import { Mermaid } from "@/components/mdx/mermaid";

function MdxImage({
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

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Step,
    Steps,
    ...TabsComponents,
    ...FilesComponents,
    blockquote: Callout as unknown as FC<ComponentProps<"blockquote">>,
    img: MdxImage,
    Image,
    // HTML `ref` attribute conflicts with `forwardRef`
    pre: ({ ref: _ref, ...props }) => (
      <CodeBlock {...props}>
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    Mermaid,
    DonutCalculator,
    ...components,
  };
}
