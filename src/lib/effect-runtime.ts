import { Cause, Effect, Exit, Option } from "effect";

const GENERIC_MESSAGE = "Request failed";

/** Typed failures own public messages. Defects can carry SQL or provider text. */
function publicMessage(cause: Cause.Cause<unknown>): string {
  const failure = Option.getOrUndefined(Cause.findErrorOption(cause));
  return failure instanceof Error && failure.message
    ? failure.message
    : GENERIC_MESSAGE;
}

/** Run at framework, HTTP, or SDK callbacks; compose Effects inside services. */
export async function runWebsiteEffect<A, E>(
  program: Effect.Effect<A, E>,
  signal?: AbortSignal,
): Promise<A> {
  const exit = await Effect.runPromiseExit(
    program.pipe(
      // The thrown error drops causes, so keep them in the Worker logs.
      Effect.tapCause((cause) =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Effect.logError("Website effect failed", cause),
      ),
    ),
    { signal },
  );
  if (Exit.isSuccess(exit)) return exit.value;
  signal?.throwIfAborted();
  // Framework serializers copy Error properties, including private cause trees.
  throw new Error(publicMessage(exit.cause));
}
