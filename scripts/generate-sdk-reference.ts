import { execFileSync } from "node:child_process";
import {
  buildSdk,
  sdkSource,
  sdkRepository as repository,
  sdkRevision,
} from "./sdk-source";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

const outputDir = resolve("content/docs/(main)/sdk/(reference)/api");
const sourceDir = sdkSource();

type Method = { name: string; signature: string; file: string; line: number };

const typescriptGroups = [
  {
    title: "Connect and select bots",
    description:
      "Use the root client to connect, select an instance, and close the connection.",
    classes: [
      {
        name: "SoulFireClient",
        file: "client.ts",
        methods: [
          "connect",
          "unauthenticated",
          "instance",
          "instances",
          "close",
        ],
      },
      {
        name: "SoulFireInstance",
        file: "client.ts",
        methods: ["bot", "bots", "events", "start", "stop"],
      },
    ],
  },
  {
    title: "Control a bot",
    description:
      "Bot methods handle one action. Use the linked guides for stream and task lifecycles.",
    classes: [
      {
        name: "SoulFireBot",
        file: "client.ts",
        methods: [
          "start",
          "stop",
          "status",
          "events",
          "observe",
          "waitForOnline",
        ],
      },
      {
        name: "SoulFireChat",
        file: "chat.ts",
        methods: ["send", "command", "watch", "waitFor"],
      },
    ],
  },
  {
    title: "Run durable tasks",
    description:
      "Task handles survive SDK disconnects. Read their state or resume them by ID.",
    classes: [
      {
        name: "SoulFireTasks",
        file: "tasks.ts",
        methods: [
          "goTo",
          "followEntity",
          "collectBlocks",
          "stash",
          "get",
          "list",
          "watch",
        ],
      },
      {
        name: "SoulFireTask",
        file: "tasks.ts",
        methods: ["refresh", "events", "wait", "cancel", "result"],
      },
    ],
  },
] as const;

const pythonGroups = [
  {
    title: "Connect and select bots",
    description:
      "Compose operations with effect-py and keep connections inside a scope.",
    classes: [
      {
        name: "SoulFire",
        methods: ["connect", "install", "instance", "instances", "close"],
      },
      {
        name: "SoulFireInstance",
        methods: ["bot", "bots", "events", "start", "stop"],
      },
    ],
  },
  {
    title: "Control a bot",
    description:
      "Operations return effects. Streams expose effect-based consumers.",
    classes: [
      {
        name: "SoulFireBot",
        methods: [
          "start",
          "stop",
          "status",
          "events",
          "observe",
          "wait_for_online",
        ],
      },
      {
        name: "SoulFireChat",
        methods: ["send", "command", "watch", "wait_for"],
      },
    ],
  },
  {
    title: "Run durable tasks",
    description:
      "Task handles survive SDK disconnects. Read their state or resume them by ID.",
    classes: [
      {
        name: "SoulFireTasks",
        methods: [
          "go_to",
          "follow_entity",
          "collect_blocks",
          "stash",
          "get",
          "list",
          "watch",
        ],
      },
      {
        name: "SoulFireTask",
        methods: ["refresh", "events", "wait", "cancel", "result"],
      },
    ],
  },
] as const;

function sourceLink(language: "typescript" | "python", method: Method) {
  const path =
    language === "typescript"
      ? `sdk/typescript/src/${method.file}`
      : `sdk/python/src/soulfire/${method.file}`;
  return `${repository}/blob/${sdkRevision}/${path}#L${method.line}`;
}

