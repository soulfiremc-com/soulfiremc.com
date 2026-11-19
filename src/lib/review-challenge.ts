import { Schema, Effect } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ReviewChallengeError extends Schema.TaggedError<
  ReviewChallengeError,
  { readonly brand: unique symbol }
>()("ReviewChallengeError", {
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Unknown),
}) {}

type ChallengeWidget = { reset(): void; execute(): void };
type PendingChallenge = {
  resume: (result: Effect.Effect<string, ReviewChallengeError>) => void;
};

export function createReviewChallenge(timeoutMs = 20_000) {
  let pending: PendingChallenge | null = null;

  function resolve(token: string) {
    const challenge = pending;
    pending = null;
    challenge?.resume(Effect.succeed(token));
  }

  function reject(message: string, cause?: unknown) {
    const challenge = pending;
    pending = null;
    challenge?.resume(
      Effect.fail(ReviewChallengeError.make({ message, cause })),
    );
  }

  const execute = Effect.fn("reviewChallenge")(function* (
    widget: ChallengeWidget,
  ) {
    if (pending) {
      return yield* ReviewChallengeError.make({
        message: "Cloudflare Turnstile is already verifying another request.",
      });
    }

    return yield* Effect.callback<string, ReviewChallengeError>((resume) => {
      const challenge = { resume };
      pending = challenge;
      try {
        widget.reset();
        widget.execute();
      } catch (cause) {
        reject("Cloudflare Turnstile failed to start verification.", cause);
      }

      // Runs on completion, timeout, and interruption. A finished challenge
      // cannot clear a newer challenge's callback.
      return Effect.sync(() => {
        if (pending === challenge) pending = null;
      });
    }).pipe(
      Effect.timeoutOrElse({
        duration: timeoutMs,
        orElse: () =>
          Effect.fail(
            ReviewChallengeError.make({
              message: "Cloudflare Turnstile timed out. Please try again.",
            }),
          ),
      }),
    );
  });

  return { execute, resolve, reject };
}
