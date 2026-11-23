import { Context, Schema, Effect } from "effect";
import { render } from "react-email";
import { ExternalRequestError, requestVoid } from "@/lib/backend-http";
import { runWebsiteEffect } from "@/lib/effect-runtime";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EmailDeliveryError extends Schema.TaggedError<
  EmailDeliveryError,
  { readonly brand: unique symbol }
>()("EmailDeliveryError", {
  reason: Schema.Literals(["transport", "rejected", "prepare"]),
  cause: Schema.Unknown,
}) {
  override get message() {
    return "Failed to send email";
  }
}

export type WebsiteEmail = {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly react: React.ReactElement;
};

/**
 * The rendered email. React Email's plain-text render skips the hidden
 * preheader, so the submission carries both parts.
 */
export type WebsiteEmailSubmission = {
  readonly html: string;
  readonly text: string;
} & WebsiteEmail;

export class WebsiteMailer extends Context.Service<
  WebsiteMailer,
  {
    readonly send: (
      email: WebsiteEmail,
    ) => Effect.Effect<void, EmailDeliveryError>;
  }
>()("soulfiremc.com/lib/resend/WebsiteMailer") {}

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
/** Bounds a hung submission so the sign-up or reset request still settles. */
const RESEND_TIMEOUT_MS = 15_000;

/**
 * Submits one email through Resend's REST API with the shared HTTP helper, so
 * the call has a deadline and is never retried. A non-2xx response is a
 * rejection; a transport failure or timeout throws.
 */
async function submitToResend(
  email: WebsiteEmailSubmission,
): Promise<{ error: unknown }> {
  try {
    await Effect.runPromise(
      requestVoid(RESEND_EMAILS_URL, {
        init: {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["RESEND_API_KEY"] ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: email.from,
            to: email.to,
            reply_to: email.replyTo,
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
        },
        timeoutMs: RESEND_TIMEOUT_MS,
        retries: 0,
      }),
    );
    return { error: null };
  } catch (error) {
    if (error instanceof ExternalRequestError && error.reason === "status") {
      return { error };
    }
    throw error;
  }
}

// Rendering finishes before submission starts, so a template failure is a
// "prepare" failure and never reaches Resend.
function prepareEmail(email: WebsiteEmail) {
  return Effect.tryPromise({
    try: async (): Promise<WebsiteEmailSubmission> => {
      const [html, text] = await Promise.all([
        render(email.react),
        render(email.react, { plainText: true }),
      ]);
      return { ...email, html, text };
    },
    catch: (cause) => EmailDeliveryError.make({ reason: "prepare", cause }),
  });
}

export function makeWebsiteMailer(
  submit: (
    email: WebsiteEmailSubmission,
  ) => Promise<{ error: unknown }> = submitToResend,
): Context.Service.Shape<typeof WebsiteMailer> {
  const submitEmail = (email: WebsiteEmailSubmission) =>
    Effect.tryPromise({
      try: () => submit(email),
      catch: (cause) => EmailDeliveryError.make({ reason: "transport", cause }),
    }).pipe(
      Effect.flatMap(({ error }) =>
        error
          ? Effect.fail(
              EmailDeliveryError.make({ reason: "rejected", cause: error }),
            )
          : Effect.void,
      ),
      // Email submission may have succeeded despite a lost acknowledgement.
      // Wait for its one call; never retry it or return before it settles.
      Effect.uninterruptible,
    );

  return {
    send: (email) => prepareEmail(email).pipe(Effect.flatMap(submitEmail)),
  };
}

export const sendEmailEffect = Effect.fn("Email.send")(function* (
  from: string,
  to: string,
  replyTo: string,
  subject: string,
  react: React.ReactElement,
) {
  const mailer = yield* WebsiteMailer;
  yield* mailer.send({ from, to, replyTo, subject, react });
});

/** Better Auth owns the callback; application email programs compose before this edge. */
export function runEmailEffect<A, E>(
  program: Effect.Effect<A, E, WebsiteMailer>,
) {
  return runWebsiteEffect(
    program.pipe(Effect.provideService(WebsiteMailer, makeWebsiteMailer())),
  );
}
