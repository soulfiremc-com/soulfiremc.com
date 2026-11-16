import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAuthUiPath } from "../src/lib/auth-ui-config";

void test("auth, account, and admin pages load the auth UI", () => {
  for (const path of [
    "/auth/sign-in",
    "/auth/two-factor",
    "/account/settings",
    "/account/security",
    "/admin",
    "/admin/users",
  ]) {
    assert.equal(isAuthUiPath(path), true, path);
  }
});

void test("other pages skip the auth UI", () => {
  for (const path of [
    "/",
    "/de",
    "/get-accounts/localts",
    "/docs/start-here",
    "/authors",
    "/accounts",
    "/administration",
    "/blog/auth-guide",
  ]) {
    assert.equal(isAuthUiPath(path), false, path);
  }
});
