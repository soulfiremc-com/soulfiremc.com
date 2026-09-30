import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

export const sdkRepository = "https://github.com/soulfiremc-com/SoulFire";
export const sdkRevision = "213ec6322325e94c8068c079344b66f8158628e2";

export function sdkSource() {
  const directory = resolve(
    process.env.SOULFIRE_SDK_SOURCE ??
      join(tmpdir(), "soulfire-docs-sdk", sdkRevision),
  );
  if (!existsSync(join(directory, ".git"))) {
    mkdirSync(dirname(directory), { recursive: true });
    execFileSync(
      "git",
      [
        "clone",
        "--quiet",
        "--no-checkout",
        "--depth",
        "1",
        sdkRepository,
        directory,
      ],
      {
        stdio: "inherit",
      },
    );
    execFileSync(
      "git",
      [
        "-C",
        directory,
        "fetch",
        "--quiet",
        "--depth",
        "1",
        "origin",
        sdkRevision,
      ],
      { stdio: "inherit" },
    );
    execFileSync(
      "git",
      ["-C", directory, "checkout", "--quiet", "--detach", sdkRevision],
      {
        stdio: "inherit",
      },
    );
  }
  const revision = execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (revision !== sdkRevision) {
    throw new Error(`Expected SDK source ${sdkRevision}, found ${revision}`);
  }
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
