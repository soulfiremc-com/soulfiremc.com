import assert from "node:assert/strict";
import test from "node:test";
import { createAnimator, mobKey } from "@/components/home/voxel-animation";
import { createEffectsGeometry } from "@/components/home/voxel-effects-geometry";
import {
  advanceFlora,
  createFloraGeometry,
  createFloraGrowth,
} from "@/components/home/voxel-flora-geometry";
import {
  createTerrainGeometry,
  KIND,
  tileSurface,
  VERTEX_STRIDE,
  type Mesh,
} from "@/components/home/voxel-geometry";
import { collectLights, MAX_LIGHTS } from "@/components/home/voxel-lights";
import {
  createSimulation,
  INITIAL_SIMULATION_SEED,
} from "@/components/home/voxel-simulation";

function kinds(mesh: Mesh, from: number, to: number) {
  const found = new Set<number>();
  for (let vertex = from; vertex < to; vertex++)
    found.add(mesh.vertices[vertex * VERTEX_STRIDE + 9]);
  return found;
}

void test("meshes keep blended materials after the opaque vertices", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const lava = state.tiles.find((tile) => tile.material === "grass")!;
  lava.hazard = "lava";
  const terrain = createTerrainGeometry(state);
  const total = terrain.vertices.length / VERTEX_STRIDE;
  assert.equal(terrain.vertices.length % (VERTEX_STRIDE * 6), 0);
  assert.deepEqual(
    [...kinds(terrain, 0, terrain.opaque)].toSorted((a, b) => a - b),
    [KIND.solid, KIND.lava],
  );
  assert.deepEqual([...kinds(terrain, terrain.opaque, total)], [KIND.water]);
});

void test("water fills its channel so things stand near the bank height", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const river = state.tiles.find((tile) => tile.x === 0 && tile.z === 0)!;
  assert.equal(river.material, "water");
  const surface = tileSurface(river);
  assert.ok(surface > 0.7 && surface < 1);
  river.structure = { kind: "bridge", team: 0, health: 1 };
  assert.ok(Math.abs(tileSurface(river) - (surface + 0.15)) < 1e-9);
});

void test("the animator turns, walks and pops in without touching the simulation", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const animator = createAnimator();
  const bot = state.bots[0];
  bot.facing = [0, 1];
  const first = animator.frame(state, 1, 0).get(bot.id)!;
  assert.equal(first.scale, 1);
  assert.equal(first.walk, 0);
  assert.equal(Math.abs(first.yaw), 0);

  animator.beforeTick(state);
  const start = bot.x;
  bot.x += 0.2;
  bot.facing = [1, 0];
  const snapshot = JSON.stringify(state);
  const half = animator.frame(state, 0.5, 0.05).get(bot.id)!;
  assert.ok(Math.abs(half.x - (start + 0.1)) < 1e-9);
  assert.ok(half.walk > 0 && half.walk < 1);
  // The model turns toward +X, which is a yaw of -90 degrees, but not at once.
  assert.ok(half.yaw < 0 && half.yaw > -Math.PI / 2);
  const stride = half.stride;
  animator.frame(state, 1, 0.05);
  assert.ok(animator.frame(state, 1, 0).get(bot.id)!.stride > stride);
  assert.equal(JSON.stringify(state), snapshot);

  state.adventure.mobs.push({
    id: 7,
    kind: "zombie",
    x: 2,
    z: 2,
    health: 5,
    facing: [0, 1],
    fuse: -1,
    cooldown: 0,
    hurt: 0,
  });
  assert.equal(
    animator.frame(state, 1, 0.01).get(mobKey(7))!.scale < 0.5,
    true,
  );
  for (let frame = 0; frame < 60; frame++) animator.frame(state, 1, 0.016);
  assert.equal(animator.frame(state, 1, 0).get(mobKey(7))!.scale, 1);
  state.adventure.mobs = [];
  assert.equal(animator.frame(state, 1, 0).has(mobKey(7)), false);
});

