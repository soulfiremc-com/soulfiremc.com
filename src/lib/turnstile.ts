import { Data, Effect, Schema } from "effect";
import { requestJson } from "@/lib/backend-http";

const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export const REVIEW_TURNSTILE_ACTION = "review";

const turnstileResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  action: Schema.optionalKey(Schema.String),
  hostname: Schema.optionalKey(Schema.String),
  "error-codes": Schema.optionalKey(Schema.Array(Schema.String)),
});

export class TurnstileVerificationError extends Data.TaggedError(
  "TurnstileVerificationError",
)<{
  readonly errorCodes: string[];
}> {}

export function getTurnstileRemoteIp(headers: Headers): string | null {
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return null;
  }

  return (
    forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find(Boolean) ?? null
  );
}

export function getExpectedTurnstileHostname(hostname: string): string | null {
  const normalizedHostname = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(normalizedHostname)) {
    return null;
  }

  return normalizedHostname;
}

type TurnstileInput = {
  token: string;
  remoteIp?: string | null;
  expectedAction?: string;
  expectedHostname?: string | null;
};

export const validateTurnstileTokenEffect = Effect.fn("validateTurnstileToken")(
  function* ({
    token,
    remoteIp,
    expectedAction,
    expectedHostname,
  }: TurnstileInput) {
    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > 2048
    ) {
      return yield* new TurnstileVerificationError({
        errorCodes: ["invalid-input-response"],
      });
    }

    const secret = process.env.REVIEW_TURNSTILE_SECRET_KEY;
    if (!secret) {
      return yield* new TurnstileVerificationError({
        errorCodes: ["missing-input-secret"],
      });
    }

    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    formData.set("idempotency_key", crypto.randomUUID());
    if (remoteIp) formData.set("remoteip", remoteIp);

    const result = yield* requestJson(
      TURNSTILE_SITEVERIFY_URL,
      turnstileResponseSchema,
      {
        init: { method: "POST", body: formData, cache: "no-store" },
      },
    ).pipe(
      Effect.mapError(
        () =>
          new TurnstileVerificationError({ errorCodes: ["internal-error"] }),
      ),
    );

    if (!result.success) {
      return yield* new TurnstileVerificationError({
        errorCodes: [...(result["error-codes"] ?? ["invalid-input-response"])],
      });
    }
    if (expectedAction && result.action !== expectedAction) {
      return yield* new TurnstileVerificationError({
        errorCodes: ["action-mismatch"],
      });
    }
    if (expectedHostname && result.hostname !== expectedHostname) {
      return yield* new TurnstileVerificationError({
        errorCodes: ["hostname-mismatch"],
      });
    }
  },
);

export function validateTurnstileToken(input: TurnstileInput) {
  return Effect.runPromise(
    validateTurnstileTokenEffect(input).pipe(
      Effect.match({
        onFailure: (error) => ({
          success: false,
          errorCodes: error.errorCodes,
        }),
        onSuccess: () => ({ success: true, errorCodes: [] as string[] }),
      }),
    ),
  );
}
