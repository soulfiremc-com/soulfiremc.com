import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { buildSdk, sdkSource, sdkRevision } from "./sdk-source";
import { sdkCodeExamples } from "../src/lib/sdk-code-examples";

type AstNode = {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: AstNode[];
};
const source = sdkSource();
buildSdk(source);
execFileSync("bun", ["run", "build"], {
  cwd: join(source, "sdk/beat-game"),
  stdio: "inherit",
});
const directory = mkdtempSync(join(source, "sdk/typescript/.docs-recipes-"));
const typescriptFiles: string[] = [];
const pythonFiles: string[] = [];
const documents = readdirSync(resolve("content/docs/(main)/(automation)/sdk"), {
  recursive: true,
}).filter(
  (file): file is string => typeof file === "string" && file.endsWith(".mdx"),
);

try {
  const homepageTypescript = join(directory, "homepage.ts");
  const homepagePython = join(directory, "homepage.py");
  writeFileSync(homepageTypescript, sdkCodeExamples.typescript);
  writeFileSync(homepagePython, sdkCodeExamples.python);
  typescriptFiles.push(homepageTypescript);
  pythonFiles.push(homepagePython);
  for (const document of documents) {
    const path = resolve("content/docs/(main)/(automation)/sdk", document);
    const tree = remark()
      .use(remarkMdx)
      .parse(readFileSync(path, "utf8")) as AstNode;
    const blocks: AstNode[] = [];
    function visit(node: AstNode) {
      if (node.type === "code" && node.meta?.split(/\s+/u).includes("doc-test"))
        blocks.push(node);
      node.children?.forEach(visit);
    }
    visit(tree);
    if (
      document.startsWith("recipes/") &&
      document !== "recipes/index.mdx" &&
      blocks.length !== 2
    )
      throw new Error(
        `Recipe must contain two complete doc-test programs: ${path}`,
      );
    for (const block of blocks) {
      const filename = /title="([^"]+)"/u.exec(block.meta ?? "")?.[1];
      if (
        !filename ||
        !["ts", "python"].includes(block.lang ?? "") ||
        !/^[\w.-]+\.(ts|py)$/u.test(filename)
      )
        throw new Error(`Invalid doc-test block: ${path}`);
      const output = join(
        directory,
        `${typescriptFiles.length + pythonFiles.length}-${filename}`,
      );
      writeFileSync(output, block.value ?? "");
      if (block.lang === "ts") typescriptFiles.push(output);
      else pythonFiles.push(output);
    }
  }
  if (!typescriptFiles.length || !pythonFiles.length)
    throw new Error("No SDK examples found");
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
  const environment = join(tmpdir(), `soulfire-docs-python-${sdkRevision}`);
  const python =
    process.env.SOULFIRE_DOCS_PYTHON ?? join(environment, "bin/python");
  if (!process.env.SOULFIRE_DOCS_PYTHON && !existsSync(python))
    execFileSync("python3.14", ["-m", "venv", environment], {
      stdio: "inherit",
    });
  execFileSync(
    python,
    [
      "-m",
      "pip",
      "install",
      "--quiet",
      "-e",
      join(source, "sdk/python"),
      "pyright==1.1.411",
    ],
    { stdio: "inherit" },
  );
  const config = join(directory, "pyrightconfig.json");
  writeFileSync(
    config,
    JSON.stringify({
      include: pythonFiles.map((file) => basename(file)),
      pythonVersion: "3.14",
      typeCheckingMode: "strict",
    }),
  );
  execFileSync(
    python,
    ["-m", "pyright", "--pythonpath", python, "--project", config],
    { stdio: "inherit" },
  );
  execFileSync(python, ["-m", "py_compile", ...pythonFiles], {
    stdio: "inherit",
  });
  console.log(
    `Typechecked ${typescriptFiles.length} TypeScript and ${pythonFiles.length} Python programs from ${documents.length} SDK pages and the homepage.`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
