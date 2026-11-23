import assert from "node:assert/strict";
import test from "node:test";
import { createStillScene } from "@/components/home/voxel-still-scene";

void test("the still scene gives every face a unique key", () => {
  // These seeds place actors on top of each other in the first frame, so the
  // meshes repeat some faces.
  for (const seed of [0, 3_324_225_968, 2_845_525_184]) {
    const { faces } = createStillScene(seed);
    const ids = faces.map((face) => face.id);
    assert.ok(faces.length > 0);
    assert.equal(new Set(ids).size, ids.length, `seed ${seed}`);
  }
});
