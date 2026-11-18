import assert from "node:assert/strict";
import test from "node:test";
import { localization, resolveAuthConfig } from "@better-auth-ui/core";
import { dashPlugin } from "@better-auth-ui/core/plugins/dash";
import { twoFactorPlugin } from "@better-auth-ui/core/plugins/two-factor";
import { localizedAuthErrorMessage } from "../src/lib/auth/auth-error-messages";
import { authUiLocale } from "../src/lib/auth/auth-ui-locale";
import { authPageTitle } from "../src/lib/auth-ui-titles";
import { isAuthUiPath } from "../src/lib/auth-ui-config";

const plugins = [twoFactorPlugin(), dashPlugin()];

void test("auth UI messages follow the page language", () => {
  const config = resolveAuthConfig({
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
    authClient: {} as never,
    locale: authUiLocale("de", plugins),
    plugins,
  });
  assert.equal(config.localization.auth.signIn, "Anmelden");
  assert.equal(
    config.localization.auth.continueWith,
    "Weiter mit {{provider}}",
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double implements only the members this test uses
  const [twoFactor, dash] = config.plugins as [
    ReturnType<typeof twoFactorPlugin>,
    ReturnType<typeof dashPlugin>,
  ];
  assert.equal(twoFactor.localization.backupCodes, "Backup-Codes");
  assert.equal(dash.localization.eventLabels.user_banned, "Benutzer gesperrt");
});

void test("English auth UI messages use sentence case", () => {
  const { localization: en } = authUiLocale("en", plugins);
  assert.equal(en.auth.signIn, "Sign in");
  assert.equal(en.auth.forgotPassword, "Forgot password");
  assert.equal(localization.auth.signIn, "Sign In");
});

void test("known Better Auth error codes get friendly localized messages", () => {
  const invalidOtp = { error: { code: "INVALID_OTP", message: "Invalid OTP" } };
  assert.equal(
    localizedAuthErrorMessage(invalidOtp, "en"),
    "That code is not correct. Check it and try again.",
  );
  assert.equal(
    localizedAuthErrorMessage(invalidOtp, "ru"),
    "Неверный код. Проверьте его и попробуйте снова.",
  );
  assert.equal(
    localizedAuthErrorMessage({ error: { code: "SOMETHING_NEW" } }, "de"),
    undefined,
  );
});

void test("sign-in and account pages keep English URLs and have titles", () => {
  assert.ok(isAuthUiPath("/account/security"));
  assert.ok(isAuthUiPath("/auth/sign-in"));
  assert.ok(!isAuthUiPath("/de/download"));
  assert.equal(authPageTitle("sign-up", "de"), "Registrieren - SoulFire");
  assert.equal(authPageTitle("unknown", "en"), "Account - SoulFire");
});
