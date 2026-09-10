#!/usr/bin/env bun
import { mkdir, open, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SQL } from "bun";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  account,
  jwks,
  passkey,
  rateLimit,
  session,
  twoFactor,
  user,
  verification,
} from "../src/lib/db/auth-schema";
import { review, reviewItemOwner, reviewReply } from "../src/lib/db/schema";
import { quoteIdentifier, sqlLiteral } from "./lib/d1-export";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("Set DATABASE_URL to the source Postgres database.");
const output = resolve(process.argv[2] ?? ".local/postgres-to-d1.sql");
await mkdir(dirname(output), { recursive: true, mode: 0o700 });
const file = await open(output, "wx", 0o600);
let source: SQL | undefined;
const counts: Record<string, number> = {};
try {
  source = new SQL(connectionString);
  await source.begin(
    "isolation level repeatable read read only",
    async (transaction) => {
      // Fail if the source role cannot read all rows, instead of exporting a subset.
      await transaction.unsafe("SET LOCAL row_security = off");
      for (const table of [
        user,
        account,
        session,
        verification,
        twoFactor,
        passkey,
        jwks,
        rateLimit,
        review,
        reviewItemOwner,
        reviewReply,
      ]) {
        const { name, columns } = getTableConfig(table);
        const names = columns.map((column) => quoteIdentifier(column.name));
        const selection = columns.map((column) => {
          const identifier = quoteIdentifier(column.name);
          // The source schema stores UTC timestamps without a time zone. D1's
          // timestamp_ms columns store Unix milliseconds, including nullable dates.
          return column.dataType === "date"
            ? `floor(extract(epoch FROM ${identifier} AT TIME ZONE 'UTC') * 1000)::double precision AS ${identifier}`
            : identifier;
        });
        const cursor = quoteIdentifier("d1_export");
        await transaction.unsafe(
          `DECLARE ${cursor} NO SCROLL CURSOR FOR SELECT ${selection.join(", ")} FROM ${quoteIdentifier(name)}`,
        );
        counts[name] = 0;
        while (true) {
          const rows = await transaction.unsafe(
            `FETCH FORWARD 250 FROM ${cursor}`,
          );
          if (rows.length === 0) break;
          for (const row of rows) {
            const values = columns.map((column) =>
              sqlLiteral(row[column.name]),
            );
            const statement = `INSERT INTO ${quoteIdentifier(name)} (${names.join(", ")}) VALUES (${values.join(", ")});\n`;
            await file.write(statement);
            counts[name]++;
          }
        }
        await transaction.unsafe(`CLOSE ${cursor}`);
      }
    },
  );
  await file.close();
  console.log(`Exported records to ${output}`);
  console.table(counts);
} catch {
  await file.close();
  await unlink(output);
  // Database errors can contain SQL values or credentials. Keep them out of logs.
  throw new Error(
    "Postgres export failed. The incomplete output was removed. Check the source connection, schema, and read permissions.",
  );
} finally {
  await source?.close();
}
