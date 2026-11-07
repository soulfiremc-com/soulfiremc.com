import { Context, Data, Effect } from "effect";
import { Resend } from "resend";
import { runWebsiteEffect } from "@/lib/effect-runtime";

export class EmailDeliveryError extends Data.TaggedError("EmailDeliveryError")<{
  readonly reason: "transport" | "rejected" | "prepare";
  readonly cause: unknown;
}> {
  override get message() {
    return "Failed to send email";
  }
}

export interface WebsiteEmail {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly react: React.ReactElement;
}

export class WebsiteMailer extends Context.Service<
  WebsiteMailer,
  {
    readonly send: (
      email: WebsiteEmail,
    ) => Effect.Effect<void, EmailDeliveryError>;
  }
>()("soulfire/WebsiteMailer") {}

export function makeWebsiteMailer(
  submit: (email: WebsiteEmail) => Promise<{ error: unknown }> = (email) =>
    new Resend(process.env.RESEND_API_KEY).emails.send(email),
): Context.Service.Shape<typeof WebsiteMailer> {
  return {
    send: (email) =>
      Effect.tryPromise({
        try: () => submit(email),
        catch: (cause) =>
          new EmailDeliveryError({ reason: "transport", cause }),
      }).pipe(
        Effect.flatMap(({ error }) =>
          error
            ? Effect.fail(
                new EmailDeliveryError({ reason: "rejected", cause: error }),
              )
            : Effect.void,
        ),
        // Email submission may have succeeded despite a lost acknowledgement.
        // Wait for its one SDK call; never retry it or return before it settles.
        Effect.uninterruptible,
      ),
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
