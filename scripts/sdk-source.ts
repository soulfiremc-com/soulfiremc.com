import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { sdkRelease } from "../src/lib/sdk-release";

export const sdkRepository = "https://github.com/soulfiremc-com/SoulFire";
export const sdkRevision = sdkRelease.revision;

function git(directory: string, ...args: string[]) {
  return execFileSync("git", ["-C", directory, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Returns why a directory is not a clean checkout of the revision, or
 * undefined when it is one. Untracked files such as build output are allowed.
 */
export function checkoutProblem(
  directory: string,
  revision: string,
  { requireClean = true } = {},
) {
  if (!existsSync(join(directory, ".git"))) return "it is not a Git checkout";
  let head: string;
  try {
    head = git(directory, "rev-parse", "--verify", "HEAD^{commit}");
  } catch {
    return "Git cannot read its HEAD commit";
  }
  if (head !== revision) return `it is at ${head}, not ${revision}`;
  if (!requireClean) return undefined;
  try {
    if (git(directory, "status", "--porcelain", "--untracked-files=no"))
      return "its tracked files differ from the commit";
  } catch {
    return "Git cannot read its working tree";
  }
  return undefined;
}

function clone(repository: string, revision: string, directory: string) {
  execFileSync("git", ["init", "--quiet", directory], { stdio: "inherit" });
  for (const args of [
    ["remote", "add", "origin", repository],
    ["fetch", "--quiet", "--depth", "1", "origin", revision],
    ["checkout", "--quiet", "--detach", "FETCH_HEAD"],
  ])
    execFileSync("git", ["-C", directory, ...args], { stdio: "inherit" });
}

/**
 * Returns a clean checkout of the revision in the cache directory. An invalid
 * cached checkout, such as one left by an interrupted clone, is replaced. The
 * clone happens in a sibling directory and moves into place when complete.
 */
export function cachedCheckout(
  directory: string,
  repository: string,
  revision: string,
) {
  const problem = checkoutProblem(directory, revision);
  if (problem === undefined) return directory;
  if (existsSync(directory)) {
    process.stderr.write(
      `Replacing the cached SoulFire source in ${directory}: ${problem}.\n`,
    );
    rmSync(directory, { recursive: true, force: true });
  }
  mkdirSync(dirname(directory), { recursive: true });
  const staging = `${directory}.partial-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  try {
    clone(repository, revision, staging);
    const cloned = checkoutProblem(staging, revision);
    if (cloned !== undefined)
      throw new Error(`Cloned SoulFire source is invalid: ${cloned}`);
    renameSync(staging, directory);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return directory;
}

/**
 * Returns the SoulFire source at the pinned revision. SOULFIRE_SDK_SOURCE
 * selects your own checkout, which must already be at that revision. Without
 * it, the source is cached in the system temporary directory.
 */
export function sdkSource() {
  const configured = process.env["SOULFIRE_SDK_SOURCE"];
  if (configured === undefined || configured === "")
    return cachedCheckout(
      join(tmpdir(), "soulfire-docs-sdk", sdkRevision),
      sdkRepository,
      sdkRevision,
    );
  const directory = resolve(configured);
  const problem = checkoutProblem(directory, sdkRevision, {
    requireClean: false,
  });
  if (problem !== undefined)
    throw new Error(
      `SOULFIRE_SDK_SOURCE (${directory}) cannot be used: ${problem}.`,
    );
  return directory;
}

export function buildSdk(directory: string) {
  execFileSync("bun", ["install", "--frozen-lockfile"], {
    cwd: directory,
    stdio: "inherit",
  });
  execFileSync("bun", ["run", "build"], {
    cwd: join(directory, "sdk/typescript"),
    stdio: "inherit",
  });
}
