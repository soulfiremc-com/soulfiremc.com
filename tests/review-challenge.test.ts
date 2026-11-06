import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Exit, Fiber } from "effect";
import { createReviewChallenge } from "@/lib/review-challenge";

await test("review challenges reset and execute the widget, then resolve exactly once", async () => {
  const challenge = createReviewChallenge();
  const events: string[] = [];
  const widget = {
    reset() {
      events.push("reset");
    },
    execute() {
      events.push("execute");
    },
  };
  const pending = Effect.runPromise(challenge.execute(widget));
  assert.deepEqual(events, ["reset", "execute"]);
  challenge.resolve("token");
  challenge.resolve("ignored");
  assert.equal(await pending, "token");
  const next = Effect.runPromise(challenge.execute(widget));
  challenge.resolve("next-token");
  assert.equal(await next, "next-token");
});

await test("a second challenge cannot replace the active one", async () => {
  const challenge = createReviewChallenge();
  let calls = 0;
  const widget = {
    reset() {},
    execute() {
      calls++;
    },
  };
  const pending = Effect.runPromise(challenge.execute(widget));
  await assert.rejects(
    Effect.runPromise(challenge.execute(widget)),
    /already verifying/,
  );
  assert.equal(calls, 1);
  challenge.resolve("original-token");
  assert.equal(await pending, "original-token");
});

await test("widget errors and unmounts release the challenge without leaking to its successor", async () => {
  const challenge = createReviewChallenge();
  const cause = new Error("Widget failed to initialize");
  await assert.rejects(
    Effect.runPromise(
      challenge.execute({
        reset() {
          throw cause;
        },
        execute() {
          assert.fail();
        },
      }),
    ),
    {
      _tag: "ReviewChallengeError",
      cause,
    },
  );
  const widget = { reset() {}, execute() {} };
  const pending = Effect.runPromise(challenge.execute(widget));
  const rejection = assert.rejects(pending, /was unloaded/);
  challenge.reject("Cloudflare Turnstile was unloaded.");
  const next = Effect.runPromise(challenge.execute(widget));
  await rejection;
  challenge.resolve("next-token");
  assert.equal(await next, "next-token");
});

await test("timeouts and interruption clean up pending challenges", async () => {
  const challenge = createReviewChallenge(20);
  const widget = { reset() {}, execute() {} };
  await assert.rejects(
    Effect.runPromise(challenge.execute(widget)),
    /timed out/,
  );
  const fiber = Effect.runFork(challenge.execute(widget));
  await Effect.runPromise(Fiber.interrupt(fiber));
  assert.equal(
    Exit.isFailure(await Effect.runPromise(Fiber.await(fiber))),
    true,
  );
  const next = Effect.runPromise(challenge.execute(widget));
  challenge.resolve("after-cancellation");
  assert.equal(await next, "after-cancellation");
});

await test("widgets can complete a challenge synchronously during execution", async () => {
  const challenge = createReviewChallenge();
  const widget = {
    reset() {},
    execute() {
      challenge.resolve("immediate-token");
    },
  };
  assert.equal(
    await Effect.runPromise(challenge.execute(widget)),
    "immediate-token",
  );
  assert.equal(
    await Effect.runPromise(challenge.execute(widget)),
    "immediate-token",
  );
});
