import assert from "node:assert/strict";
import test from "node:test";
import { defined } from "./support/defined";
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
  const tile = defined(getTile(state, x, z));
  tile.resource = null;
  tile.quantity = 0;
  tile.structure = null;
  tile.hazard = undefined;
  tile.fire = 0;
  return tile;
}

void test("the live world is deterministic and the opening has real consequences", () => {
  const a = createSimulation(1847);
  const b = createSimulation(1847);
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
  const victim = defined(state.bots[0]);
  victim.x = -3;
  victim.z = -1;
  clearGround(state, -3, -1);
  const owner = defined(state.bots.find((bot) => bot.team === 1));
  for (const [id, x, fuse] of [
    [80, -2, 0.1],
    [81, -1, 4],
  ] as const)
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
      power: 2.4,
    });
  const height = center.height;
  const fitness = owner.fitness;
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
  const owner = defined(state.bots[0]);
  const enemy = defined(state.bots.find((bot) => bot.team === 1));
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
  assert.equal(defined(state.adventure.charges[0]).owner, owner.id);
  assert.ok(defined(state.adventure.charges[0]).flight > 0);
});

void test("bots spend carried wood to place useful torches", () => {
  const state = createSimulation(4);
  isolate(state);
  for (const bot of state.bots) {
    bot.genome.aggression = 0;
    bot.genome.building = 0;
  }
  const builder = defined(state.bots[0]);
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
  const target = defined(state.bots[0]);
  const enemy = defined(state.bots.find((bot) => bot.team === 1));
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
  const target = defined(state.bots[0]);
  const enemy = defined(state.bots.find((bot) => bot.team === 1));
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
  assert.ok(defined(state.adventure.mobs[0]).fuse > 0);
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
  // Dawn time differs per round. Pin it so that the night is over by now.
  state.adventure.mood.dawn = 0.8;
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
  assert.ok(defined(state.adventure.mobs[0]).health < 8);
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
      const tile = defined(getTile(state, bot.x, bot.z));
      assert.ok(!tile.resource && tile.hazard !== "lava" && !(tile.fire ?? 0));
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

void test("rounds differ in pace, blast size, opening charges and camp position", () => {
  const moods = new Set<string>();
  const openings = new Set<number>();
  const camps = new Set<string>();
  const storms = new Set<boolean>();
  for (let seed = 1; seed <= 40; seed++) {
    const state = createSimulation(seed);
    const { mood, charges, nextStorm } = state.adventure;
    assert.deepEqual(createSimulation(seed).adventure, state.adventure);
    assert.ok(mood.blast >= 0.7 && mood.blast <= 1.4);
    assert.ok(mood.waveGap >= 0.5 && mood.waveGap <= 1.6);
    assert.ok(mood.dusk < mood.dawn);
    assert.ok(charges.length <= 3);
    for (const placed of charges) {
      assert.ok(placed.power >= 2.4 * 0.7 * 0.85 - 1e-9);
      assert.ok(placed.power <= 2.4 * 1.4 * 1.2 + 1e-9);
    }
    moods.add(mood.blast.toFixed(2));
    openings.add(charges.length);
    camps.add(state.teams[0].home.join(":"));
    storms.add(nextStorm < 6);
  }
  assert.ok(moods.size > 20);
  assert.equal(openings.size, 4);
  assert.ok(camps.size >= 6);
  assert.equal(storms.size, 2);
});

const blastRadius = (power: number) => {
  const world = createSimulation(7);
  isolate(world);
  world.adventure.charges.push({
    id: 90,
    x: 3,
    z: 0,
    fuse: 0.05,
    owner: null,
    chain: 0,
    originX: 3,
    originZ: 0,
    flight: 0,
    power,
  });
  stepSimulation(world, 0.1);
  return world.events.find((event) => event.kind === "explode")?.power;
};
const zombie = (state: SimulationState) =>
  state.adventure.mobs.push({
    id: 60,
    kind: "zombie",
    x: -3,
    z: 1.5,
    health: 8,
    facing: [0, 1],
    fuse: -1,
    cooldown: 5,
    hurt: 0,
  });

void test("a charge blasts with its own power", () => {
  assert.equal(blastRadius(1.5), 1.5);
  assert.equal(blastRadius(3.6), 3.6);
});

function loneBot(state: SimulationState, aggression: number, caution: number) {
  const bot = defined(state.bots[0]);
  // A round ends when a camp has no bots, so one peaceful rival stays.
  const rival = defined(state.bots.find((other) => other.team === 1));
  rival.genome = { aggression: 0, building: 0, caution: 0 };
  state.bots = [bot, rival];
  bot.genome = { aggression, building: 0, caution };
  bot.x = -3;
  bot.z = 3;
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++) clearGround(state, -3 + dx, 3 + dz);
  return bot;
}

function charge(x: number, z: number, fuse: number, power: number) {
  return {
    id: 70,
    x,
    z,
    fuse,
    owner: null,
    chain: 0,
    originX: x,
    originZ: z,
    flight: 0,
    power,
  };
}

void test("cautious bots run out of a blast and reckless bots ignore the fuse", () => {
  const fled = createSimulation(7);
  isolate(fled);
  const careful = loneBot(fled, 0.5, 0.9);
  fled.adventure.charges.push(charge(-3, 2, 2.5, 2));
  stepSimulation(fled, 0.1);
  assert.equal(careful.task, "flee");
  run(fled, 2.3);
  assert.ok(Math.hypot(careful.x + 3, careful.z - 2) > 2.6);
  const tile = getTile(fled, careful.x, careful.z);
  assert.ok(tile && tile.material !== "water" && tile.hazard !== "lava");
  run(fled, 1);
  assert.equal(careful.health, 10);
  assert.notEqual(careful.task, "flee");

  // The same bot waits for a long fuse to burn down before it runs.
  const patient = createSimulation(7);
  isolate(patient);
  const waiting = loneBot(patient, 0.5, 0.4);
  patient.adventure.charges.push(charge(-3, 2, 6, 2));
  stepSimulation(patient, 0.1);
  assert.notEqual(waiting.task, "flee");

  const stayed = createSimulation(7);
  isolate(stayed);
  const reckless = loneBot(stayed, 0.5, 0.1);
  stayed.adventure.charges.push(charge(-3, 2, 1, 2));
  run(stayed, 0.8);
  assert.notEqual(reckless.task, "flee");
});

void test("timid bots run from monsters and attackers, bold bots fight them", () => {
  const scared = createSimulation(7);
  isolate(scared);
  scared.adventure.storm = 100;
  const timid = loneBot(scared, 0.1, 0.9);
  zombie(scared);
  stepSimulation(scared, 0.1);
  assert.equal(timid.task, "flee");
  run(scared, 1);
  const mob = defined(scared.adventure.mobs[0]);
  assert.ok(Math.hypot(timid.x - mob.x, timid.z - mob.z) > 1.5);

  const brave = createSimulation(7);
  isolate(brave);
  brave.adventure.storm = 100;
  const bold = loneBot(brave, 0.9, 0.2);
  zombie(brave);
  stepSimulation(brave, 0.1);
  assert.equal(bold.task, "defend");

  const hunted = createSimulation(7);
  isolate(hunted);
  const prey = loneBot(hunted, 0.1, 0.9);
  const attacker = defined(hunted.bots[1]);
  attacker.x = -3;
  attacker.z = 2;
  attacker.task = "idle";
  stepSimulation(hunted, 0.1);
  // An enemy that only passes by is no reason to run.
  assert.notEqual(prey.task, "flee");
  attacker.task = "attack";
  stepSimulation(hunted, 0.1);
  assert.equal(prey.task, "flee");
});

void test("a bot that flees for too long turns and stops running", () => {
  const state = createSimulation(7);
  isolate(state);
  state.adventure.storm = 100;
  const bot = loneBot(state, 0.1, 0.9);
  let fleeing = 0;
  for (let tick = 0; tick < 120; tick++) {
    // The monster always stays right behind the bot.
    state.adventure.mobs = [
      {
        id: 61,
        kind: "zombie",
        x: bot.x,
        z: bot.z - 0.6,
        health: 8,
        facing: [0, 1],
        fuse: -1,
        cooldown: 5,
        hurt: 0,
      },
    ];
    stepSimulation(state, 0.1);
    if (bot.task === "flee") fleeing++;
  }
  assert.ok(fleeing > 20 && fleeing < 80);
});
