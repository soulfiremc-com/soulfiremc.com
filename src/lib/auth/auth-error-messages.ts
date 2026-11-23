import { getAuthErrorCode } from "@better-auth-ui/core";

import type { Locale } from "@/lib/i18n";
import { type MessageKey, translate } from "@/lib/messages";

/**
 * Better Auth returns terse English messages such as "Invalid OTP". These
 * codes reach users often enough to deserve friendly, localized wording.
 */
const serverErrorKeys: Record<string, MessageKey> = {
  ACCOUNT_TEMPORARILY_LOCKED: "auth.error.accountLocked",
  BANNED_USER: "auth.error.bannedUser",
  EMAIL_ALREADY_VERIFIED: "auth.error.emailAlreadyVerified",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "authUi.settings.lastAccountUnlinkingDisabled",
  INVALID_BACKUP_CODE: "auth.error.invalidBackupCode",
  INVALID_CODE: "auth.error.invalidCode",
  INVALID_EMAIL: "authUi.auth.invalidEmail",
  INVALID_EMAIL_OR_PASSWORD: "auth.error.invalidEmailOrPassword",
  INVALID_OTP: "auth.error.invalidCode",
  INVALID_PASSWORD: "auth.error.invalidPassword",
  INVALID_TOKEN: "auth.error.invalidLink",
  INVALID_USERNAME: "auth.error.invalidUsername",
  INVALID_USERNAME_OR_PASSWORD: "auth.error.invalidUsernameOrPassword",
  LINKED_ACCOUNT_ALREADY_EXISTS: "auth.error.accountAlreadyLinked",
  MISSING_RESPONSE: "auth.error.captchaMissing",
  OTP_EXPIRED: "auth.error.codeExpired",
  OTP_HAS_EXPIRED: "auth.error.codeExpired",
  PASSWORD_COMPROMISED: "auth.error.passwordCompromised",
  PASSWORD_TOO_LONG: "auth.error.passwordTooLong",
  PASSWORD_TOO_SHORT: "auth.error.passwordTooShort",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "auth.error.accountAlreadyLinked",
  TOKEN_EXPIRED: "auth.error.invalidLink",
  TOO_MANY_ATTEMPTS: "auth.error.tooManyCodeAttempts",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "auth.error.tooManyCodeAttempts",
  USER_ALREADY_EXISTS: "auth.error.userAlreadyExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "auth.error.userAlreadyExists",
  USERNAME_IS_ALREADY_TAKEN: "authUi.username.usernameTaken",
  USERNAME_TOO_LONG: "auth.error.invalidUsername",
  USERNAME_TOO_SHORT: "auth.error.invalidUsername",
  VERIFICATION_FAILED: "auth.error.captchaFailed",
  YOU_CANNOT_BAN_YOURSELF: "auth.error.cannotBanYourself",
  YOU_CANNOT_IMPERSONATE_ADMINS: "auth.error.cannotImpersonateAdmins",
};

/** The catalog key for a known Better Auth error code. */
export function authErrorMessageKey(error: unknown): MessageKey | undefined {
  const code = getAuthErrorCode(error);
  return code && Object.hasOwn(serverErrorKeys, code)
    ? serverErrorKeys[code]
    : undefined;
}

/** Friendly localized text for a known Better Auth error code. */
export function localizedAuthErrorMessage(
  error: unknown,
  locale: Locale,
): string | undefined {
  const key = authErrorMessageKey(error);
  return key && translate(locale, key);
}
