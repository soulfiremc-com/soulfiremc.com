#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";

execFileSync(
  "bunx",
  [
    "auth@1.7.3",
    "generate",
    "--config",
    "./src/lib/auth.ts",
    "--output",
    "./src/lib/db/auth-schema.ts",
    "--yes",
  ],
  { stdio: "inherit" },
);
execFileSync(
  "bunx",
  ["biome", "check", "--write", "./src/lib/db/auth-schema.ts"],
  {
    stdio: "inherit",
  },
);
