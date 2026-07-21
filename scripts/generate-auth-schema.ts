#!/usr/bin/env tsx

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_PATH = join(process.cwd(), "src", "lib", "db", "auth-schema.ts");

async function generateAuthSchema() {
  console.log("Generating better-auth schema...");

  try {
    // Run the better-auth CLI to generate the schema
    execSync(
      "pnpm dlx @better-auth/cli@latest generate --config ./src/lib/auth.ts --output ./src/lib/db/auth-schema.ts --yes",
      {
        stdio: "inherit",
        cwd: process.cwd(),
      },
    );

    console.log("Post-processing schema to enable RLS...");

    // Read the generated file
    const content = readFileSync(OUTPUT_PATH, "utf-8");

    // Split by lines and process
    const lines = content.split("\n");
    const processedLines: string[] = [];
    let inPgTable = false;
    let parenDepth = 0;

    for (const line of lines) {
      if (line.includes("pgTable(") && !inPgTable) {
        inPgTable = true;
        parenDepth = 0;
      }

      if (inPgTable) {
        for (const char of line) {
          if (char === "(") parenDepth++;
          if (char === ")") parenDepth--;
        }

        // Check if this line ends the pgTable call
        if (parenDepth === 0 && line.includes(");")) {
          // Check if it already has .enableRLS()
          if (!line.includes(".enableRLS()")) {
            processedLines.push(line.replace(");", ").enableRLS();"));
          } else {
            processedLines.push(line);
          }
          inPgTable = false;
          continue;
        }
      }

      processedLines.push(line);
    }

    const processedContent = processedLines.join("\n");

    // Write the modified content back
    writeFileSync(OUTPUT_PATH, processedContent);

    execSync("pnpm exec biome check --write ./src/lib/db/auth-schema.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("Auth schema generated with RLS enabled!");
    console.log(`File saved to: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Failed to generate auth schema:", error);
    process.exit(1);
  }
}

generateAuthSchema().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
