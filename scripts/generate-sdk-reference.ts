import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import ts from "typescript";
import { buildSdk, sdkSource, sdkRepository, sdkRevision } from "./sdk-source";
import { docsOutput } from "./lib/docs-output";

const directory = sdkSource();
const output = resolve("content/docs/(main)/(automation)/sdk/(reference)/api");
buildSdk(directory);
const entry = join(directory, "sdk/typescript/src/index.ts");
const managedEntry = join(directory, "sdk/typescript/src/bun.ts");
const program = ts.createProgram([entry, managedEntry], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(entry)!);
if (!moduleSymbol) throw new Error("Missing SDK entry module");
const exports = checker
  .getExportsOfModule(moduleSymbol)
  .map((symbol) =>
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol,
  );
const exportedNames = new Set(exports.map((symbol) => symbol.name));
const intro = `Generated from the [pinned SDK source](${sdkRepository}/tree/${sdkRevision}). Use the [matching installation](/docs/sdk/compatibility). Each source link points to this baseline.\n\n`;
const slug = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
const prose = (value: string) =>
  value
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/\{/gu, "\\{")
    .replace(/\}/gu, "\\}");
const sourceLink = (file: ts.SourceFile, line: number) =>
  `${sdkRepository}/blob/${sdkRevision}/${relative(directory, file.fileName)}#L${line}`;
type Member = {
  name: string;
  signature: string;
  description: string;
  source: string;
};
type ClassPage = { name: string; members: Member[]; introduction?: string };
const classes: ClassPage[] = [];
for (const file of program.getSourceFiles()) {
  if (
    !file.fileName.startsWith(join(directory, "sdk/typescript/src")) ||
    file.fileName.includes("/generated/")
  )
    continue;
  for (const declaration of file.statements) {
    if (
      !ts.isClassDeclaration(declaration) ||
      !declaration.name ||
      !exportedNames.has(declaration.name.text)
    )
      continue;
    const members = declaration.members.flatMap((member): Member[] => {
      if (
        !ts.isMethodDeclaration(member) &&
        !ts.isPropertyDeclaration(member) &&
        !ts.isGetAccessorDeclaration(member)
      )
        return [];
      const name = member.name.getText(file);
      if (
        name.startsWith("#") ||
        member.modifiers?.some(
          (modifier) =>
            modifier.kind === ts.SyntaxKind.PrivateKeyword ||
            modifier.kind === ts.SyntaxKind.ProtectedKeyword,
        )
      )
        return [];
      const symbol = checker.getSymbolAtLocation(member.name);
      const description = symbol
        ? ts.displayPartsToString(symbol.getDocumentationComment(checker))
        : "";
      let signature: string;
      if (ts.isPropertyDeclaration(member)) {
        signature = `${member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ? "static " : ""}${member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ? "readonly " : ""}${name}${member.questionToken ? "?" : ""}: ${checker.typeToString(checker.getTypeAtLocation(member), undefined, ts.TypeFormatFlags.NoTruncation)}`;
      } else {
        signature = file.text
          .slice(
            member.getStart(file),
            member.body?.getStart(file) ?? member.end,
          )
          .trim()
          .replace(/^public /u, "")
          .replace(/\n  /gu, "\n")
          .replace(/;$/u, "");
        if (!member.type) {
          const type = checker.getSignatureFromDeclaration(member);
          if (type)
            signature += `: ${checker.typeToString(checker.getReturnTypeOfSignature(type), undefined, ts.TypeFormatFlags.NoTruncation)}`;
        }
      }
      return [
        {
          name,
          signature,
          description,
          source: sourceLink(
            file,
            file.getLineAndCharacterOfPosition(member.getStart(file)).line + 1,
          ),
        },
      ];
    });
    if (members.length) classes.push({ name: declaration.name.text, members });
  }
}
const managedModule = checker.getSymbolAtLocation(
  program.getSourceFile(managedEntry)!,
);
const managedSoulFire =
  managedModule &&
  checker
    .getExportsOfModule(managedModule)
    .find((symbol) => symbol.name === "SoulFire");
if (!managedSoulFire?.valueDeclaration)
  throw new Error("Missing managed SoulFire entry point");
const facadeType = checker.getTypeOfSymbolAtLocation(
  managedSoulFire,
  managedSoulFire.valueDeclaration,
);
const facadeMembers = checker
  .getPropertiesOfType(facadeType)
  .map((property) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration)
      throw new Error(`Missing SoulFire declaration: ${property.name}`);
    const type = checker.getTypeOfSymbolAtLocation(property, declaration);
    const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    if (!signatures.length)
      throw new Error(`Missing SoulFire call signature: ${property.name}`);
    const file = declaration.getSourceFile();
    return {
      name: property.name,
      signature: signatures
        .map(
          (signature) =>
            `${property.name}${checker.signatureToString(signature, undefined, ts.TypeFormatFlags.NoTruncation)}`,
        )
        .join("\n"),
      description: ts.displayPartsToString(
        property.getDocumentationComment(checker),
      ),
      source: sourceLink(
        file,
        file.getLineAndCharacterOfPosition(declaration.getStart(file)).line + 1,
      ),
    };
  });
classes.push({
  name: "SoulFire",
  introduction:
    "Import this facade from `@soulfiremc/sdk/bun` or `@soulfiremc/sdk/node` for managed `createBot`, `install`, and `installLayer`. The universal and browser entry points connect to existing backends and do not expose these managed operations. Runtime entry points supply their HTTP layer; `connectWithHttpClient` and `layerWithHttpClient` require the application-provided `effect/http/HttpClient` service.\n\n",
  members: facadeMembers,
});
classes.sort((a, b) => a.name.localeCompare(b.name, "en"));
if (!classes.some((item) => item.name === "SoulFireBot"))
  throw new Error("Missing public SDK classes");
