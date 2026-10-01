import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { sdkSource } from "./sdk-source";

type AstNode = {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: AstNode[];
};
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
    const tree = remark()
      .use(remarkMdx)
      .parse(readFileSync(path, "utf8")) as AstNode;
    function visit(node: AstNode) {
      if (
        node.type === "code" &&
        node.meta?.split(/\s+/u).includes("doc-test")
      ) {
        const filename = /title="([\w]+\.java)"/u.exec(node.meta)?.[1];
        if (node.lang !== "java" || !filename)
          throw new Error(`Invalid native doc-test in ${path}`);
        let code = node.value ?? "";
        if (node.meta.includes('context="bot"')) {
          const imports = [...code.matchAll(/^import .*;$/gmu)].map(
            (match) => match[0],
          );
          const body = code.replace(/^import .*;\n?/gmu, "");
          code = `${imports.join("\n")}\nclass ${filename.slice(0, -5)} {\n  static void run(com.soulfiremc.server.bot.BotConnection connection) {\n${body}\n  }\n}\n`;
        }
        const target = join(directory, filename);
        writeFileSync(target, code);
        files.push(target);
      }
      node.children?.forEach(visit);
    }
    visit(tree);
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
  console.log(
    `Compiled ${files.length} Java documentation examples against the pinned backend.`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
