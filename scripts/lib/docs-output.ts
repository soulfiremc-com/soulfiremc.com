import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function docsOutput(path: string, content: string) {
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content) {
      throw new Error(
        `Generated documentation is stale: ${path}. Run its generator and commit the result.`,
      );
    }
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
