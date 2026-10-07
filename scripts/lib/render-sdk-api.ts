import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { slug as headingSlug } from "github-slugger";
import { remark } from "remark";
import { docsOutput } from "./docs-output";
import {
  apiSlug,
  type ApiMember,
  type ApiReference,
  type ApiSignature,
  type ApiSymbol,
} from "./sdk-api";

type Page = {
  slug: string;
  title: string;
  symbols: ApiSymbol[];
  group: string;
  protocol: boolean;
};

type CommentNode = {
  type: string;
  value?: string;
  children?: CommentNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

function renderComment(value: string) {
  const code: { start: number; end: number; text: string }[] = [];
  function visit(node: CommentNode) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      (node.type === "code" || node.type === "inlineCode") &&
      start !== undefined &&
      end !== undefined
    ) {
      const original = value.slice(start, end);
      const indented =
        node.type === "code" && !/^(?:`{3,}|~{3,})/u.test(original);
      const marker = "`".repeat(
        Math.max(
          2,
          ...(node.value?.match(/`+/gu) ?? []).map((run) => run.length),
        ) + 1,
      );
      code.push({
        start,
        end,
        text: indented ? `${marker}text\n${node.value}\n${marker}` : original,
      });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(remark().parse(value));
  const escape = (text: string) =>
    text
      .replace(/—/gu, ", ")
      .replace(/</gu, "&lt;")
      .replace(/>/gu, "&gt;")
      .replace(/\{/gu, "\\{")
      .replace(/\}/gu, "\\}");
  let rendered = "";
  let offset = 0;
  for (const block of code) {
    rendered += escape(value.slice(offset, block.start)) + block.text;
    offset = block.end;
  }
  return rendered + escape(value.slice(offset));
}

export function renderSdkApi(
  reference: ApiReference,
  output: string,
  repository: string,
  revision: string,
) {
  const language = reference.language;
  const folder = language === "typescript" ? "ts" : "py";
  const baseUrl = `/docs/sdk/api/${folder}`;
  const packageName =
    language === "typescript" ? "@soulfiremc/sdk" : "soulfire";
  const label = language === "typescript" ? "TypeScript" : "Python";
  const sourceUrl = (source: ApiMember["source"]) =>
    `${repository}/blob/${revision}/${source.file}#L${source.line}`;
  const intro = `Generated from the [pinned SDK source](${repository}/tree/${revision}). Use the [matching installation](/docs/sdk/compatibility). Each source link points to this baseline.\n\n`;
  const prose = renderComment;
  const inline = (value: string, table = false) => {
    const fence = "`".repeat(
      Math.max(0, ...(value.match(/`+/gu) ?? []).map((run) => run.length)) + 1,
    );
    const text = value.replace(/\r?\n/gu, " ");
    return `${fence}${table ? text.replace(/\|/gu, "\\|") : text}${fence}`;
  };
  const fence = (value: string) =>
    `\`\`\`${language === "typescript" ? "ts" : "python"}\n${value}\n\`\`\``;
  const header = (title: string, description: string) =>
    `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\nicon: Code\n---\n\n`;
  const isProtocol = (symbol: ApiSymbol) =>
    language === "typescript"
      ? symbol.module.startsWith("generated/")
      : /(?:_pb2|_connect)$/u.test(symbol.module);
  const isRoot = (symbol: ApiSymbol) => symbol.imports.includes(packageName);
  const pages: Page[] = [];
  const destinations = new Map<string, string>();
  const names = new Map<string, ApiSymbol[]>();
  for (const symbol of reference.symbols)
    names.set(symbol.name, [...(names.get(symbol.name) ?? []), symbol]);
  const publicSymbols = reference.symbols.filter(
    (symbol) => !isProtocol(symbol) || isRoot(symbol),
  );
  const usedSlugs = new Set<string>();
  for (const symbol of publicSymbols) {
    // Runtime facades share one published name but have different contracts.
    if (language === "typescript" && symbol.name === "SoulFire") continue;
    let slug = apiSlug(symbol.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${apiSlug(symbol.module)}`;
    usedSlugs.add(slug);
    const page = {
      slug,
      title: symbol.name,
      symbols: [symbol],
      group: isProtocol(symbol) ? "protocol-types" : apiSlug(symbol.module),
      protocol: false,
    };
    pages.push(page);
    destinations.set(symbol.id, `${baseUrl}/${slug}`);
  }
  if (language === "typescript") {
    const facades = reference.symbols
      .filter((symbol) => symbol.name === "SoulFire")
      .sort((a, b) => {
        const priority = (symbol: ApiSymbol) =>
          symbol.module === "bun"
            ? 0
            : symbol.module === "node"
              ? 1
              : symbol.module === "browser"
                ? 2
                : 3;
        return priority(a) - priority(b);
      });
    if (facades.length) {
      pages.push({
        slug: "soul-fire",
        title: "SoulFire",
        symbols: facades,
        group: "client",
        protocol: false,
      });
      for (const symbol of facades)
        destinations.set(symbol.id, `${baseUrl}/soul-fire`);
    }
  }
  const protocolModules = new Map<string, ApiSymbol[]>();
  for (const symbol of reference.symbols.filter(isProtocol))
    protocolModules.set(symbol.module, [
      ...(protocolModules.get(symbol.module) ?? []),
      symbol,
    ]);
  for (const [module, symbols] of protocolModules) {
    const slug = `generated-${apiSlug(module.replace(/^generated\//u, ""))}`;
    pages.push({
      slug,
      title: `${module} module`,
      symbols,
      group: "generated",
      protocol: true,
    });
    for (const symbol of symbols) {
      if (!destinations.has(symbol.id))
        destinations.set(
          symbol.id,
          `${baseUrl}/${slug}#${headingSlug(symbol.name)}`,
        );
    }
  }
  const declaredDestinations = new Map<string, string>();
  for (const symbol of reference.symbols) {
    const destination = destinations.get(symbol.id)!;
    declaredDestinations.set(symbol.id, destination);
    if (language === "typescript")
      declaredDestinations.set(
        symbol.id.slice(0, symbol.id.lastIndexOf(":")),
        destination,
      );
  }
  function resolveName(name: string, symbol: ApiSymbol): string | undefined {
    const binding = symbol.bindings[name];
    if (binding) return declaredDestinations.get(binding);
    if (name.includes(".")) {
      const [prefix, ...rest] = name.split(".");
      const module = symbol.bindings[prefix];
      if (module)
        return declaredDestinations.get(
          `${module}${module.endsWith(":") ? "" : "."}${rest.join(".")}`,
        );
    }
    const candidates = names.get(name);
    const local = candidates?.find((item) => item.module === symbol.module);
    const root = candidates?.find(isRoot);
    const candidate =
      local ?? root ?? (candidates?.length === 1 ? candidates[0] : undefined);
    return candidate ? destinations.get(candidate.id) : undefined;
  }
  function typeLinks(value: string, symbol: ApiSymbol, table = false) {
    if (value === "Unannotated") return "No type annotation";
    // Keep the exact type spelling, including private aliases in packaged stubs.
    // Links resolve through imports instead of guessing from a matching short name.
    const direct = resolveName(value, symbol);
    if (direct) return `[${inline(value, table)}](${direct})`;
    const links = new Map<string, string>();
    for (const token of value.matchAll(
      /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*/gu,
    )) {
      const destination = resolveName(token[0], symbol);
      if (destination) links.set(token[0], destination);
    }
    return (
      inline(value, table) +
      (links.size
        ? ` (${[...links].map(([name, destination]) => `[${inline(name, table)}](${destination})`).join(", ")})`
        : "")
    );
  }
  function signatureText(
    signature: ApiSignature,
    symbol: ApiSymbol,
    heading: number,
  ) {
    let text = `${fence(signature.text)}\n\n`;
    if (signature.effect)
      text +=
        "This callable returns an effect. The source uses `EffectGen` for its generator body. Compose the returned effect with `yield from`.\n\n";
    if (signature.parameters.length) {
      text += `${"#".repeat(heading)} Parameters\n\n| Parameter | Type | Default | Details |\n| --- | --- | --- | --- |\n`;
      text +=
        signature.parameters
          .map(
            (parameter) =>
              `| ${inline(parameter.name, true)} | ${typeLinks(parameter.type, symbol, true)} | ${parameter.defaultFactory ? `Factory: ${inline(parameter.defaultFactory, true)}` : parameter.default === undefined ? (parameter.optional ? "Optional" : "Required") : inline(parameter.default, true)} | ${[parameter.kind, parameter.description && prose(parameter.description).replace(/\s+/gu, " ").replace(/\|/gu, "\\|")].filter(Boolean).join(". ")} |`,
          )
          .join("\n") + "\n\n";
    }
    if (signature.returns && signature.returns !== "Unannotated")
      text += `**Returns:** ${typeLinks(signature.returns, symbol)}.\n\n`;
    return text;
  }
  function memberText(member: ApiMember, symbol: ApiSymbol, heading: number) {
    let text = `${"#".repeat(heading)} ${inline(member.name)}\n\n`;
    if (member.inheritedFrom)
      text += `Inherited from ${typeLinks(member.inheritedFrom, symbol)}.\n\n`;
    if (member.deprecated)
      text += `**Deprecated:** ${prose(member.deprecated)}\n\n`;
    if (member.description) text += `${prose(member.description)}\n\n`;
    if (member.readonly) text += "**Modifiers:** `readonly`.\n\n";
    if (member.type)
      text += `**Type:** ${typeLinks(member.type, symbol)}${member.optional ? " (optional)" : ""}.\n\n`;
    if (member.default !== undefined)
      text += `**${["constant", "enum member"].includes(member.kind) ? "Value" : "Default"}:** ${inline(member.default)}.\n\n`;
    if (member.defaultFactory)
      text += `**Default factory:** ${inline(member.defaultFactory)}.\n\n`;
    for (const [index, signature] of member.signatures.entries()) {
      if (member.signatures.length > 1) text += `**Overload ${index + 1}**\n\n`;
      text += signatureText(signature, symbol, heading + 1);
    }
    return text + `[Source](${sourceUrl(member.source)})\n\n`;
  }
  function symbolText(
    symbol: ApiSymbol,
    heading: number,
    includeHeading = false,
  ) {
    let text = includeHeading
      ? `${"#".repeat(heading)} ${symbol.name}\n\n`
      : "";
    text += `**${symbol.kind[0].toUpperCase()}${symbol.kind.slice(1)}** in ${inline(symbol.module)}. [Source](${sourceUrl(symbol.source)}).\n\n`;
    if (symbol.deprecated)
      text += `**Deprecated:** ${prose(symbol.deprecated)}\n\n`;
    if (symbol.description) text += `${prose(symbol.description)}\n\n`;
    text += symbol.imports.length
      ? `**Import from:** ${symbol.imports.map((path) => inline(path)).join(", ")}.\n\n`
      : "This declaration appears in public signatures but is not exported as a package entry point.\n\n";
    if (symbol.bases.length)
      text += `**Bases:** ${symbol.bases.map((base) => typeLinks(base, symbol)).join(", ")}.\n\n`;
    // Object declarations can be very large. Their members supply the complete contract.
    if (symbol.kind !== "object" || !symbol.members.length)
      for (const signature of symbol.signatures)
        text += signatureText(signature, symbol, heading + 1);
    const related = new Map<string, string>();
    for (const value of [
      ...symbol.signatures.map((signature) => signature.text),
      ...symbol.bases,
    ]) {
      for (const token of value.matchAll(
        /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*/gu,
      )) {
        const destination = resolveName(token[0], symbol);
        if (destination && destination !== destinations.get(symbol.id))
          related.set(token[0], destination);
      }
    }
    if (related.size)
      text += `**Referenced types:** ${[...related].map(([name, destination]) => `[${inline(name)}](${destination})`).join(", ")}.\n\n`;
    const grouped = new Map<string, ApiMember>();
    for (const member of symbol.members) {
      const key = `${member.kind}:${member.name}`;
      const previous = grouped.get(key);
      if (previous) previous.signatures.push(...member.signatures);
      else grouped.set(key, { ...member, signatures: [...member.signatures] });
    }
    for (const member of grouped.values())
      text += memberText(
        member,
        symbol,
        includeHeading ? heading + 1 : heading,
      );
    if (symbol.examples.length) {
      text += `${"#".repeat(heading)} Examples\n\n`;
      for (const example of symbol.examples) text += `${prose(example)}\n\n`;
    }
    return text;
  }
  const written = new Set<string>();
  const write = (path: string, content: string) => {
    written.add(path);
    docsOutput(path, content);
  };
  const groups = new Map<string, Page[]>();
  for (const page of pages.sort((a, b) =>
    a.title.localeCompare(b.title, "en"),
  )) {
    groups.set(page.group, [...(groups.get(page.group) ?? []), page]);
    const file = join(output, folder, `(${page.group})`, `${page.slug}.mdx`);
    let text =
      header(
        page.title,
        `${label} API signatures, fields, and source for ${page.title}.`,
      ) + intro;
    if (page.protocol) {
      text +=
        "This module contains the generated protocol declarations. SDK imports that expose the same symbol link to the same definition.\n\n";
      text +=
        "| Symbol | Kind |\n| --- | --- |\n" +
        page.symbols
          .map(
            (symbol) =>
              `| [${inline(symbol.name)}](${destinations.get(symbol.id)}) | ${symbol.kind} |`,
          )
          .join("\n") +
        "\n\n";
      for (const symbol of page.symbols) text += symbolText(symbol, 2, true);
    } else if (page.symbols.length > 1) {
      text +=
        "The runtime entry points expose different operations and HTTP requirements. Choose the import that matches your runtime.\n\n";
      for (const [index, symbol] of page.symbols.entries()) {
        if (index)
          text += `## ${symbol.module === "client" ? "Universal" : symbol.module} entry point\n\n`;
        text += symbolText(symbol, index ? 3 : 2);
      }
    } else text += symbolText(page.symbols[0], 2);
    write(file, text.trimEnd() + "\n");
  }
  const groupNames = [...groups.keys()].sort((a, b) =>
    a === "generated" ? 1 : b === "generated" ? -1 : a.localeCompare(b, "en"),
  );
  for (const group of groupNames) {
    const items = groups.get(group)!;
    const title =
      group === "generated"
        ? "Generated protocol modules"
        : group === "protocol-types"
          ? "Protocol types"
          : items[0].symbols[0].module;
    write(
      join(output, folder, `(${group})`, "meta.json"),
      JSON.stringify(
        {
          title,
          defaultOpen: false,
          pagesIndex: `../module-${group}`,
          pages: items.map((page) => page.slug),
        },
        null,
        2,
      ) + "\n",
    );
    write(
      join(output, folder, `module-${group}.mdx`),
      header(`${title} reference`, `${label} declarations in ${title}.`) +
        intro +
        "| API | Kind |\n| --- | --- |\n" +
        items
          .map(
            (page) =>
              `| [${inline(page.title)}](${baseUrl}/${page.slug}) | ${page.protocol ? "module" : page.symbols[0].kind} |`,
          )
          .join("\n") +
        "\n",
    );
  }
  write(
    join(output, folder, "meta.json"),
    JSON.stringify(
      {
        title: label,
        defaultOpen: false,
        pagesIndex: `../${language}`,
        pages: groupNames.map((group) => `(${group})`),
      },
      null,
      2,
    ) + "\n",
  );
  let index =
    header(
      `${label} API`,
      `Public ${label} exports, functions, types, and protocol declarations.`,
    ) + intro;
  index += `Start with [the first ${label} program](/docs/sdk/${language}) for runtime setup. Choose a module to inspect its declarations. Parameter and return types link to their definitions.\n\n`;
  index += "## Import paths\n\n| Import path | Declarations |\n| --- | --- |\n";
  const paths = [
    ...new Set(reference.symbols.flatMap((symbol) => symbol.imports)),
  ].filter(
    (path) => !/generated\//u.test(path) && !/(?:_pb2|_connect)$/u.test(path),
  );
  index +=
    paths
      .sort()
      .map(
        (path) =>
          `| ${inline(path)} | ${reference.symbols.filter((symbol) => symbol.imports.includes(path)).length} |`,
      )
      .join("\n") + "\n\n";
  index +=
    "## Modules\n\n| Module | Pages |\n| --- | --- |\n" +
    groupNames
      .map(
        (group) =>
          `| [${inline(group === "generated" ? "Generated protocol modules" : group === "protocol-types" ? "Protocol types" : groups.get(group)![0].symbols[0].module)}](${baseUrl}/module-${group}) | ${groups.get(group)!.length} |`,
      )
      .join("\n") +
    "\n";
  write(join(output, `${language}.mdx`), index);
  // The same stale-output behavior applies to moved or removed generated pages.
  const languageDirectory = join(output, folder);
  if (existsSync(languageDirectory))
    for (const file of readdirSync(languageDirectory, { recursive: true })) {
      if (
        typeof file !== "string" ||
        (!file.endsWith(".mdx") && !file.endsWith("meta.json"))
      )
        continue;
      const path = join(languageDirectory, file);
      if (written.has(path)) continue;
      if (process.argv.includes("--check"))
        throw new Error(
          `Remove obsolete generated SDK page: ${folder}/${file}`,
        );
      unlinkSync(path);
    }
  return {
    pages: pages.length,
    symbols: reference.symbols.length,
    destinations,
  };
}
