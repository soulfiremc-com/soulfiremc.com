import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  authRedirectPath,
  isAuthUiPath,
  signInReturnPath,
} from "../src/lib/auth-ui-config";

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

void test("sign-in returns to same-site paths only", () => {
  assert.equal(
    authRedirectPath("/get-accounts/localts?tab=reviews#reviews"),
    "/get-accounts/localts?tab=reviews#reviews",
  );
  for (const value of [
    undefined,
    42,
    "",
    "https://evil.example/",
    "//evil.example/",
    "/\t/evil.example/",
    String.raw`/\evil.example/`,
  ]) {
    assert.equal(authRedirectPath(value), "/account/settings", String(value));
  }
});

void test("header sign-in returns to the current page", () => {
  assert.equal(
    signInReturnPath("/download?os=linux#install", "/account/settings"),
    "/download?os=linux#install",
  );
  assert.equal(
    signInReturnPath("/de/get-accounts/localts", "/account/settings"),
    "/de/get-accounts/localts",
  );
});

void test("header sign-in on an auth page keeps its redirect target", () => {
  assert.equal(
    signInReturnPath(
      "/auth/forgot-password?redirectTo=%2Fdownload",
      "/download",
    ),
    "/download",
  );
  assert.equal(
    signInReturnPath("/auth/sign-in", "//evil.example"),
    "/account/settings",
  );
});
