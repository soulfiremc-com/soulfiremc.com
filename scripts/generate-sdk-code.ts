import { readFile, writeFile } from "node:fs/promises";
import { createHighlighter } from "shiki";
import { sdkCodeExamples } from "../src/lib/sdk-code-examples";

const outputUrl = new URL(
  "../src/components/sdk-code-html.generated.json",
  import.meta.url,
);
const highlighter = await createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: ["typescript", "python"],
});

const html = Object.fromEntries(
  Object.entries(sdkCodeExamples).map(([language, code]) => [
    language,
    highlighter.codeToHtml(code, {
      lang: language,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    }),
  ]),
);
const output = `${JSON.stringify(html, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputUrl, "utf8").catch(() => "");
  if (current !== output) {
    throw new Error(
      "SDK code highlights are out of date. Run bun generate-sdk-code.",
    );
  }
} else {
  await writeFile(outputUrl, output);
}
