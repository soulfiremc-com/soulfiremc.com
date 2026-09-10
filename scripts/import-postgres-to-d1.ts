#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { quoteIdentifier } from "./lib/d1-export";

const snapshotPath = process.argv[2];
if (!snapshotPath) throw new Error("Pass the Postgres SQL snapshot path.");
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token)
  throw new Error("Set CLOUDFLARE_API_TOKEN with D1 Edit permission.");
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
const binding = config.d1_databases.find(
  (entry: { binding: string }) => entry.binding === "DB",
);
if (!binding?.database_id || !config.account_id) {
  throw new Error("Configure the DB binding and account_id in wrangler.jsonc.");
}
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${binding.database_id}/query`;
type Row = Record<string, string | number | null>;

async function query(sql: string, params: (string | number | null)[] = []) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  // Never log API bodies: they can contain authentication data or SQL values.
  if (!response.ok)
    throw new Error(`D1 import request failed: HTTP ${response.status}.`);
  const data = (await response.json()) as {
    success: boolean;
    result: { success: boolean; results: Row[] }[];
  };
  if (!data.success || !data.result.every((result) => result.success)) {
    throw new Error("D1 rejected an import query.");
  }
  return data.result[0].results;
}

const tables = [
  "user",
  "account",
  "session",
  "verification",
  "two_factor",
  "passkey",
  "jwks",
  "rate_limit",
  "review",
  "review_item_owner",
  "review_reply",
];
const snapshot = new Database(":memory:");
try {
  for (const file of (await readdir("drizzle-d1"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    snapshot.exec(await readFile(`drizzle-d1/${file}`, "utf8"));
  }
  snapshot.exec(await readFile(snapshotPath, "utf8"));
  if (snapshot.query("PRAGMA foreign_key_check").all().length) {
    throw new Error("The source snapshot contains invalid foreign keys.");
  }

  if (!process.argv.includes("--verify-only")) {
    // Check every table before writing anything. Never overwrite existing data.
    for (const table of tables) {
      const [row] = await query(
        `SELECT count(*) AS total FROM ${quoteIdentifier(table)}`,
      );
      if (row.total !== 0)
        throw new Error(`The target table ${table} is not empty.`);
    }
    for (const table of tables) {
      const info = snapshot
        .query(`PRAGMA table_info(${quoteIdentifier(table)})`)
        .all() as { name: string }[];
      const columns = info.map((column) => column.name);
      const rows = snapshot
        .query(`SELECT * FROM ${quoteIdentifier(table)}`)
        .all() as Row[];
      const batchSize = Math.floor(100 / columns.length);
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const placeholders = `(${columns.map(() => "?").join(", ")})`;
        await query(
          `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES ${batch.map(() => placeholders).join(", ")}`,
          batch.flatMap((row) => columns.map((column) => row[column])),
        );
      }
      console.log(`${table}: imported ${rows.length} rows`);
    }
  }

  for (const table of tables) {
    const info = snapshot
      .query(`PRAGMA table_info(${quoteIdentifier(table)})`)
      .all() as { name: string; pk: number }[];
    const columns = info.map((column) => column.name).sort();
    const order = info
      .filter((column) => column.pk)
      .sort((a, b) => a.pk - b.pk)
      .map((column) => quoteIdentifier(column.name))
      .join(", ");
    const selection = `SELECT * FROM ${quoteIdentifier(table)} ORDER BY ${order}`;
    const rows = snapshot.query(selection).all() as Row[];
    const expected = createHash("sha256");
    const actual = createHash("sha256");
    const encode = (row: Row) =>
      `${JSON.stringify(columns.map((column) => row[column]))}\n`;
    for (const row of rows) expected.update(encode(row));
    let count = 0;
    for (let offset = 0; ; offset += 100) {
      const page = await query(`${selection} LIMIT 100 OFFSET ${offset}`);
      for (const row of page) actual.update(encode(row));
      count += page.length;
      if (page.length < 100) break;
    }
    if (
      count !== rows.length ||
      expected.digest("hex") !== actual.digest("hex")
    ) {
      throw new Error(`Verification failed for ${table}.`);
    }
    console.log(`${table}: verified all columns in ${count} rows`);
  }
  if ((await query("PRAGMA foreign_key_check")).length) {
    throw new Error("The target contains invalid foreign keys.");
  }
  console.log("D1 matches the source snapshot. Foreign key checks passed.");
} finally {
  snapshot.close();
}
