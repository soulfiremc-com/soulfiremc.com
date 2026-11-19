import { ChangeEmailConfirmationEmail } from "../components/auth/email/change-email-confirmation";
import { DeleteAccountVerificationEmail } from "../components/auth/email/delete-account-verification";
import { OtpEmail } from "../components/auth/email/otp-email";
import { ResetPasswordEmail } from "../components/auth/email/reset-password";
import { AUTH_UI_BASE_PATHS, AUTH_UI_VIEW_PATHS } from "./auth-ui-config";
import { Effect } from "effect";
import { EmailDeliveryError, runEmailEffect, sendEmailEffect } from "./resend";

type BaseEmailParams = {
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
};

type EmailWithUrlParams = {
  url: string;
} & BaseEmailParams;

type ChangeEmailConfirmationParams = {
  newEmail: string;
} & EmailWithUrlParams;

type OTPEmailParams = {
  otp: string;
} & BaseEmailParams;

type EmailOTPParams = {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
};

const siteName = "SoulFire";
const baseUrl = "https://soulfiremc.com";
// Email clients apply no mask, so use the rounded tile from the brand guide.
const logoUrl = `${baseUrl}/logo.png`;
const fromAddress = "SoulFire Auth <auth@transactional.soulfiremc.com>";
const replyTo = "SoulFire Support <support@transactional.soulfiremc.com>";

export const EMAIL_OTP_EXPIRATION_SECONDS = 5 * 60;
export const TWO_FACTOR_OTP_EXPIRATION_MINUTES = 3;

const emailOtpContent = {
  "sign-in": {
    heading: "Sign in to SoulFire",
    subject: `Your sign-in code for ${siteName}`,
    preview: "Your SoulFire sign-in code is {verificationCode}",
    description:
      "Use this code to sign in to your {appName} account {email}. Enter it in your open browser window.",
    ignoreNotice:
      "If you didn't try to sign in, you can safely ignore this email. Nobody can sign in without this code.",
  },
  "email-verification": {
    heading: "Verify your email",
    subject: `Your verification code for ${siteName}`,
    preview: "Your SoulFire verification code is {verificationCode}",
    description:
      "Use this code to verify the email address {email} for your {appName} account. Enter it in your open browser window.",
    ignoreNotice:
      "If you didn't request this email, you can safely ignore it. Someone else might have typed your email address by mistake.",
  },
  "forget-password": {
    heading: "Reset your password",
    subject: `Your password reset code for ${siteName}`,
    preview: "Your SoulFire password reset code is {verificationCode}",
    description:
      "Use this code to reset the password for your {appName} account {email}. Enter it in your open browser window.",
    ignoreNotice:
      "If you didn't request a password reset, you can safely ignore this email. Your password stays the same.",
  },
  // Better Auth sends this code to the new address, before the account uses it.
  "change-email": {
    heading: "Confirm your new email",
    subject: `Your email change code for ${siteName}`,
    preview: "Your SoulFire email change code is {verificationCode}",
    description:
      "Use this code to make {email} the new email address of your {appName} account. Enter it in your open browser window.",
    ignoreNotice:
      "If you didn't request an email change, you can safely ignore this email. No account will use this address.",
  },
} as const satisfies Record<
  EmailOTPParams["type"],
  {
    heading: string;
    subject: string;
    preview: string;
    description: string;
    ignoreNotice: string;
  }
>;

const sendOtpEmail = Effect.fn("Email.otp")(function* ({
  description,
  email,
  expirationMinutes,
  heading,
  ignoreNotice,
  otp,
  preview,
  subject,
}: {
  description: string;
  email: string;
  expirationMinutes: number;
  heading: string;
  ignoreNotice: string;
  otp: string;
  preview: string;
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
        IF_YOU_DIDNT_REQUEST_THIS_EMAIL: ignoreNotice,
        VERIFY_YOUR_EMAIL: heading,
        WE_NEED_TO_VERIFY_YOUR_EMAIL_ADDRESS: description,
        YOUR_VERIFICATION_CODE_IS_CODE: preview,
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
      catch: (cause) => EmailDeliveryError.make({ reason: "prepare", cause }),
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
        "Use this code to finish signing in to your {appName} account {email}. Enter it in your open browser window.",
      email: user.email,
      expirationMinutes: TWO_FACTOR_OTP_EXPIRATION_MINUTES,
      heading: "Two-factor authentication",
      // Sign-in only asks for this code after a correct password.
      ignoreNotice:
        "If you didn't request this code, someone else might know your password. Change your password in your SoulFire account settings.",
      otp,
      preview: "Your SoulFire two-factor code is {verificationCode}",
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
      ...content,
      email,
      expirationMinutes: EMAIL_OTP_EXPIRATION_SECONDS / 60,
      otp,
    });
  }),
};

export const authNotifications = {
  sendPasswordReset: (
    ...args: Parameters<typeof authNotificationEffects.sendPasswordReset>
  ) => runEmailEffect(authNotificationEffects.sendPasswordReset(...args)),
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
