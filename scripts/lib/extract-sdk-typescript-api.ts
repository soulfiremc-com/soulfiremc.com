import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import type {
  ApiMember,
  ApiParameter,
  ApiReference,
  ApiSignature,
  ApiSource,
  ApiSymbol,
} from "./sdk-api";

export function extractTypescriptApi(directory: string): ApiReference {
  const sourceDirectory = join(directory, "sdk/typescript/src");
  const packageJson = JSON.parse(
    readFileSync(join(directory, "sdk/typescript/package.json"), "utf8"),
  ) as { name: string; exports: Record<string, { types: string }> };
  const entries = Object.entries(packageJson.exports).flatMap(
    ([path, value]) => {
      const source = value.types
        .replace("./dist/", "")
        .replace(/\.d\.ts$/u, ".ts");
      if (!source.includes("*"))
        return [
          {
            path: path.replace(/^\./u, packageJson.name),
            file: join(sourceDirectory, source),
          },
        ];
      const prefix = source.slice(0, source.indexOf("*"));
      return readdirSync(join(sourceDirectory, prefix), { recursive: true })
        .filter(
          (file): file is string =>
            typeof file === "string" && file.endsWith(".ts"),
        )
        .map((file) => ({
          path: path
            .replace(/^\./u, packageJson.name)
            .replace("*", file.slice(0, -3)),
          file: join(sourceDirectory, prefix, file),
        }));
    },
  );
  const program = ts.createProgram(
    entries.map((entry) => entry.file),
    {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      skipLibCheck: true,
    },
  );
  const checker = program.getTypeChecker();
  const flags = ts.TypeFormatFlags.NoTruncation;
  const resolve = (symbol: ts.Symbol) =>
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const declarationOf = (symbol: ts.Symbol) =>
    symbol.valueDeclaration ?? symbol.declarations?.[0];
  const declarations = new Map<string, ts.Symbol>();
  const idOf = (symbol: ts.Symbol) => {
    const target = resolve(symbol);
    const declaration = declarationOf(target);
    if (!declaration) return "";
    const id = `${relative(sourceDirectory, declaration.getSourceFile().fileName)}:${target.name}`;
    if (declaration.getSourceFile().fileName.startsWith(sourceDirectory))
      declarations.set(id, target);
    return id;
  };
  const sourceOf = (node: ts.Node): ApiSource => ({
    file: relative(directory, node.getSourceFile().fileName),
    line:
      node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line +
      1,
  });
  const descriptionOf = (symbol: ts.Symbol) =>
    ts.displayPartsToString(symbol.getDocumentationComment(checker));
  const deprecatedOf = (symbol: ts.Symbol) => {
    const tag = symbol
      .getJsDocTags(checker)
      .find((item) => item.name === "deprecated");
    return tag ? ts.displayPartsToString(tag.text) || "Deprecated." : undefined;
  };
  const typeText = (type: ts.Type) =>
    checker.typeToString(type, undefined, flags);
  const fileBindings = new Map<string, Record<string, string>>();
  function bindingsOf(file: ts.SourceFile) {
    const cached = fileBindings.get(file.fileName);
    if (cached) return cached;
    const bindings: Record<string, string> = {};
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol) bindings[node.text] = idOf(symbol);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    fileBindings.set(file.fileName, bindings);
    return bindings;
  }
  function signatureOf(
    signature: ts.Signature,
    name: string,
    construct = false,
  ): ApiSignature {
    const declaration = signature.getDeclaration();
    const parameters: ApiParameter[] = signature.parameters.map((parameter) => {
      const node = declarationOf(parameter);
      const argument = node && ts.isParameter(node) ? node : undefined;
      const defaultValue = argument?.initializer?.getText();
      return {
        name: argument?.dotDotDotToken
          ? `...${parameter.name}`
          : parameter.name,
        type: typeText(
          checker.getTypeOfSymbolAtLocation(parameter, node ?? declaration!),
        ),
        optional: Boolean(
          argument?.dotDotDotToken ||
          argument?.questionToken ||
          defaultValue ||
          parameter.flags & ts.SymbolFlags.Optional,
        ),
        ...(defaultValue === undefined ? {} : { default: defaultValue }),
        description: descriptionOf(parameter),
      };
    });
    return {
      text: `${construct ? "new " : ""}${name}${checker.signatureToString(signature, undefined, flags)}`,
      parameters,
      returns: typeText(checker.getReturnTypeOfSignature(signature)),
    };
  }
  function memberOf(
    symbol: ts.Symbol,
    owner: ts.Type,
    classDeclaration?: ts.ClassDeclaration,
    isStatic = false,
  ): ApiMember | undefined {
    const declaration = declarationOf(symbol);
    if (
      !declaration ||
      !declaration.getSourceFile().fileName.startsWith(sourceDirectory)
    )
      return;
    if (symbol.name.startsWith("#")) return;
    const namedDeclaration = declaration as ts.NamedDeclaration;
    const name =
      namedDeclaration.name && ts.isComputedPropertyName(namedDeclaration.name)
        ? namedDeclaration.name.getText()
        : symbol.name;
    if (
      ts.canHaveModifiers(declaration) &&
      ts
        .getModifiers(declaration)
        ?.some((modifier) =>
          [
            ts.SyntaxKind.PrivateKeyword,
            ts.SyntaxKind.ProtectedKeyword,
          ].includes(modifier.kind),
        )
    )
      return;
    const type = checker.getTypeOfSymbolAtLocation(
      checker.getPropertyOfType(owner, symbol.name) ?? symbol,
      declaration,
    );
    const calls = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    const initializer =
      ts.isPropertyDeclaration(declaration) || ts.isEnumMember(declaration)
        ? declaration.initializer
        : undefined;
    const enumValue = ts.isEnumMember(declaration)
      ? checker.getConstantValue(declaration)
      : undefined;
    const readonly =
      ts.canHaveModifiers(declaration) &&
      ts
        .getModifiers(declaration)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword);
    const inherited =
      classDeclaration && declaration.parent !== classDeclaration;
    const parent = declaration.parent;
    const inheritedFrom =
      inherited &&
      (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent))
        ? parent.name?.text
        : undefined;
    return {
      name,
      kind: ts.isEnumMember(declaration)
        ? "enum member"
        : `${isStatic ? "static " : ""}${calls.length ? "method" : "property"}`,
      description: descriptionOf(symbol),
      source: sourceOf(declaration),
      signatures: calls.map((signature) =>
        signatureOf(signature, `${isStatic ? "static " : ""}${name}`),
      ),
      ...(!calls.length
        ? { type: typeText(type), readonly: Boolean(readonly) }
        : {}),
      ...(enumValue !== undefined
        ? { default: String(enumValue) }
        : initializer
          ? { default: initializer.getText() }
          : {}),
      optional: Boolean(symbol.flags & ts.SymbolFlags.Optional),
      ...(inheritedFrom ? { inheritedFrom } : {}),
      deprecated: deprecatedOf(symbol),
    };
  }
  const symbols = new Map<string, ApiSymbol>();
  function addSymbol(target: ts.Symbol, name: string, importPath?: string) {
    const declaration = declarationOf(target);
    if (!declaration) return;
    const id = `${idOf(target)}:${name}`;
    const existing = symbols.get(id);
    if (existing) {
      if (importPath && !existing.imports.includes(importPath))
        existing.imports.push(importPath);
      return;
    }
    const isClass = ts.isClassDeclaration(declaration);
    const isInterface = ts.isInterfaceDeclaration(declaration);
    const isAlias = ts.isTypeAliasDeclaration(declaration);
    const isEnum = ts.isEnumDeclaration(declaration);
    const isType = isClass || isInterface || isAlias || isEnum;
    const type =
      isType && !isEnum
        ? checker.getDeclaredTypeOfSymbol(target)
        : checker.getTypeOfSymbolAtLocation(target, declaration);
    const calls = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
    const kind = isClass
      ? "class"
      : isInterface
        ? "interface"
        : isAlias
          ? "type"
          : isEnum
            ? "enum"
            : calls.length
              ? "function"
              : type.getProperties().length &&
                  !(type.flags & ts.TypeFlags.StringLike)
                ? "object"
                : "constant";
    const members = checker.getPropertiesOfType(type).flatMap((property) => {
      const member = memberOf(
        property,
        type,
        isClass ? declaration : undefined,
      );
      return member ? [member] : [];
    });
    if (isClass) {
      const staticType = checker.getTypeOfSymbolAtLocation(target, declaration);
      members.unshift(
        ...checker
          .getSignaturesOfType(staticType, ts.SignatureKind.Construct)
          .filter((signature) => {
            const constructor = signature.getDeclaration();
            return (
              !constructor ||
              !ts.canHaveModifiers(constructor) ||
              !ts
                .getModifiers(constructor)
                ?.some((modifier) =>
                  [
                    ts.SyntaxKind.PrivateKeyword,
                    ts.SyntaxKind.ProtectedKeyword,
                  ].includes(modifier.kind),
                )
            );
          })
          .map((signature): ApiMember => ({
            name: "constructor",
            kind: "constructor",
            description: "",
            source: sourceOf(
              signature
                .getDeclaration()
                ?.getSourceFile()
                .fileName.startsWith(sourceDirectory)
                ? signature.getDeclaration()!
                : declaration,
            ),
            signatures: [signatureOf(signature, name, true)],
          })),
      );
      for (const property of checker.getPropertiesOfType(staticType)) {
        const member = memberOf(property, staticType, declaration, true);
        if (member) members.push(member);
      }
    }
    const bases =
      isClass || isInterface
        ? (declaration.heritageClauses ?? []).flatMap((clause) =>
            clause.types.map((base) => base.getText()),
          )
        : [];
    let text: string;
    if (isAlias) text = declaration.getText().replace(/^export\s+/u, "");
    else if (isClass || isInterface || isEnum)
      text = declaration
        .getText()
        .slice(0, declaration.members.pos - declaration.getStart())
        .trim()
        .replace(/^export\s+/u, "")
        .replace(/\{$/u, "")
        .trim();
    else text = `${name}: ${typeText(type)}`;
    const bindings = bindingsOf(declaration.getSourceFile());
    symbols.set(id, {
      id,
      name: name,
      kind,
      module: relative(
        sourceDirectory,
        declaration.getSourceFile().fileName,
      ).replace(/\.ts$/u, ""),
      imports: importPath ? [importPath] : [],
      source: sourceOf(declaration),
      description: descriptionOf(target),
      signatures:
        !isType && calls.length
          ? calls.map((signature) => signatureOf(signature, name))
          : [
              { text, parameters: [] },
              ...calls.map((signature) => signatureOf(signature, name)),
            ],
      ...(kind === "constant" ? { type: typeText(type) } : {}),
      members: kind === "constant" || kind === "function" ? [] : members,
      bases,
      bindings,
      deprecated: deprecatedOf(target),
      examples: target
        .getJsDocTags(checker)
        .filter((tag) => tag.name === "example")
        .map((tag) => ts.displayPartsToString(tag.text)),
    });
  }
  for (const entry of entries) {
    const file = program.getSourceFile(entry.file);
    const module = file && checker.getSymbolAtLocation(file);
    if (!module) throw new Error(`Missing SDK entry point: ${entry.path}`);
    for (const exported of checker.getExportsOfModule(module))
      addSymbol(resolve(exported), exported.name, entry.path);
  }
  // Document SDK-local types used by public contracts, even when they have no import path.
  const queue = [...symbols.values()];
  const seen = new Set(
    queue.map((symbol) => symbol.id.slice(0, symbol.id.lastIndexOf(":"))),
  );
  for (let index = 0; index < queue.length; index++) {
    const symbol = queue[index];
    const texts = [
      ...symbol.signatures.map((signature) => signature.text),
      ...symbol.bases,
      ...symbol.members.flatMap((member) => [
        member.type ?? "",
        ...member.signatures.map((signature) => signature.text),
      ]),
    ];
    for (const text of texts)
      for (const token of text.matchAll(/[a-zA-Z_$][\w$]*/gu)) {
        const binding = symbol.bindings[token[0]];
        const target = binding && declarations.get(binding);
        const declaration = target && declarationOf(target);
        if (!target || !declaration || !binding || seen.has(binding)) continue;
        if (
          !ts.isInterfaceDeclaration(declaration) &&
          !ts.isTypeAliasDeclaration(declaration) &&
          !ts.isClassDeclaration(declaration) &&
          !ts.isEnumDeclaration(declaration)
        )
          continue;
        seen.add(binding);
        addSymbol(target, target.name);
        const added = symbols.get(`${binding}:${target.name}`);
        if (added) queue.push(added);
      }
  }
  return {
    language: "typescript",
    symbols: [...symbols.values()].sort((a, b) =>
      a.id.localeCompare(b.id, "en"),
    ),
  };
}
