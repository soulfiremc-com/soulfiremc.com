import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SdkRelease } from "../src/lib/sdk-release";
import { printError, printLine } from "./lib/output";

/**
 * Point the SDK docs at the latest published SoulFire release.
 *
 * Builds run this before generating docs output, so examples, install
 * commands, and the node reference follow new releases without manual pins.
 * Set SOULFIRE_SDK_VERSION to choose a release. Without network access the
 * committed release stays in use.
 */
const releaseFile = resolve("src/lib/sdk-release.json");
const repository = "https://github.com/soulfiremc-com/SoulFire";
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the release file is written by this script with this shape
const current = JSON.parse(readFileSync(releaseFile, "utf8")) as SdkRelease;

async function latestSdkVersion() {
  const response = await fetch(
    "https://registry.npmjs.org/-/package/@soulfiremc/sdk/dist-tags",
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) throw new Error(`npm registry returned ${response.status}`);
  const tags = await response.json<{ latest?: unknown }>();
  if (typeof tags.latest !== "string" || !/^\d+\.\d+\.\d+$/u.test(tags.latest))
    throw new Error("npm registry returned no stable latest version");
  return tags.latest;
}

function tagRevision(version: string) {
  const output = execFileSync(
    "git",
    ["ls-remote", "--tags", repository, `refs/tags/${version}`],
    { encoding: "utf8", timeout: 30_000 },
  ).trim();
  const revision = output.split(/\s+/u)[0];
  if (!revision || !/^[0-9a-f]{40}$/u.test(revision))
    throw new Error(`SoulFire has no ${version} tag`);
  return revision;
}

async function minecraftVersion(revision: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/soulfiremc-com/SoulFire/${revision}/gradle.properties`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok)
    throw new Error(`gradle.properties returned ${response.status}`);
  const [, version] =
    /^minecraft_version=(\S+)$/mu.exec(await response.text()) ?? [];
  if (!version) throw new Error("gradle.properties has no minecraft_version");
  return version;
}

async function resolveRelease(): Promise<SdkRelease> {
  const version =
    process.env["SOULFIRE_SDK_VERSION"]?.trim() || (await latestSdkVersion());
  const revision = tagRevision(version);
  return {
    version,
    revision,
    minecraftVersion: await minecraftVersion(revision),
  };
}

try {
  const release = await resolveRelease();
  if (JSON.stringify(release) === JSON.stringify(current)) {
    printLine(`SoulFire SDK ${release.version} is current.`);
  } else {
    writeFileSync(releaseFile, `${JSON.stringify(release, null, 2)}\n`);
    printLine(
      `SoulFire SDK ${current.version} -> ${release.version} (${release.revision}).`,
    );
  }
} catch (error) {
  if (process.env["CI"] || process.env["SOULFIRE_SDK_VERSION"]) throw error;
  printError(
    `Could not check the latest SoulFire SDK, keeping ${current.version}:`,
    error instanceof Error ? error.message : error,
  );
}
