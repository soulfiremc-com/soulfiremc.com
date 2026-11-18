import assert from "node:assert/strict";
import test from "node:test";
import { itemAt } from "@/lib/item-at";

void test("itemAt returns items in range and rejects missing indexes", () => {
  assert.equal(itemAt(["a", "b"], 1), "b");
  assert.equal(itemAt(new Float32Array([0, 2]), 0), 0);
  assert.throws(() => itemAt(["a"], 1), {
    name: "RangeError",
    message: "Index 1 is out of range for length 1",
  });
  assert.throws(() => itemAt([], -1), RangeError);
});
