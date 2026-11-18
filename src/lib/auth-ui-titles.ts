import type { Locale } from "@/lib/i18n";
import { type MessageKey, translate } from "@/lib/messages";

const pageTitleKeys: Record<string, MessageKey> = {
  "sign-in": "authUi.auth.signIn",
  "sign-up": "authUi.auth.signUp",
  "sign-out": "authUi.auth.signOut",
  "forgot-password": "authUi.auth.forgotPassword",
  "reset-link-sent": "authUi.auth.forgotPassword",
  "reset-password": "authUi.auth.resetPassword",
  "verify-email": "authUi.auth.verifyEmail",
  "email-otp": "authUi.emailOtp.emailOtp",
  "two-factor": "authUi.twoFactor.twoFactor",
  settings: "authUi.settings.account",
  security: "authUi.settings.security",
  activity: "authUi.dash.activity",
};

/** Browser tab title for an auth or account settings view. */
export function authPageTitle(path: string, locale: Locale) {
  const key =
    (Object.hasOwn(pageTitleKeys, path) ? pageTitleKeys[path] : undefined) ??
    "authUi.auth.account";
  return `${translate(locale, key)} - ${translate(locale, "common.brand")}`;
}
