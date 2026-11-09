import assert from "node:assert/strict";
import test from "node:test";
import {
  BOTS_PER_TEAM,
  CARRY_CAPACITY,
  EVENT_LIFETIME,
  MAX_EVENTS,
  MAX_HEALTH,
  RECIPES,
  ROUND_SECONDS,
  STRUCTURE_COSTS,
  createSimulation,
  getSimulationSummary,
  getTile,
  setSelectionPressure,
  stepSimulation,
  type SelectionPressure,
  type SimulationState,
  type SimulationTile,
} from "@/components/home/voxel-simulation";

const SEEDS = [1, 2, 3, 4, 5, 6];

function run(
  state: SimulationState,
  seconds: number,
  onStep?: (before: SimulationState, after: SimulationState) => void,
) {
  for (let step = 0; step < Math.round(seconds * 10); step++) {
    const before = onStep ? structuredClone(state) : state;
    stepSimulation(state, 0.1);
    onStep?.(before, state);
  }
}

function runUntilGeneration(state: SimulationState, generation: number) {
  for (let step = 0; step < 100_000 && state.generation < generation; step++)
    stepSimulation(state, 0.1);
  assert.equal(state.generation, generation);
}

function isWalkable(tile: SimulationTile) {
  if (tile.resource) return false;
  if (tile.structure) return tile.structure.kind === "bridge";
  return tile.material !== "water";
}

function holdings(state: SimulationState) {
  let total = 0;
  for (const team of state.teams) total += team.wood + team.stone;
  for (const bot of state.bots) total += bot.wood + bot.stone;
  return total;
}

function tileQuantity(state: SimulationState) {
  return state.tiles.reduce((sum, tile) => sum + tile.quantity, 0);
}

function attackShare(pressure: SelectionPressure) {
  let attacking = 0;
  let total = 0;
  for (const seed of SEEDS) {
    const state = createSimulation(seed, pressure);
    for (let step = 0; step < 400 && state.generation === 1; step++) {
      stepSimulation(state, 0.1);
      for (const bot of state.bots) {
        if (bot.health <= 0) continue;
        total++;
        if (bot.task === "attack") attacking++;
      }
    }
  }
  return attacking / total;
}

void test("seeded simulations are reproducible and seeds differ", () => {
  const a = createSimulation(42);
  const b = createSimulation(42);
  run(a, 30);
  run(b, 30);
  assert.deepEqual(a, b);
  const c = createSimulation(43);
  run(c, 30);
  assert.notDeepEqual(a.bots, c.bots);
});

void test("the island has walkable flat camps, ledges, water gaps and bounded resources", () => {
  for (const seed of SEEDS) {
    const state = createSimulation(seed);
    assert.equal(state.tiles.length, 21 * 21);
    assert.equal(new Set(state.tiles.map((tile) => tile.id)).size, 441);
    for (const tile of state.tiles) {
      assert.equal(getTile(state, tile.x, tile.z), tile);
      if (Math.hypot(tile.x, tile.z) > 9.5)
        assert.equal(tile.material, "water");
      if (tile.material === "water") assert.equal(tile.height, 0);
      if (Math.hypot(tile.x, tile.z) <= 6 && tile.material !== "water")
        assert.equal(tile.height, 1);
      assert.equal(tile.resource === null, tile.quantity === 0);
      assert.equal(tile.structure, null);
    }
    assert.equal(getTile(state, 11, 0), undefined);
    assert.equal(getTile(state, Number.NaN, 0), undefined);
    assert.ok(state.tiles.some((tile) => tile.height === 2));
    const innerWater = state.tiles.filter(
      (tile) => tile.material === "water" && Math.hypot(tile.x, tile.z) < 6,
    );
    assert.ok(innerWater.length >= 3 && innerWater.length <= 10);
    const wood = state.tiles.filter((tile) => tile.resource === "wood");
    const stone = state.tiles.filter((tile) => tile.resource === "stone");
    assert.ok(wood.length >= 4 && wood.length <= 12);
    assert.ok(stone.length >= 2 && stone.length <= 8);
    for (const [index, team] of state.teams.entries()) {
      const home = getTile(state, ...team.home);
      assert.ok(home && isWalkable(home));
      assert.equal(team.home[0], index === 0 ? -5 : 5);
    }
    assert.equal(state.bots.length, BOTS_PER_TEAM * 2);
    assert.equal(
      new Set(state.bots.map((bot) => `${bot.x}:${bot.z}`)).size,
      state.bots.length,
    );
  }
});

