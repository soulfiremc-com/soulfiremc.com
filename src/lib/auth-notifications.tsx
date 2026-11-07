import { ChangeEmailConfirmationEmail } from "../components/auth/email/change-email-confirmation";
import { DeleteAccountVerificationEmail } from "../components/auth/email/delete-account-verification";
import { EmailVerificationEmail } from "../components/auth/email/email-verification";
import { OtpEmail } from "../components/auth/email/otp-email";
import { ResetPasswordEmail } from "../components/auth/email/reset-password";
import { AUTH_UI_BASE_PATHS, AUTH_UI_VIEW_PATHS } from "./auth-ui-config";
import { Effect } from "effect";
import { EmailDeliveryError, runEmailEffect, sendEmailEffect } from "./resend";

interface BaseEmailParams {
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
}

interface EmailWithUrlParams extends BaseEmailParams {
  url: string;
}

interface ChangeEmailConfirmationParams extends EmailWithUrlParams {
  newEmail: string;
}

interface OTPEmailParams extends BaseEmailParams {
  otp: string;
}

interface EmailOTPParams {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

const siteName = "SoulFire";
const baseUrl = "https://soulfiremc.com";
const logoUrl = `${baseUrl}/logo-square.png`;
const fromAddress = "SoulFire Auth <auth@transactional.soulfiremc.com>";
const replyTo = "SoulFire Support <support@transactional.soulfiremc.com>";

export const EMAIL_OTP_EXPIRATION_SECONDS = 5 * 60;
export const TWO_FACTOR_OTP_EXPIRATION_MINUTES = 3;

const emailOtpContent = {
  "sign-in": {
    heading: "Sign in to SoulFire",
    subject: `Your sign-in code for ${siteName}`,
    description:
      "Use this code to sign in to your {appName} account {email}. Enter it in your open browser window.",
  },
  "email-verification": {
    heading: "Verify your email",
    subject: `Your verification code for ${siteName}`,
    description:
      "Use this code to verify the email address {email} for your {appName} account.",
  },
  "forget-password": {
    heading: "Reset your password",
    subject: `Your password reset code for ${siteName}`,
    description:
      "Use this code to reset the password for your {appName} account {email}. Enter it in your open browser window.",
  },
  "change-email": {
    heading: "Confirm your email change",
    subject: `Your email change code for ${siteName}`,
    description:
      "Use this code to confirm the email change for your {appName} account {email}.",
  },
} as const satisfies Record<
  EmailOTPParams["type"],
  {
    heading: string;
    subject: string;
    description: string;
  }
>;

const sendOtpEmail = Effect.fn("Email.otp")(function* ({
  description,
  email,
  expirationMinutes,
  heading,
  otp,
  subject,
}: {
  description: string;
  email: string;
  expirationMinutes: number;
  heading: string;
  otp: string;
  subject: string;
}) {
  yield* sendEmailEffect(
    fromAddress,
    email,
    replyTo,
    subject,
    <OtpEmail
      appName={siteName}
      email={email}
      expirationMinutes={expirationMinutes}
      logoURL={logoUrl}
      localization={{
        VERIFY_YOUR_EMAIL: heading,
        WE_NEED_TO_VERIFY_YOUR_EMAIL_ADDRESS: description,
      }}
      verificationCode={otp}
    />,
  );
});

export const authNotificationEffects = {
  sendPasswordReset: Effect.fn("Email.sendPasswordReset")(function* ({
    user,
    url,
  }: EmailWithUrlParams) {
    yield* sendEmailEffect(
      fromAddress,
      user.email,
      replyTo,
      `Your password reset request for ${siteName}`,
      <ResetPasswordEmail
        appName={siteName}
        email={user.email}
        expirationMinutes={60}
        logoURL={logoUrl}
        url={url}
      />,
    );
  }),

  sendEmailVerification: Effect.fn("Email.sendEmailVerification")(function* ({
    user,
    url,
  }: EmailWithUrlParams) {
    yield* sendEmailEffect(
      fromAddress,
      user.email,
      replyTo,
      `Verify your email address for ${siteName}`,
      <EmailVerificationEmail
        appName={siteName}
        email={user.email}
        expirationMinutes={60}
        logoURL={logoUrl}
        url={url}
      />,
    );
  }),

  sendChangeEmailConfirmation: Effect.fn("Email.sendChangeEmailConfirmation")(
    function* ({ user, newEmail, url }: ChangeEmailConfirmationParams) {
      yield* sendEmailEffect(
        fromAddress,
        user.email,
        replyTo,
        `Approve your email change for ${siteName}`,
        <ChangeEmailConfirmationEmail
          appName={siteName}
          currentEmail={user.email}
          expirationMinutes={60}
          logoURL={logoUrl}
          newEmail={newEmail}
          url={url}
        />,
      );
    },
  ),

  sendDeleteAccountVerification: Effect.fn(
    "Email.sendDeleteAccountVerification",
  )(function* ({ user, url }: EmailWithUrlParams) {
    const deleteUrl = yield* Effect.try({
      try: () => new URL(url),
      catch: (cause) => new EmailDeliveryError({ reason: "prepare", cause }),
    });
    const redirectUrl = new URL(
      `${AUTH_UI_BASE_PATHS.auth}/${AUTH_UI_VIEW_PATHS.auth.redirect}`,
      baseUrl,
    );

    redirectUrl.searchParams.set(
      "redirectTo",
      `${deleteUrl.pathname}${deleteUrl.search}${deleteUrl.hash}`,
    );

    yield* sendEmailEffect(
      fromAddress,
      user.email,
      replyTo,
      `Confirm account deletion for ${siteName}`,
      <DeleteAccountVerificationEmail
        appName={siteName}
        email={user.email}
        expirationHours={24}
        logoURL={logoUrl}
        url={redirectUrl.toString()}
      />,
    );
  }),

  sendTwoFactorOTP: Effect.fn("Email.sendTwoFactorOTP")(function* ({
    user,
    otp,
  }: OTPEmailParams) {
    yield* sendOtpEmail({
      description:
        "Use this code to complete sign-in to your {appName} account {email}.",
      email: user.email,
      expirationMinutes: TWO_FACTOR_OTP_EXPIRATION_MINUTES,
      heading: "Two-factor authentication",
      otp,
      subject: `Your two-factor code for ${siteName}`,
    });
  }),

  sendEmailOTP: Effect.fn("Email.sendEmailOTP")(function* ({
    email,
    otp,
    type,
  }: EmailOTPParams) {
    const content = emailOtpContent[type];

    yield* sendOtpEmail({
      description: content.description,
      email,
      expirationMinutes: EMAIL_OTP_EXPIRATION_SECONDS / 60,
      heading: content.heading,
      otp,
      subject: content.subject,
    });
  }),
};

export const authNotifications = {
  sendPasswordReset: (
    ...args: Parameters<typeof authNotificationEffects.sendPasswordReset>
  ) => runEmailEffect(authNotificationEffects.sendPasswordReset(...args)),
  sendEmailVerification: (
    ...args: Parameters<typeof authNotificationEffects.sendEmailVerification>
  ) => runEmailEffect(authNotificationEffects.sendEmailVerification(...args)),
  sendChangeEmailConfirmation: (
    ...args: Parameters<
      typeof authNotificationEffects.sendChangeEmailConfirmation
    >
  ) =>
    runEmailEffect(
      authNotificationEffects.sendChangeEmailConfirmation(...args),
    ),
  sendDeleteAccountVerification: (
    ...args: Parameters<
      typeof authNotificationEffects.sendDeleteAccountVerification
    >
  ) =>
    runEmailEffect(
      authNotificationEffects.sendDeleteAccountVerification(...args),
    ),
  sendTwoFactorOTP: (
    ...args: Parameters<typeof authNotificationEffects.sendTwoFactorOTP>
  ) => runEmailEffect(authNotificationEffects.sendTwoFactorOTP(...args)),
  sendEmailOTP: (
    ...args: Parameters<typeof authNotificationEffects.sendEmailOTP>
  ) => runEmailEffect(authNotificationEffects.sendEmailOTP(...args)),
};
