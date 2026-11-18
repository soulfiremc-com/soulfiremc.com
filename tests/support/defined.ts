import assert from "node:assert/strict";

/** Returns a value the test expects to exist, or fails with a clear message. */
export function defined<T>(
  value: T,
  message = "expected a value",
): NonNullable<T> {
  assert.ok(value !== undefined && value !== null, message);
  return value;
}