void test("bots move smoothly on walkable tiles and resources are fully accounted for", () => {
  for (const seed of SEEDS.slice(0, 3)) {
    const state = createSimulation(seed);
    run(state, ROUND_SECONDS * 1.5, (before, after) => {
      for (const bot of after.bots) {
        const tile = getTile(after, bot.x, bot.z);
        assert.ok(tile, `${bot.id} left the grid`);
        if (bot.health > 0)
          assert.ok(isWalkable(tile), `${bot.id} on ${tile.id}`);
        assert.ok(bot.wood >= 0 && bot.stone >= 0);
        assert.ok(bot.wood + bot.stone <= CARRY_CAPACITY);
        assert.ok(bot.health >= 0 && bot.health <= MAX_HEALTH);
        assert.ok(Math.abs(Math.hypot(...bot.facing) - 1) < 1e-6);
        if (bot.health <= 0) assert.equal(bot.task, "dead");
      }
      for (const team of after.teams)
        assert.ok(team.wood >= 0 && team.stone >= 0);
      for (const tile of after.tiles) {
        assert.ok(tile.quantity >= 0);
        assert.equal(tile.resource === null, tile.quantity === 0);
      }
      if (before.generation !== after.generation) return;

      const mined = after.metrics.gathered - before.metrics.gathered;
      assert.ok(tileQuantity(after) - tileQuantity(before) + mined >= 0);
      let spent = 0;
      let lost = 0;
      for (const [index, bot] of after.bots.entries()) {
        const previous = before.bots[index];
        const step = Math.hypot(bot.x - previous.x, bot.z - previous.z);
        assert.ok(step <= 0.35, `${bot.id} jumped ${step}`);
        if (previous.tool === "none" && bot.tool !== "none") {
          spent += RECIPES[bot.tool].wood + RECIPES[bot.tool].stone;
        }
        if (previous.health > 0 && bot.health <= 0)
          lost += previous.wood + previous.stone;
        if (previous.health <= 0) {
          assert.equal(bot.x, previous.x);
          assert.equal(bot.z, previous.z);
          assert.equal(bot.action, 0);
        }
      }
      for (const [index, tile] of after.tiles.entries()) {
        if (tile.structure && !before.tiles[index].structure) {
          const cost = STRUCTURE_COSTS[tile.structure.kind];
          spent += cost.wood + cost.stone;
        }
      }
      assert.equal(holdings(after) - holdings(before), mined - spent - lost);
    });
  }
});

void test("gathering, crafting, building and fighting all start early in ordinary runs", () => {
  for (const seed of SEEDS) {
    const state = createSimulation(seed);
    run(state, 6);
    assert.ok(state.metrics.gathered > 0, `seed ${seed} gathered`);
    assert.ok(state.metrics.crafted > 0, `seed ${seed} crafted`);
    assert.ok(state.metrics.hits > 0, `seed ${seed} fought`);
    run(state, 14);
    assert.ok(state.metrics.built > 0, `seed ${seed} built`);
  }
});

