import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { sdkRepository, sdkRevision, sdkSource } from "./sdk-source";
import { docsOutput } from "./lib/docs-output";
import {
  builderCalls,
  javaString,
  parsePort,
  type NodePort,
} from "./lib/java-metadata";
import { printLine } from "./lib/output";
import { itemAt } from "../src/lib/item-at";

const checkout = sdkSource();
const scriptDir = join(
  checkout,
  "mod/src/main/java/com/soulfiremc/server/script",
);
const nodesDir = join(scriptDir, "nodes");
const registry = readFileSync(join(nodesDir, "NodeRegistry.java"), "utf8");
const registered = [...registry.matchAll(/register\((\w+)\.METADATA,/gu)].map(
  (match) => match[1],
);
if (registered.length === 0 || new Set(registered).size !== registered.length)
  throw new Error("Invalid node registry");
const files = readdirSync(nodesDir, { recursive: true }).filter(
  (file): file is string => typeof file === "string" && file.endsWith(".java"),
);
const constants = Object.fromEntries(
  [
    ...readFileSync(join(scriptDir, "StandardPorts.java"), "utf8").matchAll(
      /String (\w+) = ("[^"]+")/gu,
    ),
  ].map((match) => {
    const name = match[1];
    if (name === undefined) throw new Error("Invalid StandardPorts constant");
    return [name, javaString(match[2])] as const;
  }),
);
const categories = [
  ...readFileSync(join(scriptDir, "CategoryRegistry.java"), "utf8").matchAll(
    /(\w+) = register\(\s*NodeCategory.of\("([^"]+)", "([^"]+)"/gu,
  ),
].map((match) => ({
  constant: itemAt(match, 1),
  id: itemAt(match, 2),
  name: itemAt(match, 3),
}));
type Node = {
  type: string;
  name: string;
  category: string;
  description: string;
  trigger: boolean;
  expensive: boolean;
  keywords: string[];
  inputs: NodePort[];
  outputs: NodePort[];
  source: string;
};
const nodes: Node[] = registered.map((className) => {
  const filename = files.find(
    (file) =>
      file.endsWith(`/${className}.java`) || file === `${className}.java`,
  );
  if (!filename) throw new Error(`Missing node source: ${className}`);
  const path = join(nodesDir, filename);
  const source = readFileSync(path, "utf8");
  const metadata =
    /METADATA\s*=\s*NodeMetadata.builder\(\)([\s\S]*?)\.build\(\);/u.exec(
      source,
    );
  if (!metadata) throw new Error(`Missing metadata: ${className}`);
  const node: Node = {
    type: "",
    name: "",
    category: "",
    description: "",
    trigger: false,
    expensive: false,
    keywords: [],
    inputs: [],
    outputs: [],
    source: `${sdkRepository}/blob/${sdkRevision}/${relative(checkout, path)}`,
  };
  for (const call of builderCalls(itemAt(metadata, 1))) {
    switch (call.name) {
      case "type": {
        node.type = javaString(call.args[0]);
        break;
      }
      case "displayName": {
        node.name = javaString(call.args[0]);
        break;
      }
      case "description": {
        node.description = javaString(call.args[0]);
        break;
      }
      case "category": {
        const category = categories.find(
          (item) => call.args[0] === `CategoryRegistry.${item.constant}`,
        );
        if (!category) throw new Error(`Unknown category in ${className}`);
        node.category = category.id;
        break;
      }
      case "addInputs": {
        node.inputs.push(...call.args.map((arg) => parsePort(arg, constants)));
        break;
      }
      case "addOutputs": {
        node.outputs.push(...call.args.map((arg) => parsePort(arg, constants)));
        break;
      }
      case "isTrigger": {
        node.trigger = call.args[0] === "true";
        break;
      }
      case "isExpensive": {
        node.expensive = call.args[0] === "true";
        break;
      }
      case "keywords":
      case "addKeywords": {
        // Search aliases, such as names from earlier releases.
        node.keywords.push(
          ...[...call.args.join(",").matchAll(/"(?:[^"\\]|\\.)*"/gu)].map(
            (match) => javaString(match[0]),
          ),
        );
        break;
      }
      case "icon":
      case "color":
      case "supportsMuting":
      case "blocksThread": {
        break;
      }
      default: {
        throw new Error(`Unsupported metadata field: ${call.name}`);
      }
    }
  }
  if (!node.type || !node.name || !node.category || !node.description)
    throw new Error(`Incomplete metadata: ${className}`);
  for (const ports of [node.inputs, node.outputs]) {
    if (new Set(ports.map((port) => port.id)).size !== ports.length)
      throw new Error(`Duplicate port: ${className}`);
  }
  return node;
});
if (new Set(nodes.map((node) => node.type)).size !== nodes.length)
  throw new Error("Duplicate node type");
const codeCell = (value: string) =>
  value.replaceAll("|", String.raw`\|`).replaceAll("\n", " ");
const escape = (value: string) =>
  codeCell(value)
    .replaceAll(/\s*—\s*/gu, "; ")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const aliases = (node: Node) => {
  const names = [...new Set(node.keywords)].filter(
    (keyword) => keyword.toLowerCase() !== node.name.toLowerCase(),
  );
  return names.length > 0
    ? `\n\nAlso called: ${names.map((name) => escape(name)).join(", ")}.`
    : "";
};
const portsTable = (ports: NodePort[], input: boolean) =>
  ports.length > 0
    ? `| Port | Type | ${input ? "Required / default" : "Description"} |${input ? " Description |" : ""}\n| --- | --- | --- |${input ? " --- |" : ""}\n${ports.map((port) => `| \`${port.id}\` (${escape(port.name)}) | \`${codeCell(port.type)}\` | ${input ? `${port.defaultValue !== undefined ? `\`${codeCell(JSON.stringify(port.defaultValue))}\`` : port.required ? "Required" : "Optional"} | ` : ""}${escape(port.description)}${port.multiInput ? " Multi-input collection is not implemented by the reactive engine." : ""} |`).join("\n")}`
    : "None.";
const body = categories
  .map((category) => {
    const items = nodes
      .filter((node) => node.category === category.id)
      .toSorted((a, b) => a.name.localeCompare(b.name, "en"));
    if (items.length === 0) return "";
    return `## ${category.name}\n\n${items.map((node) => `### ${node.name}\n\n\`${node.type}\`${node.trigger ? " (trigger)" : ""}${node.expensive ? " (expensive operation)" : ""}\n\n${escape(node.description)}${aliases(node)}\n\n**Inputs**\n\n${portsTable(node.inputs, true)}\n\n**Outputs**\n\n${portsTable(node.outputs, false)}\n\n[Implementation](${node.source})`).join("\n\n")}`;
  })
  .filter(Boolean)
  .join("\n\n");
docsOutput(
  resolve("content/docs/(main)/(automation)/scripting/node-reference.mdx"),
  `---\ntitle: Node reference\ndescription: Built-in node IDs, input defaults, output ports, and source links.\nicon: Workflow\n---\n\nGenerated from the [pinned SoulFire source](${sdkRepository}/tree/${sdkRevision}). This snapshot contains ${nodes.length} built-in nodes in ${categories.length} categories. Plugins can add other nodes. The connected server's palette is authoritative for its installed version.\n\nInput defaults are JSON values. An execution wire selects when an action runs. A data wire supplies a value. An optional bot input overrides the bot in execution context. Read [execution and data](/docs/scripting/execution-and-data) before wiring a graph.\n\nThe SDK and node reference use the [documented source baseline](/docs/sdk/compatibility). Regenerate this page with \`bun run generate-node-reference\`.\n\n${body}\n`,
);
docsOutput(
  resolve("public/docs/node-catalog.json"),
  `${JSON.stringify({ revision: sdkRevision, categories, nodes }, null, 2)}\n`,
);
printLine(
  `Generated ${nodes.length} nodes and ${categories.length} categories.`,
);
