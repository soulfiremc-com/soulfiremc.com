import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationFiles = [
  "../drizzle/0008_add-account-issuer.sql",
  "../drizzle/0009_backfill-account-issuer.sql",
  "../drizzle/0010_enforce-account-issuer.sql",
];

type AccountRow = {
  accessToken: string | null;
  accountId: string;
  id: string;
  idToken: string | null;
  issuer: string;
  password: string | null;
  providerId: string;
  refreshToken: string | null;
  scope: string | null;
  userId: string;
};

test("account issuer migrations backfill legacy accounts safely", async () => {
  const database = new PGlite();

  try {
    await database.exec(`
      CREATE TABLE "account" (
        "id" uuid PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" uuid NOT NULL,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "scope" text,
        "password" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      INSERT INTO "account" (
        "id",
        "account_id",
        "provider_id",
        "user_id",
        "access_token",
        "refresh_token",
        "id_token",
        "scope",
        "password"
      ) VALUES
        (
          '00000000-0000-0000-0000-000000000001',
          'legacy-credential-account-id',
          'credential',
          '10000000-0000-0000-0000-000000000001',
          NULL,
          NULL,
          NULL,
          NULL,
          'hashed-password'
        ),
        (
          '00000000-0000-0000-0000-000000000002',
          'discord-subject',
          'discord',
          '10000000-0000-0000-0000-000000000002',
          'discord-access-token',
          'discord-refresh-token',
          NULL,
          'identify,email',
          NULL
        ),
        (
          '00000000-0000-0000-0000-000000000003',
          'github-subject',
          'github',
          '10000000-0000-0000-0000-000000000003',
          'github-access-token',
          NULL,
          NULL,
          'read:user,user:email',
          NULL
        ),
        (
          '00000000-0000-0000-0000-000000000004',
          'google-subject',
          'google',
          '10000000-0000-0000-0000-000000000004',
          'google-access-token',
          'google-refresh-token',
          'google-id-token',
          'openid,email,profile',
          NULL
        );
    `);

    const authenticationDataBefore = await readAuthenticationData(database);

    for (const migrationFile of migrationFiles) {
      await applyMigration(database, migrationFile);
    }

    const accounts = await database.query<AccountRow>(`
      SELECT
        "id",
        "issuer",
        "account_id" AS "accountId",
        "provider_id" AS "providerId",
        "user_id"::text AS "userId",
        "access_token" AS "accessToken",
        "refresh_token" AS "refreshToken",
        "id_token" AS "idToken",
        "scope",
        "password"
      FROM "account"
      ORDER BY "provider_id"
    `);

    assert.deepEqual(
      accounts.rows.map(({ accountId, issuer, providerId, userId }) => ({
        accountId,
        issuer,
        providerId,
        userId,
      })),
      [
        {
          accountId: "10000000-0000-0000-0000-000000000001",
          issuer: "local:credential",
          providerId: "credential",
          userId: "10000000-0000-0000-0000-000000000001",
        },
        {
          accountId: "discord-subject",
          issuer: "local:oauth:discord",
          providerId: "discord",
          userId: "10000000-0000-0000-0000-000000000002",
        },
        {
          accountId: "github-subject",
          issuer: "local:oauth:github",
          providerId: "github",
          userId: "10000000-0000-0000-0000-000000000003",
        },
        {
          accountId: "google-subject",
          issuer: "https://accounts.google.com",
          providerId: "google",
          userId: "10000000-0000-0000-0000-000000000004",
        },
      ],
    );
    assert.deepEqual(
      await readAuthenticationData(database),
      authenticationDataBefore,
    );

    const nullIssuers = await database.query<{ count: number }>(`
      SELECT count(*)::int AS "count"
      FROM "account"
      WHERE "issuer" IS NULL
    `);
    assert.equal(nullIssuers.rows[0]?.count, 0);

    const issuerColumn = await database.query<{ isNullable: string }>(`
      SELECT "is_nullable" AS "isNullable"
      FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'account'
        AND "column_name" = 'issuer'
    `);
    assert.equal(issuerColumn.rows[0]?.isNullable, "NO");

    await assert.rejects(() =>
      database.exec(`
        INSERT INTO "account" (
          "id",
          "issuer",
          "account_id",
          "provider_id",
          "user_id"
        ) VALUES (
          '00000000-0000-0000-0000-000000000005',
          'local:oauth:discord',
          'discord-subject',
          'discord',
          '10000000-0000-0000-0000-000000000005'
        )
      `),
    );
  } finally {
    await database.close();
  }
});

async function applyMigration(
  database: PGlite,
  migrationFile: string,
): Promise<void> {
  const sql = await readFile(new URL(migrationFile, import.meta.url), "utf8");

  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmedStatement = statement.trim();
    if (trimmedStatement.length > 0) {
      await database.exec(trimmedStatement);
    }
  }
}

async function readAuthenticationData(database: PGlite) {
  const result = await database.query<
    Omit<AccountRow, "accountId" | "issuer">
  >(`
    SELECT
      "id",
      "provider_id" AS "providerId",
      "user_id"::text AS "userId",
      "access_token" AS "accessToken",
      "refresh_token" AS "refreshToken",
      "id_token" AS "idToken",
      "scope",
      "password"
    FROM "account"
    ORDER BY "provider_id"
  `);

  return result.rows;
}
