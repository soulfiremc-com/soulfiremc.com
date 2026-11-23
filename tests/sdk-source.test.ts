import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cachedCheckout, checkoutProblem } from "../scripts/sdk-source";

function git(directory: string, ...args: string[]) {
  return execFileSync("git", ["-C", directory, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function upstream(root: string) {
  const directory = join(root, "upstream");
  execFileSync("git", ["init", "--quiet", directory]);
  writeFileSync(join(directory, "README.md"), "pinned\n");
  git(directory, "add", "README.md");
  git(
    directory,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--quiet",
    "-m",
    "Pinned revision",
  );
  return {
    url: `file://${directory}`,
    revision: git(directory, "rev-parse", "HEAD"),
  };
}

void test("cachedCheckout replaces an invalid cache with a clean checkout", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "sdk-source-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  t.mock.method(process.stderr, "write", () => true);
  const { url, revision } = upstream(root);
  const cache = join(root, "cache");

  await t.test("a directory left without Git metadata", () => {
    mkdirSync(join(cache, "build"), { recursive: true });
    assert.equal(checkoutProblem(cache, revision), "it is not a Git checkout");
    assert.equal(cachedCheckout(cache, url, revision), cache);
    assert.equal(checkoutProblem(cache, revision), undefined);
    assert.equal(existsSync(join(cache, "build")), false);
  });

  await t.test("a checkout missing tracked files", () => {
    rmSync(join(cache, "README.md"));
    assert.equal(
      checkoutProblem(cache, revision),
      "its tracked files differ from the commit",
    );
    cachedCheckout(cache, url, revision);
    assert.equal(checkoutProblem(cache, revision), undefined);
  });

  await t.test("a checkout with broken Git metadata", () => {
    rmSync(join(cache, ".git", "HEAD"));
    assert.equal(
      checkoutProblem(cache, revision),
      "Git cannot read its HEAD commit",
    );
    cachedCheckout(cache, url, revision);
    assert.equal(checkoutProblem(cache, revision), undefined);
  });

  await t.test("a valid checkout is reused with its build output", () => {
    writeFileSync(join(cache, "build-output.txt"), "kept\n");
    cachedCheckout(cache, url, revision);
    assert.equal(existsSync(join(cache, "build-output.txt")), true);
  });
});

void test("checkoutProblem reports a checkout at another revision", (t) => {
  const root = mkdtempSync(join(tmpdir(), "sdk-source-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
  });
  const { revision } = upstream(root);
  const other = "0".repeat(40);
  assert.equal(
    checkoutProblem(join(root, "upstream"), other),
    `it is at ${revision}, not ${other}`,
  );
});
