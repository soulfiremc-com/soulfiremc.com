import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";

const version = "2.10.0";
const releaseCommit = "54729483015e8c9b1b8f18f589f58de0d2219dba";
const repository = "https://github.com/soulfiremc-com/SoulFire";
const outputDir = resolve("content/docs/(main)/sdk/(reference)/api");
const temporaryDir = process.env.SOULFIRE_SDK_SOURCE
  ? undefined
  : mkdtempSync(join(tmpdir(), "soulfire-sdk-reference-"));
const sourceDir = process.env.SOULFIRE_SDK_SOURCE ?? temporaryDir!;

type Method = { name: string; signature: string; file: string; line: number };

const typescriptGroups = [
  {
    title: "Connect and select bots",
    description:
      "Use the root client to connect, select an instance, and close the connection.",
    classes: [
      {
        name: "SoulFireApi",
        file: "effect-client.ts",
        methods: ["connect", "layer"],
      },
      {
        name: "SoulFire",
        file: "promise-client.ts",
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
      "Choose the async client for services or the sync client for scripts.",
    classes: [
      {
        name: "AsyncSoulFire",
        methods: ["connect", "instance", "instances", "close"],
      },
      {
        name: "SoulFire",
        methods: ["connect", "instance", "instances", "close"],
      },
      {
        name: "AsyncSoulFireInstance",
        methods: ["bot", "bots", "events", "start", "stop"],
      },
    ],
  },
  {
    title: "Control a bot",
    description: "The sync bot exposes corresponding methods without `await`.",
    classes: [
      {
        name: "AsyncSoulFireBot",
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
        name: "AsyncSoulFireChat",
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
        name: "AsyncSoulFireTasks",
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
        name: "AsyncSoulFireTask",
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
  return `${repository}/blob/${version}/${path}#L${method.line}`;
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

try {
  const installedVersion = JSON.parse(
    readFileSync(resolve("node_modules/@soulfiremc/sdk/package.json"), "utf8"),
  ).version as string;
  if (installedVersion !== version) {
    throw new Error(
      `Expected @soulfiremc/sdk ${version}, found ${installedVersion}`,
    );
  }
  if (temporaryDir) {
    execFileSync(
      "git",
      [
        "clone",
        "--quiet",
        "--depth",
        "1",
        "--branch",
        version,
        repository,
        sourceDir,
      ],
      { stdio: "inherit" },
    );
  }
  const sourceCommit = execFileSync(
    "git",
    ["-C", sourceDir, "rev-parse", "HEAD"],
    {
      encoding: "utf8",
    },
  ).trim();
  if (sourceCommit !== releaseCommit) {
    throw new Error(
      `Expected SDK commit ${releaseCommit}, found ${sourceCommit}`,
    );
  }
  const python = JSON.parse(
    execFileSync(
      "python3.14",
      ["scripts/extract-sdk-python-api.py", sourceDir],
      { encoding: "utf8" },
    ),
  ) as Record<string, Method[]>;
  const intro = `Generated from the [SoulFire SDK ${version} release](${repository}/tree/${version}). Each signature links to its release source.\n\n`;
  writeFileSync(
    join(outputDir, "typescript.mdx"),
    `---\ntitle: TypeScript API\ndescription: Core TypeScript SDK methods and signatures from release ${version}.\nicon: Code\n---\n\n${intro}The root \`SoulFire\` export follows the \`SoulFireApi\` interface. The Promise entry point exports a \`SoulFire\` class. See [TypeScript setup](/docs/sdk/typescript) for complete connection examples.\n\n${section("typescript", typescriptGroups, (name, file) => extractTypescript(name, file!))}\n`,
  );
  writeFileSync(
    join(outputDir, "python.mdx"),
    `---\ntitle: Python API\ndescription: Core Python SDK methods and signatures from release ${version}.\nicon: Code\n---\n\n${intro}The async classes are shown below. The synchronous classes expose matching methods without \`await\`. See [Python setup](/docs/sdk/python) for complete connection examples.\n\n${section("python", pythonGroups, (name) => python[name] ?? [])}\n`,
  );
} finally {
  if (temporaryDir) rmSync(temporaryDir, { recursive: true, force: true });
}
