import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { validateRecipe, type CatalogNode } from "./lib/script-recipes";
const catalog = JSON.parse(
  readFileSync(resolve("public/docs/node-catalog.json"), "utf8"),
) as { nodes: CatalogNode[] };
const directory = resolve("public/docs/scripts");
const files = readdirSync(directory).filter((file) =>
  file.endsWith(".soulfire-script.json"),
);
if (!files.length) throw new Error("No downloadable script recipes found");
for (const file of files)
  validateRecipe(
    JSON.parse(readFileSync(join(directory, file), "utf8")),
    catalog.nodes,
  );
console.log(
  `Validated ${files.length} paused, importable graphs against the node catalog.`,
);
