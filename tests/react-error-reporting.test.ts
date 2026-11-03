import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createRecoverableErrorHandler } from "../src/lib/react-error-reporting";

await test("recoverable errors retain the original error and React component stack", () => {
  const captureException = mock.fn();
  const report = createRecoverableErrorHandler(captureException);
  const cause = new Error("Server and client markup differ");
  const error = new Error("Hydration failed", { cause });
  report(error, {
    componentStack: "\n    at ProviderCard\n    at GetAccountsPage",
  });

  assert.equal(captureException.mock.callCount(), 1);
  assert.deepEqual(captureException.mock.calls[0].arguments, [
    error,
    {
      react_error_type: "recoverable",
      react_component_stack: "\n    at ProviderCard\n    at GetAccountsPage",
    },
  ]);
  assert.equal(error.cause, cause);
});

await test("missing component stacks do not discard recoverable errors", () => {
  const captureException = mock.fn();
  createRecoverableErrorHandler(captureException)("recoverable failure", {});
  assert.deepEqual(captureException.mock.calls[0].arguments, [
    "recoverable failure",
    { react_error_type: "recoverable", react_component_stack: null },
  ]);
});

await test("analytics failures fall back to the console without interrupting recovery", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const error = new Error("Hydration failed");
  const report = createRecoverableErrorHandler(() => {
    throw new Error("Analytics unavailable");
  });
  assert.doesNotThrow(() => report(error, {}));
  assert.deepEqual(log.mock.calls[0].arguments, [error]);
});

await test("recoverable errors remain visible when analytics is not configured", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const error = new Error("Hydration failed");
  createRecoverableErrorHandler()(error, {});
  assert.deepEqual(log.mock.calls[0].arguments, [error]);
});
