import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sdkSource } from "./sdk-source";
import { docTestBlocks } from "./lib/doc-tests";
import { printLine } from "./lib/output";

const checkout = sdkSource();
const directory = mkdtempSync(join(tmpdir(), "soulfire-plugin-docs-"));
const classpath = join(directory, "classpath.txt");
const init = join(directory, "docs.gradle");
writeFileSync(
  init,
  `allprojects { project ->
  if (project.path == ':mod') {
    project.tasks.register('docsCompileClasspath') {
      doLast {
        def main = project.extensions.getByType(org.gradle.api.tasks.SourceSetContainer).getByName('main')
        new File(${JSON.stringify(classpath)}).text = main.compileClasspath.asPath + File.pathSeparator + main.output.asPath
      }
    }
  }
}\n`,
);
try {
  execFileSync(
    join(checkout, "gradlew"),
    [
      ":mod:compileJava",
      ":mod:docsCompileClasspath",
      "--init-script",
      init,
      "--no-configuration-cache",
      "--console=plain",
    ],
    { cwd: checkout, stdio: "inherit" },
  );
  const files: string[] = [];
  for (const page of ["first-plugin", "bot-control-and-direct-access"]) {
    const path = `content/docs/(main)/development/${page}.mdx`;
    for (const block of docTestBlocks(readFileSync(path, "utf8"))) {
      const filename = /title="([\w]+\.java)"/u.exec(block.meta)?.[1];
      if (block.lang !== "java" || !filename)
        throw new Error(`Invalid native doc-test in ${path}`);
      let code = block.value;
      if (block.meta.includes('context="bot"')) {
        const imports = [...code.matchAll(/^import .*;$/gmu)].map(
          (match) => match[0],
        );
        const body = code.replaceAll(/^import .*;\n?/gmu, "");
        code = `${imports.join("\n")}\nclass ${filename.slice(0, -5)} {\n  static void run(com.soulfiremc.server.bot.BotConnection connection) {\n${body}\n  }\n}\n`;
      }
      const target = join(directory, filename);
      writeFileSync(target, code);
      files.push(target);
    }
  }
  if (files.length < 4)
    throw new Error("Missing native documentation examples");
  execFileSync(
    "javac",
    [
      "--release",
      "25",
      "-proc:none",
      "-classpath",
      readFileSync(classpath, "utf8"),
      "-d",
      join(directory, "classes"),
      ...files,
    ],
    { stdio: "inherit" },
  );
  printLine(
    `Compiled ${files.length} Java documentation examples against the pinned backend.`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