function extractTypescript(className: string, filename: string): Method[] {
  const source = readFileSync(
    join(sourceDir, "sdk/typescript/src", filename),
    "utf8",
  );
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = file.statements.find(
    (node): node is ts.ClassDeclaration | ts.InterfaceDeclaration =>
      (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name?.text === className,
  );
  if (!declaration)
    throw new Error(`Missing TypeScript declaration: ${className}`);

  return declaration.members.flatMap((member) => {
    if (!ts.isMethodDeclaration(member) && !ts.isMethodSignature(member))
      return [];
    const name = member.name.getText(file);
    if (
      name.startsWith("#") ||
      member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)
    )
      return [];
    const bodyStart = ts.isMethodDeclaration(member)
      ? member.body?.getStart(file)
      : undefined;
    const signature = source
      .slice(member.getStart(file), bodyStart ?? member.end)
      .replace(/\n  /gu, "\n")
      .replace(/\s*\{\s*$/u, "")
      .replace(/;$/u, "")
      .trim();
    return [
      {
        name,
        signature,
        file: filename,
        line:
          file.getLineAndCharacterOfPosition(member.getStart(file)).line + 1,
      },
    ];
  });
}

function section(
  language: "typescript" | "python",
  groups: readonly {
    title: string;
    description: string;
    classes: readonly {
      name: string;
      file?: string;
      methods: readonly string[];
    }[];
  }[],
  getMethods: (name: string, file?: string) => Method[],
) {
  return groups
    .map((group) => {
      const classes = group.classes.map((cls) => {
        const available = getMethods(cls.name, cls.file);
        const methods = cls.methods.map((name) => {
          const method = available.find((item) => item.name === name);
          if (!method)
            throw new Error(`Missing ${language} method: ${cls.name}.${name}`);
          return `#### ${name} [!toc]\n\n\`\`\`${language === "typescript" ? "ts" : "python"}\n${method.signature}\n\`\`\`\n\n[Source](${sourceLink(language, method)})`;
        });
        return `### ${cls.name}\n\n${methods.join("\n\n")}`;
      });
      return `## ${group.title}\n\n${group.description}\n\n${classes.join("\n\n")}`;
    })
    .join("\n\n");
}

buildSdk(sourceDir);
const python = JSON.parse(
  execFileSync("python3.14", ["scripts/extract-sdk-python-api.py", sourceDir], {
    encoding: "utf8",
  }),
) as Record<string, Method[]>;
const intro = `Generated from the [SoulFire SDK source](${repository}/tree/${sdkRevision}). Each signature links to the same source revision.\n\n`;
writeFileSync(
  join(outputDir, "typescript.mdx"),
  `---\ntitle: TypeScript API\ndescription: Core TypeScript SDK operations and stream signatures.\nicon: Code\n---\n\n${intro}The \`SoulFire\` factory connects a scoped \`SoulFireClient\`. Network operations return Effect values or streams. See [TypeScript setup](/docs/sdk/typescript) for connection and layer examples.\n\n${section("typescript", typescriptGroups, (name, file) => extractTypescript(name, file!))}\n`,
);
writeFileSync(
  join(outputDir, "python.mdx"),
  `---\ntitle: Python API\ndescription: Core Python SDK operations and stream signatures.\nicon: Code\n---\n\n${intro}Methods decorated with \`@fn\` return effects. Their source signatures use \`EffectGen\` for the generator body. Compose operations with \`yield from\` inside a scoped workflow. See [Python setup](/docs/sdk/python) for runtime and stream examples.\n\n${section("python", pythonGroups, (name) => python[name] ?? [])}\n`,
);

const entry = join(sourceDir, "sdk/typescript/dist/index.d.ts");
const program = ts.createProgram([entry], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(entry)!);
if (!moduleSymbol) throw new Error("Missing SDK module");
const exports = checker.getExportsOfModule(moduleSymbol);
const optionTypes = [
  "SoulFireOptions",
  "BotSessionOptions",
  "TaskStartOptions",
  "CollectBlocksTaskOptions",
  "FollowEntityTaskOptions",
];
const tables = optionTypes.map((name) => {
  const symbol = exports.find((item) => item.name === name);
  if (!symbol) throw new Error(`Missing SDK option type: ${name}`);
  const resolved = checker.getAliasedSymbol(symbol);
  const type = checker.getDeclaredTypeOfSymbol(resolved);
  const rows = checker.getPropertiesOfType(type).map((property) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (!declaration)
      throw new Error(`Missing declaration: ${name}.${property.name}`);
    const propertyType = (
      ts.isPropertySignature(declaration) && declaration.type
        ? declaration.type.getText()
        : checker.typeToString(
            checker.getTypeOfSymbolAtLocation(property, declaration),
            undefined,
            ts.TypeFormatFlags.NoTruncation,
          )
    )
      .replace(/\s+/gu, " ")
      .replace(/\|/gu, "\\|");
    const description = ts
      .displayPartsToString(property.getDocumentationComment(checker))
      .replace(/\s+/gu, " ")
      .replace(/\|/gu, "\\|");
    const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
    return `| \`${property.name}\` | \`${propertyType}\` | ${optional ? "No" : "Yes"} | ${description} |`;
  });
  return `## ${name}\n\n| Field | Type | Required | Description |\n| --- | --- | --- | --- |\n${rows.join("\n")}`;
});
writeFileSync(
  join(outputDir, "types.mdx"),
  `---\ntitle: TypeScript options\ndescription: Connection, session, and task options from the SDK source.\nicon: Braces\n---\n\n${intro}These tables include inherited fields. Path options use the generated \`PathfindOptionsSchema\` contract. See [pathfinding](/docs/sdk/pathfinding) for search modes and safety limits.\n\n${tables.join("\n\n")}\n`,
);
