import { Callout } from "fumadocs-ui/components/callout";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, FC } from "react";
import { DonutCalculator } from "@/components/mdx/donut-calculator";
import { MdxImage } from "@/components/mdx/mdx-image";
import { Mermaid } from "@/components/mdx/mermaid";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Step,
    Steps,
    ...TabsComponents,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Callout renders a blockquote replacement and accepts its props
    blockquote: Callout as unknown as FC<ComponentProps<"blockquote">>,
    img: MdxImage,
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
