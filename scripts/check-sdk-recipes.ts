import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSdk, sdkSource } from "./sdk-source";

const recipes = [
  "reply-to-chat",
  "collect-blocks",
  "follow-entity",
  "transfer-items",
];
const source = sdkSource();
buildSdk(source);
const directory = mkdtempSync(join(source, "sdk/typescript/.docs-recipes-"));
const typescriptFiles: string[] = [];
const pythonFiles: string[] = [];

try {
  for (const recipe of recipes) {
    const path = resolve(`content/docs/(main)/sdk/recipes/${recipe}.mdx`);
    const source = readFileSync(path, "utf8");
    const blocks = [
      ...source.matchAll(
        /^    ```(ts|python) title="([^"]+)"[^\n]*\n([\s\S]*?)^    ```/gmu,
      ),
    ];
    if (blocks.length !== 2)
      throw new Error(`Expected TypeScript and Python examples in ${path}`);

    for (const [, language, filename, indentedCode] of blocks) {
      const code = indentedCode.replace(/^    /gmu, "");
      const output = join(directory, filename);
      writeFileSync(output, code);
      if (language === "ts") typescriptFiles.push(output);
      else pythonFiles.push(output);
    }
  }

  execFileSync(
    "bunx",
    [
      "tsc",
      "--noEmit",
      "--target",
      "esnext",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
      "--strict",
      "--types",
      "node",
      ...typescriptFiles,
    ],
    { stdio: "inherit" },
  );
  execFileSync("python3.14", ["-m", "py_compile", ...pythonFiles], {
    stdio: "inherit",
  });
  console.log(
    `Checked ${typescriptFiles.length} TypeScript and ${pythonFiles.length} Python recipes.`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
