/**
 * Auth endpoints that require a Turnstile token.
 *
 * Setting this list replaces Better Auth's defaults, so it repeats them. The
 * other entries are paths whose forms already send a token: without them, a
 * bot could skip the captcha by guessing passwords through username sign-in
 * or by sending reset codes through the email OTP endpoints.
 *
 * `/email-otp/send-verification-otp` is not listed, because the verify-email
 * and change-email forms resend codes without a captcha.
 */
export const CAPTCHA_ENDPOINTS = [
  "/sign-up/email",
  "/sign-in/email",
  "/request-password-reset",
  "/sign-in/username",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
];
