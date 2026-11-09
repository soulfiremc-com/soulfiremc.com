import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ARROWS,
  MAX_CHARGES,
  MAX_LAVA,
  MAX_MOBS,
  MAX_TORCHES,
} from "@/components/home/voxel-adventure";
import {
  createSimulation,
  getTile,
  stepSimulation,
  triggerBreach,
  triggerStorm,
} from "@/components/home/voxel-simulation";
import type { SimulationState } from "@/components/home/voxel-simulation-types";

function run(state: SimulationState, seconds: number) {
  for (let tick = 0; tick < Math.round(seconds * 10); tick++)
    stepSimulation(state, 0.1);
}

function isolate(state: SimulationState) {
  const world = state.adventure;
  world.nextStorm =
    world.nextBolt =
    world.nextWave =
    world.nextSiege =
    world.nextLava =
      Infinity;
  world.charges = [];
  world.mobs = [];
  world.arrows = [];
}

function clearGround(state: SimulationState, x: number, z: number) {
  const tile = getTile(state, x, z)!;
  tile.resource = null;
  tile.quantity = 0;
  tile.structure = null;
  tile.hazard = undefined;
  tile.fire = 0;
  return tile;
}

void test("the live world is deterministic and the opening has real consequences", () => {
  const a = createSimulation(1847),
    b = createSimulation(1847);
  const kinds = new Set<string>();
  for (let tick = 0; tick < 200; tick++) {
    stepSimulation(a, 0.1);
    stepSimulation(b, 0.1);
    for (const event of a.events) kinds.add(event.kind);
  }
  assert.deepEqual(a, b);
  assert.ok(
    kinds.has("explode") && kinds.has("lightning") && kinds.has("spawn"),
  );
  assert.ok(
    a.metrics.gathered > 0 &&
      a.metrics.crafted > 0 &&
      a.metrics.built > 0 &&
      a.metrics.hits > 0,
  );
  assert.ok(a.tiles.some((tile) => tile.height > 0 && tile.height < 1));
  assert.ok(a.tiles.some((tile) => tile.hazard === "lava"));
});

void test("TNT chains, destroys defenses, deforms terrain and hurts bots", () => {
  const state = createSimulation(7);
  isolate(state);
  const center = clearGround(state, -2, -1);
  const wall = clearGround(state, -2, 0);
  wall.structure = { kind: "wall", team: 0, health: 8 };
  const victim = state.bots[0];
  victim.x = -3;
  victim.z = -1;
  clearGround(state, -3, -1);
  const owner = state.bots.find((bot) => bot.team === 1)!;
  for (const [id, x, fuse] of [
    [80, -2, 0.1],
    [81, -1, 4],
  ])
    state.adventure.charges.push({
      id,
      x,
      z: -1,
      fuse,
      owner: owner.id,
      chain: 0,
      originX: x,
      originZ: -1,
      flight: 0,
    });
  const height = center.height,
    fitness = owner.fitness;
  run(state, 0.5);
  assert.equal(state.adventure.charges.length, 0);
  assert.equal(
    state.events.filter((event) => event.kind === "explode").length,
    2,
  );
  assert.equal(wall.structure, null);
  assert.ok(center.height < height);
  assert.ok(victim.health < 10);
  assert.ok(owner.fitness > fitness);
});

void test("manual inputs are bounded, have cooldowns and freeze without simulation ticks", () => {
  const state = createSimulation(3);
  assert.equal(triggerBreach(state), true);
  assert.ok(state.adventure.charges.length <= MAX_CHARGES);
  assert.equal(triggerBreach(state), false);
  assert.equal(triggerStorm(state), true);
  assert.equal(triggerStorm(state), false);
  const snapshot = structuredClone(state);
  stepSimulation(state, 0);
  assert.deepEqual(state, snapshot);
  run(state, 6);
  assert.equal(triggerBreach(state), true);
  assert.equal(triggerStorm(state), false);
});

void test("siege kits consume team stock and retain the crafting bot as owner", () => {
  const state = createSimulation(4);
  isolate(state);
  const owner = state.bots[0],
    enemy = state.bots.find((bot) => bot.team === 1)!;
  state.bots = [owner, enemy];
  owner.x = -5;
  owner.z = 0;
  owner.tool = "pickaxe";
  owner.task = "retreat";
  owner.genome.aggression = 1;
  enemy.task = "retreat";
  state.teams[1].wood = state.teams[1].stone = 0;
  state.teams[0].wood = state.teams[0].stone = 5;
  state.adventure.nextSiege = 0;
  stepSimulation(state, 0.1);
  assert.equal(state.teams[0].wood, 4);
  assert.equal(state.teams[0].stone, 4);
  assert.equal(state.metrics.crafted, 1);
  assert.equal(state.adventure.charges[0].owner, owner.id);
  assert.ok(state.adventure.charges[0].flight > 0);
});