function writeClasses(language: "typescript" | "python", items: ClassPage[]) {
  const folder = language === "typescript" ? "ts" : "py";
  const pages = items.map((item) => slug(item.name));
  docsOutput(
    join(output, folder, "meta.json"),
    `${JSON.stringify({ title: language === "typescript" ? "TypeScript" : "Python", defaultOpen: false, pagesIndex: `../${language}`, pages }, null, 2)}\n`,
  );
  for (const item of items) {
    const content = item.members
      .map(
        (member) =>
          `## ${member.name}\n\n${member.description ? `${prose(member.description)}\n\n` : ""}\`\`\`${language === "typescript" ? "ts" : "python"}\n${member.signature}\n\`\`\`\n\n[Source](${member.source})`,
      )
      .join("\n\n");
    docsOutput(
      join(output, folder, `${slug(item.name)}.mdx`),
      `---\ntitle: ${item.name}\ndescription: Public ${language === "typescript" ? "TypeScript" : "Python"} members of ${item.name}.\nicon: Code\n---\n\n${intro}${item.introduction ?? ""}${language === "python" ? "Methods decorated with `@fn` return effects. Their implementation signatures use `EffectGen` for the generator body. Compose them with `yield from` inside a scoped workflow.\n\n" : "Compose Effect v4 operations with `yield*` inside a scoped workflow. Properties expose sub-clients and state.\n\n"}${content}\n`,
    );
  }
  for (const file of readdirSync(join(output, folder))) {
    if (file.endsWith(".mdx") && !pages.includes(file.slice(0, -4)))
      throw new Error(`Remove obsolete generated SDK page: ${folder}/${file}`);
  }
  docsOutput(
    join(output, `${language}.mdx`),
    `---\ntitle: ${language === "typescript" ? "TypeScript" : "Python"} API\ndescription: Public client classes, methods, and properties from the pinned SDK source.\nicon: Code\n---\n\n${intro}Choose a class to inspect its public members. Start with [the first ${language === "typescript" ? "TypeScript" : "Python"} program](/docs/sdk/${language}) for runtime setup.\n\n| Class | Members |\n| --- | --- |\n${items.map((item) => `| [${item.name}](/docs/sdk/api/${folder}/${slug(item.name)}) | ${item.members.length} |`).join("\n")}\n`,
  );
}
writeClasses("typescript", classes);
const python = JSON.parse(
  execFileSync("python3.14", ["scripts/extract-sdk-python-api.py", directory], {
    encoding: "utf8",
  }),
) as Record<
  string,
  Array<{
    name: string;
    signature: string;
    description: string;
    file: string;
    line: number;
  }>
>;
writeClasses(
  "python",
  Object.entries(python)
    .map(([name, members]) => ({
      name,
      members: members.map((member) => ({
        ...member,
        source: `${sdkRepository}/blob/${sdkRevision}/sdk/python/src/soulfire/${member.file}#L${member.line}`,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en")),
);
const options = exports
  .filter(
    (symbol) =>
      symbol.name.endsWith("Options") &&
      symbol.declarations?.some(
        (declaration) =>
          declaration
            .getSourceFile()
            .fileName.startsWith(join(directory, "sdk/typescript/src")) &&
          !declaration.getSourceFile().fileName.includes("/generated/"),
      ),
  )
  .sort((a, b) => a.name.localeCompare(b.name, "en"));
const cell = (value: string) =>
  prose(value.replace(/\s+/gu, " ").replace(/\|/gu, "\\|"));
const tables = options
  .map((symbol) => {
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const rows = checker.getPropertiesOfType(type).map((property) => {
      const declaration =
        property.valueDeclaration ?? property.declarations?.[0];
      if (!declaration)
        throw new Error(
          `Missing option declaration: ${symbol.name}.${property.name}`,
        );
      const description = ts.displayPartsToString(
        property.getDocumentationComment(checker),
      );
      const typeText =
        ts.isPropertySignature(declaration) && declaration.type
          ? declaration.type.getText()
          : checker.typeToString(
              checker.getTypeOfSymbolAtLocation(property, declaration),
              undefined,
              ts.TypeFormatFlags.NoTruncation,
            );
      const source = sourceLink(
        declaration.getSourceFile(),
        declaration
          .getSourceFile()
          .getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
      );
      return `| \`${property.name}\` | \`${cell(typeText)}\` | ${property.flags & ts.SymbolFlags.Optional ? "No" : "Yes"} | ${description ? cell(description) : `[Source contract](${source})`} |`;
    });
    return rows.length
      ? `## ${symbol.name}\n\n| Field | Type | Required | Description or source |\n| --- | --- | --- | --- |\n${rows.join("\n")}`
      : "";
  })
  .filter(Boolean);
docsOutput(
  join(output, "types.mdx"),
  `---\ntitle: TypeScript options\ndescription: Public option fields and inherited types from the pinned SDK source.\nicon: Braces\n---\n\n${intro}Tables include inherited fields. If a field has no source comment, its contract link supplies the context. An optional field is not a guarantee of a particular default. Read the implementation or the relevant guide for behavior.\n\n${tables.join("\n\n")}\n`,
);
docsOutput(
  join(output, "meta.json"),
  `${JSON.stringify({ title: "Client API", icon: "BookOpen", defaultOpen: false, pages: ["ts", "py", "types"] }, null, 2)}\n`,
);
console.log(
  `Generated ${classes.length} TypeScript and ${Object.keys(python).length} Python class pages, plus ${tables.length} option tables.`,
);
