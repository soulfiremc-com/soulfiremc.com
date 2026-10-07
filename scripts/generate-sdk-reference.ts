import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { buildSdk, sdkSource, sdkRepository, sdkRevision } from "./sdk-source";
import { docsOutput } from "./lib/docs-output";
import { extractTypescriptApi } from "./lib/extract-sdk-typescript-api";
import { renderSdkApi } from "./lib/render-sdk-api";
import type { ApiReference } from "./lib/sdk-api";

const directory = sdkSource();
const output = resolve("content/docs/(main)/(automation)/sdk/(reference)/api");
buildSdk(directory);
const typescript = extractTypescriptApi(directory);
const python = JSON.parse(
  execFileSync("python3.14", ["scripts/extract-sdk-python-api.py", directory], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }),
) as ApiReference;
const tsResult = renderSdkApi(typescript, output, sdkRepository, sdkRevision);
const pyResult = renderSdkApi(python, output, sdkRepository, sdkRevision);
const types = typescript.symbols
  .filter(
    (symbol) =>
      symbol.imports.includes("@soulfiremc/sdk") &&
      ["interface", "type", "enum"].includes(symbol.kind),
  )
  .sort((a, b) => a.name.localeCompare(b.name, "en"));
docsOutput(
  resolve(output, "types.mdx"),
  `---\ntitle: TypeScript types\ndescription: Public TypeScript options, interfaces, aliases, and enums.\nicon: Braces\n---\n\nThe [TypeScript reference](/docs/sdk/api/typescript) documents all package entry points. Each type page includes its declaration, fields, and links to related types.\n\n${types.map((symbol) => `## ${symbol.name}\n\n[${symbol.name}](${tsResult.destinations.get(symbol.id)}) is a ${symbol.kind} in \`${symbol.module}\`.\n`).join("\n")}`.trimEnd() +
    "\n",
);
docsOutput(
  resolve(output, "meta.json"),
  `${JSON.stringify({ title: "SDK API", icon: "BookOpen", defaultOpen: false, pages: ["ts", "py", "types"] }, null, 2)}\n`,
);
console.log(
  `Generated ${tsResult.pages} TypeScript pages (${tsResult.symbols} declarations) and ${pyResult.pages} Python pages (${pyResult.symbols} declarations).`,
);
