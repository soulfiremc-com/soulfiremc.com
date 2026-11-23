import { remark } from "remark";
import remarkMdx from "remark-mdx";

type AstNode = {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: AstNode[];
};

type DocTestBlock = { lang?: string; meta: string; value: string };

/** Returns the code blocks marked `doc-test` in MDX source, in page order. */
export function docTestBlocks(mdx: string) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- remark returns an mdast Root, which is the AstNode shape this walker reads
  const tree = remark().use(remarkMdx).parse(mdx) as AstNode;
  const blocks: DocTestBlock[] = [];
  const visit = (node: AstNode) => {
    if (node.type === "code" && node.meta?.split(/\s+/u).includes("doc-test"))
      blocks.push({
        lang: node.lang,
        meta: node.meta,
        value: node.value ?? "",
      });
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return blocks;
}
