import type { ReviewDatabase } from "../src/lib/review-database";
import { reviewDatabaseLayer } from "../src/lib/review-database";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { defined } from "./support/defined";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { jwt, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { Miniflare } from "miniflare";
import { db, dbSchema, reviewDb, runWithD1Database } from "../src/lib/db";
import { user, verification } from "../src/lib/db/auth-schema";
import {
  createRequestSessions,
  setReviewBookmark,
} from "../src/lib/db/replication";
import { review } from "../src/lib/db/schema";
import { reviewStore } from "../src/lib/review-store";
import {
  deleteReview,
  getPendingComments,
  getReviews,
  moderateReview,
  removeReview,
  ReviewSession,
  ReviewStore,
  ReviewVerification,
  submitReview,
} from "../src/lib/review-workflows";
import {
  getReviewSummaries,
  getUserReviews,
  getWrittenReviews,
  updateReviewCommentStatus,
} from "../src/lib/reviews";

const runQuery = <A, E>(program: Effect.Effect<A, E, ReviewDatabase>) =>
  Effect.runPromise(program.pipe(Effect.provide(reviewDatabaseLayer)));

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
      .filter((file) => file.endsWith(".sql"))
      .toSorted()) {
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
    const sessions = { primary: session, reviews: session };
    await runWithD1Database(sessions, async () => {
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
      // An established account, so its ratings count without a hold.
      const admin = { id: userId, role: "admin", createdAt: new Date(0) };

      const run = <A, E>(
        program: Effect.Effect<
          A,
          E,
          ReviewSession | ReviewStore | ReviewVerification
        >,
      ) =>
        Effect.runPromise(
          program.pipe(
            Effect.provideService(ReviewStore, reviewStore),
            Effect.provideService(ReviewSession, {
              currentUser: Effect.succeed(admin),
              freshUser: Effect.succeed(admin),
            }),
            Effect.provideService(ReviewVerification, {
              verify: Effect.void,
            }),
          ),
        );

      await t.test(
        "Effect review workflows persist, moderate, edit, and delete through D1",
        async () => {
          const slug = crypto.randomUUID();
          const input = {
            itemType: "account",
            itemSlug: slug,
            rating: 5,
            body: "Useful service",
            invited: false,
          } as const;
          assert.deepEqual(await run(submitReview(input)), {
            ok: true,
            ratingStatus: "approved",
          });
          let result = await run(
            getReviews({
              itemType: "account",
              slugs: [slug],
              includeWrittenReviews: true,
              reviewsPage: 1,
            }),
          );
          assert.equal(defined(result.summaries[slug]).reviewCount, 1);
          assert.equal(
            defined(result.userReviews[slug]).commentStatus,
            "pending",
          );
          const entry = result.writtenReviews?.entries[0];
          assert.ok(entry);
          assert.equal(entry.body, null);
          assert.equal(entry.invited, false);
          assert.deepEqual(
            await run(
              moderateReview({
                reviewId: entry.id,
                commentStatus: "approved",
                body: "Edited before moderation",
              }),
            ),
            { ok: false, error: "stale" },
          );
          assert.deepEqual(
            await run(
              moderateReview({
                reviewId: entry.id,
                commentStatus: "approved",
                body: input.body,
              }),
            ),
            { ok: true },
          );
          await run(submitReview({ ...input, rating: 4, invited: true }));
          // A later edit without the review link keeps the invited label.
          await run(submitReview({ ...input, rating: 4 }));
          // So does an insert that races into the existing row.
          await run(
            reviewStore.create({
              userId,
              itemType: "account",
              itemSlug: slug,
              rating: 4,
              body: input.body,
              commentStatus: "approved",
              ratingStatus: "approved",
              invited: false,
            }),
          );
          result = await run(
            getReviews({
              itemType: "account",
              slugs: [slug],
              includeWrittenReviews: true,
              reviewsPage: 1,
            }),
          );
          assert.equal(
            defined(result.writtenReviews?.entries[0]).body,
            "Useful service",
          );
          assert.equal(defined(result.summaries[slug]).averageRating, 4);
          assert.equal(
            defined(result.writtenReviews?.entries[0]).invited,
            true,
          );
          await run(deleteReview(input));
          assert.equal(
            defined(
              (await runQuery(getReviewSummaries("account", [slug])))[slug],
            ).reviewCount,
            0,
          );
        },
      );

      await t.test(
        "new-account holds, bans, and admin removal control what counts",
        async () => {
          const authorId = crypto.randomUUID();
          await db.insert(user).values({
            id: authorId,
            name: "New author",
            email: `${authorId}@example.com`,
          });
          const author = { id: authorId, role: "user", createdAt: new Date() };
          const runAuthor = <A, E>(
            program: Effect.Effect<
              A,
              E,
              ReviewSession | ReviewStore | ReviewVerification
            >,
          ) =>
            Effect.runPromise(
              program.pipe(
                Effect.provideService(ReviewStore, reviewStore),
                Effect.provideService(ReviewSession, {
                  currentUser: Effect.succeed(author),
                  freshUser: Effect.succeed(author),
                }),
                Effect.provideService(ReviewVerification, {
                  verify: Effect.void,
                }),
              ),
            );
          const slug = crypto.randomUUID();
          const counted = async () =>
            defined(
              (await runQuery(getReviewSummaries("account", [slug])))[slug],
            ).reviewCount;

          assert.deepEqual(
            await runAuthor(
              submitReview({
                itemType: "account",
                itemSlug: slug,
                rating: 1,
                body: null,
                invited: false,
              }),
            ),
            { ok: true, ratingStatus: "pending" },
          );
          assert.equal(await counted(), 0);
          assert.equal(
            (await runQuery(getWrittenReviews("account", slug))).length,
            0,
          );
          assert.equal(
            defined(
              (await runQuery(getUserReviews(authorId, "account", [slug])))[
                slug
              ],
            ).ratingStatus,
            "pending",
          );
          const queue = await run(getPendingComments);
          assert.ok(queue.ok);
          const queued = queue.comments.find(
            (comment) => comment.itemSlug === slug,
          );
          assert.ok(queued);
          assert.equal(queued.ratingHeld, true);
          assert.equal(queued.body, null);
          // A held rating is approved or removed, never only rejected.
          assert.deepEqual(
            await run(
              moderateReview({
                reviewId: queued.id,
                commentStatus: "rejected",
                body: "",
              }),
            ),
            { ok: false, error: "stale" },
          );
          assert.deepEqual(
            await run(
              moderateReview({
                reviewId: queued.id,
                commentStatus: "approved",
                body: "",
              }),
            ),
            { ok: true },
          );
          assert.equal(await counted(), 1);

          await db
            .update(user)
            .set({ banned: true })
            .where(eq(user.id, authorId));
          assert.equal(await counted(), 0);
          assert.equal(
            (await runQuery(getWrittenReviews("account", slug))).length,
            0,
          );
          await db
            .update(user)
            .set({ banExpires: new Date(Date.now() + 60_000) })
            .where(eq(user.id, authorId));
          assert.equal(await counted(), 0);
          // Better Auth clears an expired ban only at the next sign-in.
          await db
            .update(user)
            .set({ banExpires: new Date(Date.now() - 60_000) })
            .where(eq(user.id, authorId));
          assert.equal(await counted(), 1);

          assert.deepEqual(await run(removeReview({ reviewId: queued.id })), {
            ok: true,
          });
          assert.equal(await counted(), 0);
          await db.delete(user).where(eq(user.id, authorId));
        },
      );

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
          assert.equal(current.user.emailVerified, false);
          assert.ok(current.session.expiresAt instanceof Date);
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
          assert.equal(factor.failedVerificationCount, 0);
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
          const summaries = await runQuery(
            getReviewSummaries("account", slugs),
          );
          assert.equal(Object.keys(summaries).length, 100);
          const last = defined(summaries[defined(slugs[99])]);
          assert.equal(last.reviewCount, 1);
          assert.equal(last.averageRating, 5);
          assert.equal(
            Object.keys(
              await runQuery(getUserReviews(userId, "account", slugs)),
            ).length,
            100,
          );
          const firstSlug = defined(slugs[0]);
          const [entry] = await runQuery(
            getWrittenReviews("account", firstSlug),
          );
          assert.ok(entry);
          assert.equal(entry.body, null);
          assert.ok(Number.isFinite(Date.parse(entry.createdAt)));
          assert.equal(
            await runQuery(
              updateReviewCommentStatus(entry.id, "approved", firstSlug),
            ),
            true,
          );
          assert.equal(
            defined(
              (await runQuery(getWrittenReviews("account", firstSlug)))[0],
            ).body,
            firstSlug,
          );
          await assert.rejects(
            reviewDb
              .insert(review)
              .values({ userId, itemType: "account", itemSlug: firstSlug }),
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
            defined(
              (await runQuery(getReviewSummaries("account", slugs)))[firstSlug],
            ).reviewCount,
            0,
          );
        },
      );
    });

    await t.test("concurrent requests keep their own D1 binding", async () => {
      await Promise.all(
        [binding, otherBinding].map((database) =>
          runWithD1Database(createSessions(database), async () => {
            const id = crypto.randomUUID();
            await db
              .insert(user)
              .values({ id, name: id, email: `${id}@example.com` });
            await new Promise((resolve) => {
              setTimeout(resolve, 5);
            });
            const slug = crypto.randomUUID();
            await Effect.runPromise(
              Effect.gen(function* () {
                // Force Effect to resume on its scheduler across concurrent
                // request contexts before resolving the lazy database proxy.
                yield* Effect.sleep("5 millis");
                yield* reviewStore.create({
                  userId: id,
                  itemType: "account",
                  itemSlug: slug,
                  rating: 5,
                  body: null,
                  commentStatus: "approved",
                  ratingStatus: "approved",
                  invited: false,
                });
                const entry = yield* reviewStore.find(id, "account", slug);
                assert.ok(entry);
                yield* reviewStore.delete(id, "account", slug);
              }),
            );
            const rows = await db.select().from(user);
            assert.deepEqual(
              rows.map((row) => row.id),
              [id],
            );
          }),
        ),
      );
    });

    await t.test(
      "a write request bookmarks auth writes for later review reads",
      async () => {
        const write = new Request("https://soulfiremc.com/settings", {
          method: "POST",
        });
        const writeSessions = createRequestSessions(binding, write);
        const id = crypto.randomUUID();
        await runWithD1Database(writeSessions, async () => {
          await db
            .insert(user)
            .values({ id, name: id, email: `${id}@example.com` });
        });
        const response = new Response();
        setReviewBookmark(write, response, writeSessions.reviews);
        assert.match(
          response.headers.get("set-cookie") ?? "",
          /^soulfire-d1-bookmark=/u,
        );
      },
    );
  } finally {
    await runtime.dispose();
  }
});

