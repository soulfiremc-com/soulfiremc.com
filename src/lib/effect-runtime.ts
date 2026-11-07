import { Effect } from "effect";

/** Run at framework, HTTP, or SDK callbacks; compose Effects inside services. */
export async function runWebsiteEffect<A, E>(
  program: Effect.Effect<A, E>,
  signal?: AbortSignal,
): Promise<A> {
  try {
    return await Effect.runPromise(program, { signal });
  } catch (error) {
    signal?.throwIfAborted();
    // Framework serializers copy Error properties, including private cause trees.
    throw new Error(error instanceof Error ? error.message : "Request failed");
  }
}
