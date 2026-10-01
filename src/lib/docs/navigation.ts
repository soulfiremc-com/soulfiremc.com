import type { LoaderPlugin } from "fumadocs-core/source";

/** Keep navigation labels brief without shortening a page's descriptive title. */
export function docsNavigationPlugin(): LoaderPlugin {
  return {
    name: "soulfire:docs-navigation",
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (
          file?.format === "page" &&
          "sidebarTitle" in file.data &&
          typeof file.data.sidebarTitle === "string"
        ) {
          node.name = file.data.sidebarTitle;
        }
        return node;
      },
    },
  };
}
