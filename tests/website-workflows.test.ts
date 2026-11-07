import assert from "node:assert/strict";
import test from "node:test";
import { Deferred, Effect, Fiber } from "effect";
import { createElement } from "react";
import { SHOPS } from "../src/lib/accounts-data";
import {
  AccountProviderSources,
  loadAllAccountStock,
} from "../src/lib/account-provider-workflows";
import {
  DocumentationSource,
  documentationPageText,
  fullDocumentationText,
  type DocumentationPage,
} from "../src/lib/content-workflows";
import { authNotificationEffects } from "../src/lib/auth-notifications";
import {
  EmailDeliveryError,
  WebsiteMailer,
  makeWebsiteMailer,
  type WebsiteEmail,
} from "../src/lib/resend";
import { runWebsiteEffect } from "../src/lib/effect-runtime";
import { reviewQuery } from "../src/lib/review-database";

await test("provider aggregation bounds concurrency and preserves each provider's result", async () => {
  let active = 0;
  let maximum = 0;
  await Effect.runPromise(
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const program = loadAllAccountStock().pipe(
        Effect.provideService(AccountProviderSources, {
          stock: (shop) =>
            Effect.gen(function* () {
              active++;
              maximum = Math.max(maximum, active);
              if (active === 4) yield* Deferred.succeed(started, undefined);
              yield* Deferred.await(release);
              return { stockByCategory: { "mfa-accounts": shop.slug.length } };
            }).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  active--;
                }),
              ),
            ),
          invite: () => Effect.succeed(null),
        }),
      );
      const fiber = yield* program.pipe(Effect.forkChild);
      yield* Deferred.await(started);
      assert.equal(maximum, 4);
      yield* Deferred.succeed(release, undefined);
      const results = yield* Fiber.join(fiber);
      assert.equal(Object.keys(results).length, SHOPS.length);
      for (const shop of SHOPS)
        assert.equal(
          results[shop.slug].stockByCategory?.["mfa-accounts"],
          shop.slug.length,
        );
    }),
  );
  assert.equal(active, 0);
  assert.equal(maximum, 4);
});

await test("cancelling provider aggregation closes all in-flight child programs", async () => {
  let started = 0;
  let closed = 0;
  await Effect.runPromise(
    Effect.gen(function* () {
      const ready = yield* Deferred.make<void>();
      const fiber = yield* loadAllAccountStock().pipe(
        Effect.provideService(AccountProviderSources, {
          stock: () =>
            Effect.gen(function* () {
              if (++started === 4) yield* Deferred.succeed(ready, undefined);
              return yield* Effect.never;
            }).pipe(
              Effect.ensuring(
                Effect.sync(() => {
                  closed++;
                }),
              ),
            ),
          invite: () => Effect.succeed(null),
        }),
        Effect.forkChild,
      );
      yield* Deferred.await(ready);
      yield* Fiber.interrupt(fiber);
    }),
  );
  assert.equal(started, 4);
  assert.equal(closed, 4);
});

await test("documentation assembly preserves page order and content across bounded work", async () => {
  const pages: DocumentationPage[] = Array.from({ length: 9 }, (_, index) => ({
    slugs: [String(index)],
    url: `/docs/${index}`,
    data: {
      title: `Page ${index}`,
      description: "Description",
      getText: async () => `Body ${index}`,
    },
  }));
  const source = {
    pages: Effect.succeed(pages),
    openapi: () => Effect.succeed("API contract"),
  };
  const text = await Effect.runPromise(
    fullDocumentationText().pipe(
      Effect.provideService(DocumentationSource, source),
    ),
  );
  assert.equal(
    text,
    pages
      .map(
        (page, index) =>
          `# Page ${index}\nURL: ${page.url}\n\nDescription\n\nBody ${index}`,
      )
      .join("\n\n"),
  );
  assert.equal(
    await Effect.runPromise(
      documentationPageText({
        slugs: ["fallback"],
        url: "/docs/fallback",
        data: {},
      }).pipe(Effect.provideService(DocumentationSource, source)),
    ),
    "# fallback\nURL: /docs/fallback\n\n",
  );
  assert.equal(
    await Effect.runPromise(
      documentationPageText({
        slugs: [],
        url: "/api",
        data: { type: "openapi" },
      }).pipe(Effect.provideService(DocumentationSource, source)),
    ),
    "API contract",
  );
});

