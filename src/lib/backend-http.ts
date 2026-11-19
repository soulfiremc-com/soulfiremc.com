import { Effect, Schedule, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ExternalRequestError extends Schema.TaggedError<
  ExternalRequestError,
  { readonly brand: unique symbol }
>()("ExternalRequestError", {
  url: Schema.String,
  reason: Schema.Literals(["transport", "status", "timeout", "decode"]),
  status: Schema.optionalKey(Schema.Finite),
  retryable: Schema.Boolean,
  cause: Schema.optionalKey(Schema.Unknown),
}) {}

/** The injected transport needs the fetch call signature, not runtime-specific helpers. */
export type RequestFetch = (
  ...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

export type RequestOptions = {
  init?: Omit<RequestInit, "signal">;
  timeoutMs?: number;
  retries?: number;
  maxBytes?: number;
  fetch?: RequestFetch;
};

// Register ownership before the interruptible header wait. Late responses must
// not outlive the request even when a transport ignores its AbortSignal.
function request(
  url: string,
  readBody: boolean,
  {
    init,
    timeoutMs = 5000,
    retries = 2,
    maxBytes = 8 * 1024 * 1024,
    fetch: fetcher = (input, options) => fetch(input, options),
  }: RequestOptions = {},
) {
  const method = init?.method?.toUpperCase() ?? "GET";
  const canRetry = method === "GET" || method === "HEAD";
  const failure = (cause: unknown) =>
    cause instanceof ExternalRequestError
      ? cause
      : ExternalRequestError.make({
          url,
          reason: "transport",
          retryable: true,
          cause,
        });
  return Effect.scoped(
    Effect.gen(function* () {
      const owner = yield* Effect.acquireRelease(
        Effect.sync(() => ({
          controller: new AbortController(),
          response: undefined as Response | undefined,
          reader: undefined as
            | ReadableStreamDefaultReader<Uint8Array>
            | undefined,
        })),
        (owned) =>
          Effect.promise(async () => {
            owned.controller.abort();
            if (owned.reader) {
              await owned.reader.cancel().catch(() => undefined);
              owned.reader.releaseLock();
            } else await owned.response?.body?.cancel().catch(() => undefined);
          }),
      );
      const response = yield* Effect.tryPromise({
        try: async () => {
          const result = await fetcher(url, {
            ...init,
            signal: owner.controller.signal,
          });
          if (owner.controller.signal.aborted) {
            await result.body?.cancel().catch(() => undefined);
            owner.controller.signal.throwIfAborted();
          }
          owner.response = result;
          return result;
        },
        catch: failure,
      });
      if (!response.ok)
        return yield* ExternalRequestError.make({
          url,
          reason: "status",
          status: response.status,
          retryable:
            (response.status === 408 || response.status >= 500) &&
            !response.headers.has("retry-after"),
        });
      if (!readBody) return "";
      owner.reader = response.body?.getReader();
      const reader = owner.reader;
      const decoder = new TextDecoder();
      let text = "";
      let length = 0;
      if (reader)
        while (true) {
          const chunk = yield* Effect.tryPromise({
            try: () => reader.read(),
            catch: failure,
          });
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > maxBytes)
            return yield* ExternalRequestError.make({
              url,
              reason: "decode",
              retryable: false,
            });
          text += decoder.decode(chunk.value, { stream: true });
        }
      return text + decoder.decode();
    }),
  ).pipe(
    Effect.retry({
      times: retries,
      schedule: Schedule.exponential("100 millis"),
      while: (error) => canRetry && error.retryable,
    }),
    Effect.timeoutOrElse({
      duration: timeoutMs,
      orElse: () =>
        Effect.fail(
          ExternalRequestError.make({
            url,
            reason: "timeout",
            retryable: false,
          }),
        ),
    }),
  );
}

export function requestJson<A>(
  url: string,
  schema: Schema.Decoder<A>,
  options?: RequestOptions,
) {
  return request(url, true, options).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(schema))),
    Effect.mapError((cause) =>
      cause instanceof ExternalRequestError
        ? cause
        : ExternalRequestError.make({
            url,
            reason: "decode",
            retryable: false,
            cause,
          }),
    ),
  );
}

export function requestText(url: string, options?: RequestOptions) {
  return request(url, true, options);
}

export function requestVoid(url: string, options?: RequestOptions) {
  return request(url, false, options).pipe(Effect.asVoid);
}