void test("bots spend carried wood to place useful torches", () => {
  const state = createSimulation(4);
  isolate(state);
  for (const bot of state.bots) {
    bot.genome.aggression = 0;
    bot.genome.building = 0;
  }
  const builder = state.bots[0];
  builder.x = -3;
  builder.z = 3;
  builder.wood = 1;
  builder.genome.caution = 1;
  const tile = clearGround(state, -3, 3);
  state.adventure.nextSiege = 0;
  stepSimulation(state, 0.1);
  assert.equal(tile.torch, true);
  assert.equal(builder.wood, 0);
  assert.equal(state.metrics.built, 1);
});

void test("skeletons fire moving arrows that can hit bots", () => {
  const state = createSimulation(5);
  isolate(state);
  const target = state.bots[0],
    enemy = state.bots.find((bot) => bot.team === 1)!;
  state.bots = [target, enemy];
  target.x = -5;
  target.z = 0;
  enemy.x = 5;
  enemy.z = 0;
  target.genome.aggression = 0;
  target.genome.caution = 1;
  for (let x = -5; x <= -2; x++) clearGround(state, x, 0);
  state.adventure.storm = 100;
  state.adventure.mobs.push({
    id: 80,
    kind: "skeleton",
    x: -2,
    z: 0,
    health: 6,
    facing: [-1, 0],
    fuse: -1,
    cooldown: 0,
    hurt: 0,
  });
  let sawArrow = false,
    sawHit = false;
  for (let tick = 0; tick < 60; tick++) {
    target.task = enemy.task = "retreat";
    stepSimulation(state, 0.1);
    sawArrow ||= state.adventure.arrows.some((arrow) => arrow.x < -2);
    sawHit ||= target.hurt > 0;
  }
  assert.ok(sawArrow);
  assert.ok(sawHit);
});

void test("a nearby creeper primes its fuse and explodes", () => {
  const state = createSimulation(5);
  isolate(state);
  const target = state.bots[0],
    enemy = state.bots.find((bot) => bot.team === 1)!;
  state.bots = [target, enemy];
  target.x = -5;
  target.z = 0;
  target.genome.caution = 0;
  clearGround(state, -4, 0);
  state.adventure.mobs.push({
    id: 80,
    kind: "creeper",
    x: -4,
    z: 0,
    health: 6,
    facing: [-1, 0],
    fuse: -1,
    cooldown: 0,
    hurt: 0,
  });
  stepSimulation(state, 0.1);
  assert.ok(state.adventure.mobs[0].fuse > 0);
  run(state, 2);
  assert.ok(state.events.some((event) => event.kind === "explode"));
  assert.ok(target.health < 10);
});

void test("night mobs avoid torchlit spawns and burn after dawn", () => {
  const state = createSimulation(30);
  isolate(state);
  state.adventure.storm = 100;
  state.adventure.nextWave = 0;
  for (let tick = 0; tick < 100; tick++) {
    const existing = new Set(state.adventure.mobs.map((mob) => mob.id));
    stepSimulation(state, 0.1);
    for (const mob of state.adventure.mobs)
      if (!existing.has(mob.id) && mob.kind !== "creeper")
        assert.ok(
          !state.tiles.some(
            (tile) =>
              tile.torch && Math.hypot(tile.x - mob.x, tile.z - mob.z) < 2.7,
          ),
        );
  }
  isolate(state);
  state.adventure.storm = 0;
  state.elapsed = 73;
  state.adventure.mobs.push({
    id: 90,
    kind: "zombie",
    x: 0,
    z: 8,
    health: 8,
    facing: [1, 0],
    fuse: -1,
    cooldown: 1,
    hurt: 0,
  });
  stepSimulation(state, 0.1);
  assert.ok(state.adventure.night < 0.2);
  assert.ok(state.adventure.mobs[0].health < 8);
});

void test("the full ecosystem stays bounded and preserves traversable bot positions", () => {
  const state = createSimulation(1847, "battle");
  let previous = state.generation;
  for (let tick = 0; tick < 1200; tick++) {
    stepSimulation(state, 0.1);
    assert.ok(state.adventure.mobs.length <= MAX_MOBS);
    assert.ok(state.adventure.charges.length <= MAX_CHARGES);
    assert.ok(state.adventure.arrows.length <= MAX_ARROWS);
    assert.ok(
      state.tiles.filter((tile) => tile.hazard === "lava").length <= MAX_LAVA,
    );
    assert.ok(state.tiles.filter((tile) => tile.torch).length <= MAX_TORCHES);
    for (const bot of state.bots) {
      assert.ok(Number.isFinite(bot.x) && Number.isFinite(bot.z));
      assert.ok(bot.wood >= 0 && bot.stone >= 0);
      if (bot.health <= 0) continue;
      const tile = getTile(state, bot.x, bot.z)!;
      assert.ok(
        tile && !tile.resource && tile.hazard !== "lava" && !(tile.fire ?? 0),
      );
      assert.ok(tile.material !== "water" || tile.structure?.kind === "bridge");
      assert.notEqual(tile.structure?.kind, "wall");
    }
    for (const team of state.teams)
      assert.ok(team.wood >= 0 && team.stone >= 0);
    if (state.generation !== previous) {
      assert.ok(state.bots.every((bot) => bot.parentId));
      assert.equal(state.pressure, "battle");
      previous = state.generation;
    }
  }
  assert.ok(state.generation > 1);
});
