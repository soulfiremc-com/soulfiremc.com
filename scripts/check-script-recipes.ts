import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { validateRecipe, type CatalogNode } from "./lib/script-recipes";
import { printLine } from "./lib/output";
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- public/docs/node-catalog.json is generated from the server and has this shape
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
printLine(
  `Validated ${files.length} paused, importable graphs against the node catalog.`,
);