function createSessions(database: D1Database) {
  return {
    primary: database.withSession("first-primary"),
    reviews: database.withSession(),
  };
}

test("review sessions carry write bookmarks without GET responses overwriting them", () => {
  const bookmark = crypto.randomUUID();
  const constraints: (string | undefined)[] = [];
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
  const session = { getBookmark: () => bookmark } as D1DatabaseSession;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
  const database = {
    withSession: (constraint?: string) => {
      constraints.push(constraint);
      return session;
    },
  } as D1Database;
  const write = new Request("https://soulfiremc.com/reviews", {
    method: "POST",
  });
  createRequestSessions(database, write);
  assert.deepEqual(constraints.splice(0), ["first-primary"]);
  const response = new Response();
  setReviewBookmark(write, response, session);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  const read = new Request(write.url, { headers: { cookie } });
  createRequestSessions(database, read);
  assert.deepEqual(constraints.splice(0), ["first-primary", bookmark]);
  const readResponse = new Response();
  setReviewBookmark(read, readResponse, session);
  assert.equal(readResponse.headers.get("set-cookie"), null);
  createRequestSessions(
    database,
    new Request(write.url, { headers: { cookie: "soulfire-d1-bookmark=%" } }),
  );
  assert.deepEqual(constraints.splice(0), [
    "first-primary",
    "first-unconstrained",
  ]);
});
