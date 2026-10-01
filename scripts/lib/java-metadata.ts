/** Parse the literal factory-call DSL used by Java node metadata, not arbitrary Java. */
export type JavaCall = { name: string; args: string[] };

export function splitArguments(source: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      result.push(source.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error("Unbalanced Java metadata expression");
  }
  if (quoted || depth !== 0)
    throw new Error("Incomplete Java metadata expression");
  const last = source.slice(start).trim();
  if (last) result.push(last);
  if (result.some((arg) => !arg))
    throw new Error("Empty Java metadata argument");
  return result;
}

export function parseCall(source: string): JavaCall {
  const match = /^([\w.]+)\(([\s\S]*)\)$/u.exec(source.trim());
  if (!match) throw new Error(`Unsupported metadata call: ${source}`);
  return { name: match[1], args: splitArguments(match[2]) };
}

export function builderCalls(source: string): JavaCall[] {
  const calls: JavaCall[] = [];
  let rest = source.trim();
  while (rest) {
    const start = /^\.(\w+)\(/u.exec(rest);
    if (!start) throw new Error(`Unsupported metadata builder: ${rest}`);
    let depth = 1;
    let quoted = false;
    let escaped = false;
    let end = start[0].length;
    for (; end < rest.length && depth > 0; end++) {
      const char = rest[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    if (depth || quoted) throw new Error("Incomplete metadata builder call");
    calls.push({
      name: start[1],
      args: splitArguments(rest.slice(start[0].length, end - 1)),
    });
    rest = rest.slice(end).trim();
  }
  return calls;
}

export function javaString(source: string): string {
  if (!/^"(?:[^"\\]|\\.)*"$/su.test(source)) {
    throw new Error(`Expected a literal Java string: ${source}`);
  }
  return JSON.parse(source) as string;
}

export type NodePort = {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
  multiInput?: boolean;
};

function descriptor(source: string): string {
  if (/^PortType\.\w+$/u.test(source)) return source.slice(9).toLowerCase();
  const { name, args } = parseCall(source);
  const factory = name.replace(/^TypeDescriptor\./u, "");
  if (factory === "typeVar" && args.length === 1) return javaString(args[0]);
  if (factory === "simple" && args.length === 1) return descriptor(args[0]);
  const collections: Record<string, string> = {
    list: "list",
    listOf: "list",
    set: "set",
    setOf: "set",
    map: "map",
    mapOf: "map",
    collection: "collection",
    collectionOf: "collection",
  };
  const collection = collections[factory];
  if (!collection || args.length !== (collection === "map" ? 2 : 1)) {
    throw new Error(`Unsupported type descriptor: ${source}`);
  }
  return `${collection}<${args.map(descriptor).join(", ")}>`;
}

export function parsePort(
  source: string,
  constants: Record<string, string>,
): NodePort {
  const { name, args } = parseCall(source);
  const factory = name.replace(/^PortDefinition\./u, "");
  if (!name.startsWith("PortDefinition."))
    throw new Error(`Unknown port factory: ${name}`);
  const standard = {
    execIn: {
      id: "in",
      name: "In",
      type: "exec",
      description: "Execution input",
    },
    execOut: {
      id: "out",
      name: "Out",
      type: "exec",
      description: "Execution output",
    },
    botIn: {
      id: "bot",
      name: "Bot",
      type: "bot",
      description: "Optional override of the bot in execution context",
    },
  };
  if (factory in standard) {
    if (args.length) throw new Error(`Unexpected arguments for ${name}`);
    return { ...standard[factory as keyof typeof standard], required: false };
  }
  const factories = new Set([
    "input",
    "output",
    "inputWithDefault",
    "multiInput",
    "listInput",
    "listOutput",
    "setInput",
    "setOutput",
    "genericInput",
    "genericOutput",
    "genericListInput",
    "genericListOutput",
    "genericSetInput",
    "genericSetOutput",
    "genericCollectionInput",
    "genericCollectionOutput",
  ]);
  if (
    !factories.has(factory) ||
    args.length !== (factory === "inputWithDefault" ? 5 : 4)
  ) {
    throw new Error(`Unsupported port definition: ${source}`);
  }
  const id = args[0].startsWith("StandardPorts.exec(")
    ? `exec_${javaString(parseCall(args[0]).args[0])}`
    : args[0].startsWith("StandardPorts.")
      ? constants[args[0].slice(14)]
      : javaString(args[0]);
  if (!id) throw new Error(`Unknown port ID: ${args[0]}`);
  let type = descriptor(args[2]);
  if (/list/iu.test(factory)) type = `list<${type}>`;
  else if (/set/iu.test(factory)) type = `set<${type}>`;
  else if (/collection/iu.test(factory)) type = `collection<${type}>`;
  return {
    id,
    name: javaString(args[1]),
    type,
    description: javaString(args.at(-1)!),
    required: /input$/iu.test(factory) && factory !== "multiInput",
    ...(factory === "inputWithDefault" && javaString(args[3]) !== ""
      ? { defaultValue: JSON.parse(javaString(args[3])) as unknown }
      : {}),
    ...(factory === "multiInput" ? { multiInput: true } : {}),
  };
}
