import { createAuthPlugin } from "@better-auth-ui/core";
import {
  emailOtpPlugin as coreEmailOtpPlugin,
  type EmailOtpPluginOptions,
} from "@better-auth-ui/core/plugins/email-otp";

import { lazyAuthUi } from "@/lib/auth/lazy-auth-ui";

const ChangeEmailOtp = lazyAuthUi("ChangeEmailOtp");
const EmailOtp = lazyAuthUi("EmailOtp");
const EmailOtpButton = lazyAuthUi("EmailOtpButton");
const ForgotPasswordOtp = lazyAuthUi("ForgotPasswordOtp");
const ResetPasswordOtp = lazyAuthUi("ResetPasswordOtp");
const VerifyEmailOtp = lazyAuthUi("VerifyEmailOtp");

export const emailOtpPlugin = createAuthPlugin(
  coreEmailOtpPlugin.id,
  (options: EmailOtpPluginOptions = {}) => {
    const plugin = coreEmailOtpPlugin(options);

    return {
      ...plugin,
      authButtons: plugin.signIn ? [EmailOtpButton] : [],
      // Each flow is opt-in because it replaces a link-based view outright.
      // Turning one on without the matching server option would leave the
      // user waiting for a code that never arrives.
      views: {
        auth: {
          ...(plugin.signIn && { emailOtp: EmailOtp }),
          ...(plugin.emailVerification && { verifyEmail: VerifyEmailOtp }),
          ...(plugin.passwordReset && {
            forgotPassword: ForgotPasswordOtp,
            resetPassword: ResetPasswordOtp,
          }),
        },
      },
      // Conditional, not an override: when `emailAndPassword.enabled === false`
      // the `<Auth>` router renders this at `/auth/sign-in` instead of the
      // disabled password form.
      ...(plugin.signIn && {
        fallbackViews: { auth: { signIn: EmailOtp } },
      }),
      ...(plugin.changeEmail && {
        cardOverrides: { account: { changeEmail: ChangeEmailOtp } },
      }),
    };
  },
);
