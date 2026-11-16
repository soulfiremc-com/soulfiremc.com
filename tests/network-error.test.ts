import assert from "node:assert/strict";
import test from "node:test";
import { isNetworkError } from "@/lib/network-error";

await test("isNetworkError recognizes failed fetches and route chunk loads across browsers", () => {
  for (const message of [
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "Failed to fetch dynamically imported module: https://soulfiremc.com/assets/docs.js",
    "Importing a module script failed.",
  ]) {
    assert.equal(isNetworkError(new TypeError(message)), true, message);
  }
});

await test("isNetworkError keeps application errors and treats any error as a network error while offline", () => {
  assert.equal(isNetworkError(new Error("Review not found")), false);
  assert.equal(isNetworkError("Failed to fetch"), false);
  assert.equal(isNetworkError(new Error("Review not found"), false), true);
});
