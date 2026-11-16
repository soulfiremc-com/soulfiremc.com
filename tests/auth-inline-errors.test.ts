import { strict as assert } from "node:assert";
import { test } from "node:test";
import { authQueryKeys, getAuthErrorPresentation } from "@better-auth-ui/core";
import {
  type TwoFactorAuthClient,
  verifyTotpOptions,
} from "@better-auth-ui/core/plugins/two-factor";
import { withInlineErrors } from "../src/lib/auth/inline-errors";

void test("inline errors keep the session refresh that runs before onSuccess", () => {
  const options = withInlineErrors(
    verifyTotpOptions({} as TwoFactorAuthClient),
  );

  assert.equal(getAuthErrorPresentation(options.meta), "inline");
  assert.deepEqual(options.meta?.awaits, [authQueryKeys.session]);
});

void test("inline errors work for options without meta", () => {
  const mutationOptions: {
    meta?: Record<string, unknown>;
    mutationKey: string[];
  } = { mutationKey: ["auth", "example"] };
  const options = withInlineErrors(mutationOptions);

  assert.deepEqual(options.meta, { errorPresentation: "inline" });
  assert.deepEqual(options.mutationKey, ["auth", "example"]);
});
