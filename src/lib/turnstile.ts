import { SecureRandom } from "effect/crypto";
import { Config, ConfigProvider, Effect, Schema } from "effect";
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

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class TurnstileVerificationError extends Schema.TaggedError<
  TurnstileVerificationError,
  { readonly brand: unique symbol }
>()("TurnstileVerificationError", {
  errorCodes: Schema.mutable(Schema.Array(Schema.String)),
}) {}

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

/** Siteverify reports a bare hostname, but the Host header can include a port. */
export function getExpectedTurnstileHostname(host: string): string | null {
  let normalizedHostname: string;
  try {
    normalizedHostname = new URL(`http://${host}`).hostname;
  } catch {
    normalizedHostname = host.toLowerCase();
  }
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
      return yield* TurnstileVerificationError.make({
        errorCodes: ["invalid-input-response"],
      });
    }

    const secret = yield* Config.String("REVIEW_TURNSTILE_SECRET_KEY").pipe(
      Config.withDefault(""),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv(),
      ),
      Effect.orElseSucceed(() => ""),
    );
    if (!secret) {
      return yield* TurnstileVerificationError.make({
        errorCodes: ["missing-input-secret"],
      });
    }

    const formData = new FormData();
    formData.set("secret", secret);
    formData.set("response", token);
    // oxlint-disable-next-line effecttsgo/unstable-api-usage -- Effect v4 provides secure UUIDs through this service.
    const secureRandom = yield* SecureRandom.SecureRandom;
    const idempotencyKey = yield* secureRandom.uuidV4();
    formData.set("idempotency_key", idempotencyKey);
    if (remoteIp) formData.set("remoteip", remoteIp);

    const result = yield* requestJson(
      TURNSTILE_SITEVERIFY_URL,
      turnstileResponseSchema,
      {
        init: { method: "POST", body: formData, cache: "no-store" },
      },
    ).pipe(
      Effect.mapError(() =>
        TurnstileVerificationError.make({ errorCodes: ["internal-error"] }),
      ),
    );

    if (!result.success) {
      return yield* TurnstileVerificationError.make({
        errorCodes: [...(result["error-codes"] ?? ["invalid-input-response"])],
      });
    }
    if (expectedAction && result.action !== expectedAction) {
      return yield* TurnstileVerificationError.make({
        errorCodes: ["action-mismatch"],
      });
    }
    if (expectedHostname && result.hostname !== expectedHostname) {
      return yield* TurnstileVerificationError.make({
        errorCodes: ["hostname-mismatch"],
      });
    }
    return undefined;
  },
  // oxlint-disable-next-line effecttsgo/unstable-api-usage -- Supply the Web Crypto implementation for secure UUIDs.
  Effect.provide(SecureRandom.layerWebCrypto),
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