void test("crafting spends the recipe from team stock", () => {
  const state = createSimulation(9);
  state.teams[0].wood = 0;
  state.teams[0].stone = 0;
  let crafted = 0;
  run(state, 30, (before, after) => {
    for (const [index, bot] of after.bots.entries()) {
      const previous = before.bots[index];
      if (bot.team !== 0 || previous.tool !== "none" || bot.tool === "none")
        continue;
      crafted++;
      const cost = RECIPES[bot.tool];
      assert.ok(before.teams[0].wood + previous.wood >= cost.wood);
      assert.ok(before.teams[0].stone + previous.stone >= cost.stone);
    }
  });
  const first = createSimulation(9);
  first.teams[0].wood = 0;
  first.teams[0].stone = 0;
  run(first, 1);
  assert.equal(
    first.bots.filter((bot) => bot.team === 0 && bot.tool !== "none").length,
    0,
  );
  assert.ok(crafted > 0, "team 0 crafted after gathering");

  const fresh = createSimulation(9);
  const stock = fresh.teams.map((team) => ({ ...team }));
  for (let step = 0; step < 50 && fresh.metrics.crafted === 0; step++)
    stepSimulation(fresh, 0.1);
  assert.ok(fresh.metrics.crafted > 0);
  for (const team of fresh.teams) {
    let wood = stock[team.id].wood;
    let stoneLeft = stock[team.id].stone;
    for (const bot of fresh.bots) {
      if (bot.team !== team.id || bot.tool === "none") continue;
      wood -= RECIPES[bot.tool].wood;
      stoneLeft -= RECIPES[bot.tool].stone;
    }
    assert.equal(team.wood, wood);
    assert.equal(team.stone, stoneLeft);
  }
  assert.ok(fresh.events.some((event) => event.kind === "craft"));
});

void test("the world changes: nodes deplete, structures appear and walls get destroyed", () => {
  let destroyed = 0;
  let bridges = 0;
  let walls = 0;
  for (const seed of SEEDS) {
    const state = createSimulation(seed, "build");
    const version = state.terrainVersion;
    const initial = tileQuantity(state);
    let sawDepletion = false;
    for (let step = 0; step < 700 && state.generation === 1; step++) {
      stepSimulation(state, 0.1);
      sawDepletion ||= tileQuantity(state) < initial;
      bridges = Math.max(
        bridges,
        state.tiles.filter((tile) => tile.structure?.kind === "bridge").length,
      );
      walls = Math.max(
        walls,
        state.tiles.filter((tile) => tile.structure?.kind === "wall").length,
      );
      destroyed = Math.max(destroyed, state.metrics.destroyed);
      for (const tile of state.tiles) {
        if (tile.structure?.kind === "bridge")
          assert.equal(tile.material, "water");
        if (tile.structure) assert.equal(tile.resource, null);
      }
    }
    assert.ok(sawDepletion);
    assert.ok(state.terrainVersion > version);
  }
  assert.ok(bridges > 0);
  assert.ok(walls > 0);
  assert.ok(destroyed > 0);
});