void test("grass burns away fast, regrows slowly, and trees follow their stock", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const growth = createFloraGrowth();
  const homes = new Set(state.teams.map((team) => team.home.join(":")));
  const meadow = state.tiles.find(
    (tile) =>
      tile.material === "grass" &&
      tile.resource === null &&
      !homes.has(tile.id),
  )!;
  const tree = state.tiles.find((tile) => tile.resource === "wood")!;
  // The first pass adopts the current world without an animation.
  assert.equal(advanceFlora(growth, state, 0), true);
  assert.equal(growth.grass.get(meadow.id), 1);
  assert.equal(advanceFlora(growth, state, 0.1), false);
  const full = createFloraGeometry(state, growth).vertices.length;
  const grown = growth.trees.get(tree.id)!;

  meadow.hazard = "scorch";
  tree.quantity = 1;
  assert.equal(advanceFlora(growth, state, 0.1), true);
  assert.ok(growth.grass.get(meadow.id)! < 1);
  assert.ok(growth.trees.get(tree.id)! < grown);
  for (let tick = 0; tick < 10; tick++) advanceFlora(growth, state, 0.1);
  assert.equal(growth.grass.get(meadow.id), 0);
  assert.ok(createFloraGeometry(state, growth).vertices.length < full);

  delete meadow.hazard;
  advanceFlora(growth, state, 1);
  const sprout = growth.grass.get(meadow.id)!;
  assert.ok(sprout > 0 && sprout < 0.5);
  // The still fallback asks for trees only.
  assert.ok(
    createFloraGeometry(state, undefined, false).vertices.length < full / 2,
  );
});

void test("lights stay within the shader limit and favor torches over lava", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const land = state.tiles.filter((tile) => tile.material === "grass");
  for (const tile of land.slice(0, 30)) tile.hazard = "lava";
  // Primed TNT also shines, and it ranks before the steady lights.
  state.adventure.charges = [];
  const torch = state.tiles.find((tile) => tile.torch) ?? land[40];
  torch.torch = true;
  const lights = collectLights(state, 1);
  assert.equal(lights.count, MAX_LIGHTS);
  assert.equal(lights.positions.length, MAX_LIGHTS * 4);
  assert.equal(lights.colors.length, MAX_LIGHTS * 3);
  assert.ok(Math.abs(lights.positions[0] - (torch.x + 0.22)) < 1e-6);
  for (let index = 0; index < MAX_LIGHTS; index++) {
    assert.ok(lights.positions[index * 4 + 3] > 0);
    assert.ok(lights.colors[index * 3] > 0);
  }
});

const count = (mesh: Mesh, kind: number) => {
  let found = 0;
  for (let offset = 9; offset < mesh.vertices.length; offset += VERTEX_STRIDE)
    if (mesh.vertices[offset] === kind) found++;
  return found;
};
const shadowX = (mesh: Mesh) => {
  for (let offset = 0; offset < mesh.vertices.length; offset += VERTEX_STRIDE)
    if (mesh.vertices[offset + 9] === KIND.shadow) return mesh.vertices[offset];
  return Number.NaN;
};

void test("light sources draw a glow and mobs follow their animated pose", () => {
  const state = createSimulation(INITIAL_SIMULATION_SEED);
  const before = count(createEffectsGeometry(state, 0), KIND.halo);
  state.tiles.find((tile) => tile.material === "grass" && !tile.torch)!.torch =
    true;
  assert.equal(count(createEffectsGeometry(state, 0), KIND.halo), before + 6);

  state.adventure.mobs.push({
    id: 3,
    kind: "skeleton",
    x: 1,
    z: 1,
    health: 5,
    facing: [0, 1],
    fuse: -1,
    cooldown: 0,
    hurt: 0,
  });
  const animator = createAnimator();
  const rest = createEffectsGeometry(state, 0, animator.frame(state, 1, 0));
  animator.beforeTick(state);
  state.adventure.mobs[0].x = 3;
  const moved = createEffectsGeometry(
    state,
    0,
    animator.frame(state, 0.5, 0.05),
  );
  assert.equal(count(moved, KIND.shadow), count(rest, KIND.shadow));
  assert.ok(Math.abs(shadowX(moved) - shadowX(rest) - 1) < 1e-5);
});
