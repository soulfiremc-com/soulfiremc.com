import { Data, Effect, Schedule, Schema } from "effect";

export class ExternalRequestError extends Data.TaggedError(
  "ExternalRequestError",
)<{
  readonly url: string;
  readonly reason: "transport" | "status" | "timeout" | "decode";
  readonly status?: number;
  readonly retryable: boolean;
  readonly cause?: unknown;
}> {}

type RequestOptions = {
  init?: Omit<RequestInit, "signal">;
  timeoutMs?: number;
};

// Keep the budget around all attempts and body reads. Interrupting the effect
// aborts fetch, including a response body that has not finished streaming.
function request<A>(
  url: string,
  read: (response: Response) => Promise<A>,
  { init, timeoutMs = 5_000 }: RequestOptions = {},
) {
  const method = init?.method?.toUpperCase() ?? "GET";
  const canRetry = method === "GET" || method === "HEAD";

  return Effect.tryPromise({
    try: async (signal) => {
      const response = await fetch(url, { ...init, signal });
      if (!response.ok) {
        // Leave rate-limit delays to the caller rather than retrying early.
        const retryable =
          (response.status === 408 || response.status >= 500) &&
          !response.headers.has("retry-after");
        await response.body?.cancel().catch(() => undefined);
        throw new ExternalRequestError({
          url,
          reason: "status",
          status: response.status,
          retryable,
        });
      }

      return read(response).catch((cause: unknown) => {
        throw new ExternalRequestError({
          url,
          reason: cause instanceof SyntaxError ? "decode" : "transport",
          retryable: !(cause instanceof SyntaxError),
          cause,
        });
      });
    },
    catch: (cause) =>
      cause instanceof ExternalRequestError
        ? cause
        : new ExternalRequestError({
            url,
            reason: "transport",
            retryable: true,
            cause,
          }),
  }).pipe(
    Effect.retry({
      times: 2,
      schedule: Schedule.exponential("100 millis"),
      while: (error) => canRetry && error.retryable,
    }),
    Effect.timeoutOrElse({
      duration: timeoutMs,
      orElse: () =>
        Effect.fail(
          new ExternalRequestError({
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
  return request(
    url,
    (response): Promise<unknown> => response.json(),
    options,
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) =>
      cause instanceof ExternalRequestError
        ? cause
        : new ExternalRequestError({
            url,
            reason: "decode",
            retryable: false,
            cause,
          }),
    ),
  );
}

export function requestText(url: string, options?: RequestOptions) {
  return request(url, (response) => response.text(), options);
}

export function requestVoid(url: string, options?: RequestOptions) {
  return request(
    url,
    async (response) => {
      await response.body?.cancel().catch(() => undefined);
    },
    options,
  );
}