await test("documentation cancellation stops pending page work before starting more pages", async () => {
  let started = 0;
  const controller = new AbortController();
  let ready!: () => void;
  const pending = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const pages = Array.from({ length: 10 }, (_, index): DocumentationPage => ({
    slugs: [String(index)],
    url: `/docs/${index}`,
    data: {
      getText: () => {
        if (++started === 4) ready();
        return new Promise(() => undefined);
      },
    },
  }));
  const result = Effect.runPromiseExit(
    fullDocumentationText().pipe(
      Effect.provideService(DocumentationSource, {
        pages: Effect.succeed(pages),
        openapi: () => Effect.succeed(""),
      }),
    ),
    { signal: controller.signal },
  );
  await pending;
  controller.abort();
  await result;
  assert.equal(started, 4);
});

await test("authentication email programs keep destination, subject, tokens and expiry contracts", async () => {
  const messages: WebsiteEmail[] = [];
  const user = { id: "user", email: "current@example.com" };
  await Effect.runPromise(
    Effect.gen(function* () {
      yield* authNotificationEffects.sendChangeEmailConfirmation({
        user,
        newEmail: "new@example.com",
        url: "https://example.com/confirm?token=private",
      });
      yield* authNotificationEffects.sendEmailOTP({
        email: user.email,
        otp: "123456",
        type: "sign-in",
      });
    }).pipe(
      Effect.provideService(WebsiteMailer, {
        send: (email) =>
          Effect.sync(() => {
            messages.push(email);
          }),
      }),
    ),
  );
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, "current@example.com");
  assert.equal(messages[0].subject, "Approve your email change for SoulFire");
  assert.deepEqual(messages[0].react.props, {
    appName: "SoulFire",
    currentEmail: user.email,
    expirationMinutes: 60,
    logoURL: "https://soulfiremc.com/logo-square.png",
    newEmail: "new@example.com",
    url: "https://example.com/confirm?token=private",
  });
  assert.equal(messages[1].subject, "Your sign-in code for SoulFire");
  assert.equal(
    (messages[1].react.props as { verificationCode: string }).verificationCode,
    "123456",
  );
  assert.equal(
    (messages[1].react.props as { expirationMinutes: number })
      .expirationMinutes,
    5,
  );
});

await test("email submission is never retried and finishes before cancellation returns", async () => {
  let calls = 0;
  let complete!: () => void;
  let began!: () => void;
  const pending = new Promise<{ data: null; error: null }>((resolve) => {
    complete = () => resolve({ data: null, error: null });
  });
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  const mailer = makeWebsiteMailer(() => {
    calls++;
    began();
    return pending;
  });
  const controller = new AbortController();
  let settled = false;
  const result = Effect.runPromiseExit(
    mailer.send({
      from: "from",
      to: "to",
      replyTo: "reply",
      subject: "subject",
      react: createElement("div", null, "Message"),
    }),
    { signal: controller.signal },
  ).then(() => {
    settled = true;
  });
  await started;
  controller.abort();
  await Promise.resolve();
  assert.equal(settled, false);
  complete();
  await result;
  assert.equal(calls, 1);
});

await test("public failures preserve messages while excluding provider credentials and typed fields", async () => {
  const internal = new EmailDeliveryError({
    reason: "transport",
    cause: new Error("private API key"),
  });
  await assert.rejects(runWebsiteEffect(Effect.fail(internal)), (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, "Failed to send email");
    assert.equal(
      JSON.stringify(Object.getOwnPropertyDescriptors(error)).includes(
        "private API key",
      ),
      false,
    );
    assert.equal(structuredClone(error).cause, undefined);
    return true;
  });
  assert.ok(internal.cause instanceof Error);
});

await test("an executing review statement settles before cancellation returns", async () => {
  let began!: () => void;
  let finish!: () => void;
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const controller = new AbortController();
  let settled = false;
  const result = Effect.runPromiseExit(
    reviewQuery("publish-review", () => {
      began();
      return pending;
    }),
    { signal: controller.signal },
  ).then(() => {
    settled = true;
  });
  await started;
  controller.abort();
  await Promise.resolve();
  assert.equal(settled, false);
  finish();
  await result;
  assert.equal(settled, true);
});

await test("email rejection and lost acknowledgements produce one submission each", async () => {
  let calls = 0;
  const mailer = makeWebsiteMailer(async () => {
    if (++calls === 1) return { error: { message: "private provider body" } };
    throw new Error("lost acknowledgement");
  });
  const message: WebsiteEmail = {
    from: "from",
    to: "to",
    replyTo: "reply",
    subject: "subject",
    react: createElement("div", null, "Message"),
  };
  await assert.rejects(Effect.runPromise(mailer.send(message)), {
    reason: "rejected",
  });
  assert.equal(calls, 1);
  await assert.rejects(Effect.runPromise(mailer.send(message)), {
    reason: "transport",
  });
  assert.equal(calls, 2);
});
