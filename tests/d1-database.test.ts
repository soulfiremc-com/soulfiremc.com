import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { jwt, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { Miniflare } from "miniflare";
import { db, dbSchema, reviewDb, runWithD1Database } from "../src/lib/db";
import { user, verification } from "../src/lib/db/auth-schema";
import {
  createReviewSession,
  setReviewBookmark,
} from "../src/lib/db/replication";
import { review } from "../src/lib/db/schema";
import {
  getReviewSummaries,
  getUserReviews,
  getWrittenReviews,
  updateReviewCommentStatus,
} from "../src/lib/reviews";

test("D1 supports auth, review queries, constraints, and request isolation", async (t) => {
  const runtime = new Miniflare({
    workers: [
      {
        config: {
          name: "d1-test",
          type: "worker",
          compatibilityDate: "2026-04-13",
          manifest: {
            mainModule: "worker.js",
            modules: {
              "worker.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response(); } }",
              },
            },
          },
          env: {
            DB: { type: "d1", id: "test-db" },
            OTHER_DB: { type: "d1", id: "other-db" },
          },
        },
      },
    ],
  });
  try {
    const binding = await runtime.getD1Database("DB");
    const otherBinding = await runtime.getD1Database("OTHER_DB");
    const migrations = await readdir(
      new URL("../drizzle-d1/", import.meta.url),
    );
    for (const name of migrations
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(
        new URL(`../drizzle-d1/${name}`, import.meta.url),
        "utf8",
      );
      const statements = sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const database of [binding, otherBinding]) {
        await database.batch(
          statements.map((statement) => database.prepare(statement)),
        );
      }
    }
    const session = binding.withSession("first-primary");
    await runWithD1Database(binding, session, async () => {
      const auth = betterAuth({
        baseURL: "http://localhost:3000",
        secret: "d1-integration-test-secret-at-least-32-characters",
        database: drizzleAdapter(db, {
          provider: "sqlite",
          schema: dbSchema,
          transaction: false,
        }),
        advanced: { database: { generateId: "uuid", joins: true } },
        emailAndPassword: { enabled: true },
        plugins: [jwt(), twoFactor(), passkey()],
      });
      const email = `${crypto.randomUUID()}@example.com`;
      const password = crypto.randomUUID();
      const created = await auth.api.signUpEmail({
        body: { email, password, name: "D1 user" },
      });
      const userId = created.user.id;

      await t.test(
        "auth creates and reads dates, booleans, and joined sessions",
        async () => {
          const signedIn = await auth.api.signInEmail({
            body: { email, password },
            asResponse: true,
          });
          assert.equal(signedIn.status, 200);
          const cookie = signedIn.headers
            .getSetCookie()
            .map((value) => value.split(";")[0])
            .join("; ");
          const headers = new Headers({ cookie });
          const current = await auth.api.getSession({ headers });
          assert.equal(current?.user.id, userId);
          assert.equal(current?.user.emailVerified, false);
          assert.ok(current?.session.expiresAt instanceof Date);
          await auth.api.signOut({ headers });
          assert.equal(await auth.api.getSession({ headers }), null);
        },
      );

      await t.test(
        "JWT keys and two-factor secrets persist through the SQLite adapter",
        async () => {
          const keys = await auth.api.getJwks();
          assert.ok(keys.keys.length > 0);
          const signedIn = await auth.api.signInEmail({
            body: { email, password },
            asResponse: true,
          });
          const headers = new Headers({
            cookie: signedIn.headers
              .getSetCookie()
              .map((value) => value.split(";")[0])
              .join("; "),
          });
          const enabled = await auth.api.enableTwoFactor({
            headers,
            body: { password },
          });
          assert.ok(enabled.method === "totp");
          assert.ok(enabled.backupCodes.length > 0);
          const factor = await db.query.twoFactor.findFirst({
            where: eq(dbSchema.twoFactor.userId, userId),
          });
          assert.equal(factor?.verified, false);
          assert.equal(factor?.failedVerificationCount, 0);
          await auth.api.disableTwoFactor({ headers, body: { password } });
          assert.equal(
            await db.query.twoFactor.findFirst({
              where: eq(dbSchema.twoFactor.userId, userId),
            }),
            undefined,
          );
        },
      );

      await t.test("verification consumption is atomic", async () => {
        const context = await auth.$context;
        const identifier = crypto.randomUUID();
        const value = crypto.randomUUID();
        await context.internalAdapter.createVerificationValue({
          identifier,
          value,
          expiresAt: new Date(Date.now() + 60_000),
        });
        const results = await Promise.all([
          context.internalAdapter.consumeVerificationValue(identifier),
          context.internalAdapter.consumeVerificationValue(identifier),
        ]);
        assert.equal(results.filter(Boolean).length, 1);
        assert.equal(results.find(Boolean)?.value, value);
        assert.equal((await db.select().from(verification)).length, 0);
      });

      await t.test(
        "reviews support 100 slugs, moderation, and database constraints",
        async () => {
          const slugs = Array.from({ length: 100 }, () => crypto.randomUUID());
          for (const [offset, slug] of slugs.entries()) {
            await reviewDb.insert(review).values({
              userId,
              itemType: "account",
              itemSlug: slug,
              rating: (offset % 5) + 1,
              body: slug,
              commentStatus: "pending",
            });
          }
          const summaries = await getReviewSummaries("account", slugs);
          assert.equal(Object.keys(summaries).length, 100);
          assert.equal(summaries[slugs[99]].reviewCount, 1);
          assert.equal(summaries[slugs[99]].averageRating, 5);
          assert.equal(
            Object.keys(await getUserReviews(userId, "account", slugs)).length,
            100,
          );
          const [entry] = await getWrittenReviews("account", slugs[0]);
          assert.equal(entry.body, null);
          assert.ok(Number.isFinite(Date.parse(entry.createdAt)));
          await updateReviewCommentStatus(entry.id, "approved");
          assert.equal(
            (await getWrittenReviews("account", slugs[0]))[0].body,
            slugs[0],
          );
          await assert.rejects(
            reviewDb
              .insert(review)
              .values({ userId, itemType: "account", itemSlug: slugs[0] }),
          );
          await assert.rejects(
            reviewDb.insert(review).values({
              userId,
              itemType: "account",
              itemSlug: crypto.randomUUID(),
              rating: 6,
            }),
          );
          await assert.rejects(
            reviewDb.insert(review).values({
              userId,
              itemType: "account",
              itemSlug: crypto.randomUUID(),
              rating: 4.5,
            }),
          );
          await db.delete(user).where(eq(user.id, userId));
          assert.equal(
            (await getReviewSummaries("account", slugs))[slugs[0]].reviewCount,
            0,
          );
        },
      );
    });

    await t.test("concurrent requests keep their own D1 binding", async () => {
      await Promise.all(
        [binding, otherBinding].map((database) =>
          runWithD1Database(database, database.withSession(), async () => {
            const id = crypto.randomUUID();
            await db
              .insert(user)
              .values({ id, name: id, email: `${id}@example.com` });
            await new Promise((resolve) => setTimeout(resolve, 5));
            const rows = await db.select().from(user);
            assert.deepEqual(
              rows.map((row) => row.id),
              [id],
            );
          }),
        ),
      );
    });
  } finally {
    await runtime.dispose();
  }
});

test("review sessions carry write bookmarks without GET responses overwriting them", () => {
  const bookmark = crypto.randomUUID();
  const constraints: (string | undefined)[] = [];
  const session = { getBookmark: () => bookmark } as D1DatabaseSession;
  const database = {
    withSession: (constraint?: string) => {
      constraints.push(constraint);
      return session;
    },
  } as D1Database;
  const write = new Request("https://soulfiremc.com/reviews", {
    method: "POST",
  });
  createReviewSession(database, write);
  assert.equal(constraints.pop(), "first-primary");
  const response = new Response();
  setReviewBookmark(write, response, session);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  const read = new Request(write.url, { headers: { cookie } });
  createReviewSession(database, read);
  assert.equal(constraints.pop(), bookmark);
  const readResponse = new Response();
  setReviewBookmark(read, readResponse, session);
  assert.equal(readResponse.headers.get("set-cookie"), null);
  createReviewSession(
    database,
    new Request(write.url, { headers: { cookie: "soulfire-d1-bookmark=%" } }),
  );
  assert.equal(constraints.pop(), "first-unconstrained");
});