void test("structures keep both camps connected", () => {
  for (const seed of SEEDS) {
    const state = createSimulation(seed, "build");
    run(state, 40);
    const homes = state.teams.map((team) => getTile(state, ...team.home)!);
    const seen = new Set<SimulationTile>([homes[0]]);
    const queue = [homes[0]];
    while (queue.length > 0) {
      const tile = queue.pop()!;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = getTile(state, tile.x + dx, tile.z + dz);
        if (next && isWalkable(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    assert.ok(seen.has(homes[1]));
  }
});

void test("combat deals damage with cooldowns, retreats heal and deaths stop bots", () => {
  let sawHurt = false;
  let sawHeal = false;
  let sawDeath = false;
  for (const seed of SEEDS) {
    const state = createSimulation(seed);
    run(state, 40, (before, after) => {
      if (before.generation !== after.generation) return;
      for (const [index, bot] of after.bots.entries()) {
        const previous = before.bots[index];
        if (bot.health < previous.health) {
          sawHurt = true;
          assert.ok(bot.hurt > 0);
          assert.ok(
            after.bots.some(
              (other) =>
                other.team !== bot.team &&
                Math.hypot(other.x - bot.x, other.z - bot.z) <= 2,
            ),
            `an enemy is next to ${bot.id}`,
          );
        }
        if (bot.health > previous.health) {
          sawHeal = true;
          const home = after.teams[bot.team].home;
          assert.ok(
            Math.max(Math.abs(bot.x - home[0]), Math.abs(bot.z - home[1])) <=
              1.6,
          );
        }
        if (previous.health > 0 && bot.health <= 0) {
          sawDeath = true;
          assert.equal(bot.task, "dead");
          assert.ok(after.events.some((event) => event.kind === "defeat"));
        }
      }
    });
  }
  assert.ok(sawHurt && sawHeal && sawDeath);
});

function duel() {
  const state = createSimulation(4);
  for (const team of state.teams) {
    team.wood = 0;
    team.stone = 0;
  }
  const spot = state.tiles.find((tile) => {
    const next = getTile(state, tile.x + 1, tile.z);
    return (
      tile.x < -1 && isWalkable(tile) && next !== undefined && isWalkable(next)
    );
  })!;
  const [attacker, victim, bystander] = [
    state.bots[0],
    state.bots[8],
    state.bots[9],
  ];
  Object.assign(attacker, { x: spot.x, z: spot.z, tool: "sword" });
  Object.assign(victim, { x: spot.x + 1, z: spot.z });
  attacker.genome = { aggression: 1, building: 0, caution: 0 };
  victim.genome = { aggression: 0, building: 0, caution: 0 };
  // The bystander keeps team 1 alive so a death does not end the round.
  Object.assign(bystander, { x: 5, z: 1 });
  bystander.genome = { aggression: 0, building: 0, caution: 0 };
  state.bots = [attacker, victim, bystander];
  return { state, attacker, victim };
}

void test("combat respects cooldown, faces the target and dead bots stop", () => {
  const { state, attacker, victim } = duel();
  const hits: number[] = [];
  let deathTime = -1;
  let deathPosition: [number, number] = [0, 0];
  for (let step = 0; step < 200 && state.generation === 1; step++) {
    const health = victim.health;
    stepSimulation(state, 0.1);
    if (victim.health < health) {
      hits.push(state.elapsed);
      assert.equal(health - victim.health, Math.min(health, 2.5));
      assert.ok(victim.hurt > 0);
      assert.ok(attacker.action > 0);
      const dx = victim.x - attacker.x;
      const dz = victim.z - attacker.z;
      const length = Math.hypot(dx, dz);
      assert.ok(length <= 1.6);
      if (length > 0.1)
        assert.ok(
          (attacker.facing[0] * dx + attacker.facing[1] * dz) / length > 0.8,
        );
    }
    if (victim.health <= 0 && deathTime < 0) {
      deathTime = state.elapsed;
      deathPosition = [victim.x, victim.z];
      assert.ok(state.events.some((event) => event.kind === "defeat"));
    }
    if (deathTime >= 0) {
      assert.equal(victim.task, "dead");
      assert.equal(victim.health, 0);
      assert.deepEqual([victim.x, victim.z], deathPosition);
      assert.equal(victim.action, 0);
    }
  }
  assert.ok(hits.length >= 2);
  assert.ok(deathTime > 0);
  for (let index = 1; index < hits.length; index++)
    assert.ok(hits[index] - hits[index - 1] >= 0.7 - 1e-9);
  assert.equal(state.generation, 1);
});

void test("cautious bots retreat home and heal", () => {
  const { state, victim } = duel();
  victim.genome = { aggression: 0, building: 0, caution: 1 };
  victim.health = 5;
  state.bots = state.bots.filter((bot) => bot.team === 1);
  state.bots.push(
    Object.assign(structuredClone(state.bots[1]), {
      id: "far-enemy",
      team: 0 as const,
      x: -5,
      z: 0,
      health: MAX_HEALTH,
    }),
  );
  stepSimulation(state, 0.1);
  assert.equal(victim.task, "retreat");
  for (let step = 0; step < 150 && victim.health < MAX_HEALTH; step++)
    stepSimulation(state, 0.1);
  assert.equal(victim.health, MAX_HEALTH);
  assert.notEqual(victim.task, "retreat");
  const home = state.teams[1].home;
  assert.ok(
    Math.max(Math.abs(victim.x - home[0]), Math.abs(victim.z - home[1])) <= 1.6,
  );
});

void test("bots that meet at exactly the same position separate safely", () => {
  const state = createSimulation(42);
  const [first, second] = state.bots;
  const enemy = state.bots.find((bot) => bot.team === 1)!;
  state.bots = [first, second, enemy];
  for (const bot of [first, second]) {
    [bot.x, bot.z] = state.teams[0].home;
    bot.health = 5;
    bot.task = "retreat";
    bot.genome.caution = 1;
  }
  stepSimulation(state, 0.1);
  assert.ok(Math.hypot(first.x - second.x, first.z - second.z) > 0);
  for (const bot of [first, second]) {
    const tile = getTile(state, bot.x, bot.z);
    assert.ok(tile && isWalkable(tile));
    assert.ok(Math.hypot(bot.x + 5, bot.z) <= 0.35);
  }
});

void test("partial harvesting invalidates the visible resource geometry", () => {
  const state = createSimulation(1847);
  let observed = false;
  for (let step = 0; step < 100; step++) {
    const gathered = state.metrics.gathered;
    const version = state.terrainVersion;
    const quantities = state.tiles.map((tile) => tile.quantity);
    stepSimulation(state, 0.1);
    if (state.metrics.gathered > gathered) {
      const partiallyMined = state.tiles.some(
        (tile, index) => tile.quantity > 0 && tile.quantity < quantities[index],
      );
      if (partiallyMined) {
        assert.ok(state.terrainVersion > version);
        observed = true;
        break;
      }
    }
  }
  assert.ok(observed);
});

void test("rounds end on time or elimination and breed mutated children of fit parents", () => {
  const state = createSimulation(5);
  run(state, ROUND_SECONDS - 1);
  if (state.generation === 1) {
    const parents = structuredClone(state.bots);
    const wins = state.teams[0].wins + state.teams[1].wins;
    run(state, 2);
    assert.equal(state.generation, 2);
    assert.ok(state.teams[0].wins + state.teams[1].wins === wins + 1);
    checkChildren(parents, state);
  }

  const eliminated = createSimulation(6, "battle");
  const previousWins = eliminated.teams[0].wins;
  stepSimulation(eliminated, 0.1);
  for (const bot of eliminated.bots) if (bot.team === 1) bot.health = 0;
  const parents = structuredClone(eliminated.bots);
  stepSimulation(eliminated, 0.1);
  assert.equal(eliminated.generation, 2);
  assert.equal(eliminated.pressure, "battle");
  assert.equal(eliminated.teams[0].wins, previousWins + 1);
  assert.ok(eliminated.elapsed < 1);
  assert.equal(eliminated.metrics.hits, 0);
  assert.ok(eliminated.events.every((event) => event.age < 0.2));
  checkChildren(parents, eliminated);
});

function checkChildren(
  parents: SimulationState["bots"],
  state: SimulationState,
) {
  assert.equal(state.bots.length, BOTS_PER_TEAM * 2);
  const byId = new Map(parents.map((bot) => [bot.id, bot]));
  let mutated = 0;
  for (const child of state.bots) {
    assert.equal(child.fitness, 0);
    assert.equal(child.health, MAX_HEALTH);
    assert.ok(child.parentId);
    const parent = byId.get(child.parentId);
    assert.ok(parent, `parent ${child.parentId} exists`);
    assert.equal(parent.team, child.team);
    for (const trait of ["aggression", "building", "caution"] as const) {
      const value = child.genome[trait];
      assert.ok(value >= 0 && value <= 1);
      assert.ok(Math.abs(value - parent.genome[trait]) <= 0.18 + 1e-9);
      if (value !== parent.genome[trait]) mutated++;
    }
  }
  assert.ok(mutated > 0);
  for (const team of [0, 1] as const) {
    const members = parents.filter((bot) => bot.team === team);
    const best = members.reduce((a, b) => (b.fitness > a.fitness ? b : a));
    const children = state.bots.filter((bot) => bot.team === team);
    assert.ok(children.some((child) => child.parentId === best.id));
    const parentFitness =
      children.reduce(
        (sum, child) => sum + byId.get(child.parentId!)!.fitness,
        0,
      ) / children.length;
    const meanFitness =
      members.reduce((sum, bot) => sum + bot.fitness, 0) / members.length;
    assert.ok(parentFitness >= meanFitness);
  }
}

void test("selection pressure persists and shifts behavior, rewards and evolution", () => {
  const state = createSimulation(7);
  setSelectionPressure(state, "build");
  setSelectionPressure(state, "invalid" as SelectionPressure);
  assert.equal(state.pressure, "build");
  runUntilGeneration(state, 2);
  assert.equal(state.pressure, "build");
  assert.equal(getSimulationSummary(state).pressure, "build");

  assert.ok(attackShare("battle") > attackShare("build") * 1.3);

  let builtUnderBuild = 0;
  let builtUnderBattle = 0;
  for (const seed of SEEDS) {
    const build = createSimulation(seed, "build");
    const battle = createSimulation(seed, "battle");
    run(build, 40);
    run(battle, 40);
    builtUnderBuild += build.metrics.built;
    builtUnderBattle += battle.metrics.built;
  }
  assert.ok(builtUnderBuild > builtUnderBattle);

  // Identical histories get different fitness when only the reward weights differ.
  const balanced = createSimulation(8, "balanced");
  const weighted = createSimulation(8, "balanced");
  run(balanced, 0.1);
  run(weighted, 0.1);
  setSelectionPressure(weighted, "battle");
  setSelectionPressure(balanced, "balanced");
  run(balanced, 20);
  run(weighted, 20);
  assert.notDeepEqual(
    balanced.bots.map((bot) => bot.fitness),
    weighted.bots.map((bot) => bot.fitness),
  );

  // Over several generations the population evolves toward the rewarded traits.
  let battleAggression = 0;
  let buildAggression = 0;
  let buildBuilding = 0;
  let battleBuilding = 0;
  for (const seed of SEEDS) {
    const battle = createSimulation(seed, "battle");
    const build = createSimulation(seed, "build");
    runUntilGeneration(battle, 7);
    runUntilGeneration(build, 7);
    const battleTraits = getSimulationSummary(battle).traits;
    const buildTraits = getSimulationSummary(build).traits;
    battleAggression += battleTraits[0].aggression + battleTraits[1].aggression;
    buildAggression += buildTraits[0].aggression + buildTraits[1].aggression;
    battleBuilding += battleTraits[0].building + battleTraits[1].building;
    buildBuilding += buildTraits[0].building + buildTraits[1].building;
  }
  assert.ok(battleAggression > buildAggression);
  assert.ok(buildBuilding > battleBuilding);
});

void test("events stay bounded, age and keep unique ids", () => {
  const state = createSimulation(2, "battle");
  let lastId = 0;
  run(state, 90, (_, after) => {
    assert.ok(after.events.length <= MAX_EVENTS);
    for (const event of after.events) {
      assert.ok(event.age >= 0 && event.age <= EVENT_LIFETIME);
      assert.ok(event.team === 0 || event.team === 1);
    }
    const ids = after.events.map((event) => event.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      if (id > lastId) lastId = id;
    }
  });
  assert.ok(lastId > MAX_EVENTS);
});

void test("invalid and oversized time steps are handled safely", () => {
  const state = createSimulation(11);
  const snapshot = structuredClone(state);
  for (const value of [
    Number.NaN,
    -1,
    0,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ])
    stepSimulation(state, value);
  assert.deepEqual(state, snapshot);
  stepSimulation(state, 1000);
  assert.ok(Math.abs(state.elapsed - 1) < 1e-9);
  assert.equal(state.generation, 1);
});

void test("summary reports alive counts, mean traits, time left and copied metrics", () => {
  const state = createSimulation(12);
  run(state, 10);
  const summary = getSimulationSummary(state);
  assert.equal(summary.generation, state.generation);
  assert.ok(
    Math.abs(summary.remaining - (ROUND_SECONDS - state.elapsed)) < 1e-9,
  );
  for (const team of [0, 1] as const) {
    const members = state.bots.filter((bot) => bot.team === team);
    assert.equal(
      summary.alive[team],
      members.filter((bot) => bot.health > 0).length,
    );
    const mean =
      members.reduce((sum, bot) => sum + bot.genome.aggression, 0) /
      members.length;
    assert.ok(Math.abs(summary.traits[team].aggression - mean) < 1e-9);
  }
  assert.deepEqual(summary.metrics, state.metrics);
  summary.metrics.hits = -1;
  assert.notEqual(state.metrics.hits, -1);
});
