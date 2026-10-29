import assert from "node:assert/strict";
import test from "node:test";
import {
  BOT_COUNT,
  getFormation,
  terrain,
  terrainHeight,
} from "@/components/home/voxel-world";

void test("bot formations keep distinct positions on supported terrain", () => {
  for (const formation of ["scatter", "circle", "grid"] as const) {
    const positions = getFormation(formation);
    assert.equal(positions.length, BOT_COUNT);
    assert.equal(
      new Set(positions.map(([x, z]) => `${x}:${z}`)).size,
      BOT_COUNT,
    );
    for (const [x, z] of positions) {
      assert.ok(Number.isFinite(x) && Number.isFinite(z));
      const block = terrain.find(
        (block) => block.x === Math.round(x) && block.z === Math.round(z),
      );
      assert.ok(block);
      assert.equal(block.height, terrainHeight(Math.round(x), Math.round(z)));
    }
  }
});

void test("circle and grid formations preserve their geometry", () => {
  const circle = getFormation("circle");
  const radius = Math.hypot(...circle[0]);
  for (const position of circle)
    assert.ok(Math.abs(Math.hypot(...position) - radius) < 1e-10);
  const grid = getFormation("grid");
  const columns = new Set(grid.map(([x]) => x));
  const rows = new Set(grid.map(([, z]) => z));
  assert.equal(columns.size, Math.sqrt(BOT_COUNT));
  assert.equal(rows.size, Math.sqrt(BOT_COUNT));
  assert.equal(columns.size * rows.size, BOT_COUNT);
  assert.ok(Math.abs(grid.reduce((sum, [x]) => sum + x, 0)) < 1e-10);
  assert.ok(Math.abs(grid.reduce((sum, [, z]) => sum + z, 0)) < 1e-10);
});
