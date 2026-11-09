import type {
  AdventureState,
  SimulationBot,
  SimulationEvent,
  SimulationMob,
  SimulationState,
  SimulationTile,
} from "./voxel-simulation-types";

export const MAX_MOBS = 6;
export const MAX_CHARGES = 4;
export const MAX_ARROWS = 8;
export const MAX_LAVA = 10;
export const MAX_TORCHES = 8;

export interface AdventureHost {
  tile: (x: number, z: number) => SimulationTile | undefined;
  walkable: (tile: SimulationTile) => boolean;
  hurt: (bot: SimulationBot, amount: number, owner: string | null) => void;
  reward: (
    bot: SimulationBot,
    kind: "economy" | "build" | "combat",
    amount: number,
  ) => void;
  emit: (
    kind: SimulationEvent["kind"],
    x: number,
    z: number,
    power?: number,
  ) => void;
  settle: () => void;
}

function random(world: AdventureState) {
  world.rng = (Math.imul(world.rng, 1664525) + 1013904223) >>> 0;
  return world.rng / 4294967296;
}

export function createAdventure(
  seed: number,
  generation: number,
  enabled: boolean,
): AdventureState {
  return {
    enabled,
    rng: (seed ^ Math.imul(generation, 0x9e3779b1)) >>> 0,
    nextId: 1,
    night: 0,
    storm: 0,
    charges: [],
    mobs: [],
    arrows: [],
    nextWave: 2,
    nextSiege: 8,
    nextStorm: 0.8,
    nextBolt: 0,
    nextLava: 4,
    breachReadyAt: 0,
    stormReadyAt: 0,
  };
}

function protectedGround(state: SimulationState, tile: SimulationTile) {
  return (
    state.teams.some(
      ({ home: [x, z] }) =>
        Math.max(Math.abs(tile.x - x), Math.abs(tile.z - z)) <= 1.5,
    ) ||
    (Math.abs(tile.x) <= 1 && Math.abs(tile.z) >= 4)
  );
}

function safeTile(tile: SimulationTile) {
  return (
    tile.material !== "water" &&
    !tile.resource &&
    !tile.structure &&
    tile.hazard !== "lava"
  );
}

function armCharge(
  state: SimulationState,
  x: number,
  z: number,
  owner: SimulationBot | null,
  fuse: number,
) {
  const world = state.adventure;
  if (world.charges.length >= MAX_CHARGES) return false;
  const tile = state.tiles
    .filter((tile) => safeTile(tile) && !protectedGround(state, tile))
    .sort(
      (a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
    )[0];
  if (!tile) return false;
  world.charges.push({
    id: world.nextId++,
    x: tile.x,
    z: tile.z,
    fuse,
    owner: owner?.id ?? null,
    chain: 0,
    originX: owner?.x ?? tile.x,
    originZ: owner?.z ?? tile.z,
    flight: owner ? 0.8 : 0,
  });
  return true;
}

export function decorateAdventure(state: SimulationState) {
  if (!state.adventure.enabled) return;
  for (const team of state.teams) {
    for (const offset of [-1, 1]) {
      const tile = state.tiles.find(
        (tile) => tile.x === team.home[0] && tile.z === team.home[1] + offset,
      );
      if (tile) tile.torch = true;
    }
  }
  armCharge(state, -2, -1, null, 3.2);
  armCharge(state, 2, 1, null, 3.8);
}

export function primeBreach(state: SimulationState) {
  if (
    !state.adventure.enabled ||
    state.elapsed < state.adventure.breachReadyAt ||
    state.adventure.charges.length >= MAX_CHARGES
  )
    return false;
  const offset = random(state.adventure) * 4 - 2;
  const first = armCharge(state, -2, offset, null, 2.1);
  const second = armCharge(state, 2, -offset, null, 2.6);
  if (first || second) state.adventure.breachReadyAt = state.elapsed + 5;
  state.adventure.nextWave = Math.min(
    state.adventure.nextWave,
    state.elapsed + 0.2,
  );
  return first || second;
}

export function summonStorm(state: SimulationState) {
  if (!state.adventure.enabled || state.elapsed < state.adventure.stormReadyAt)
    return false;
  state.adventure.storm = 12;
  state.adventure.nextBolt = state.elapsed;
  state.adventure.stormReadyAt = state.elapsed + 15;
  state.adventure.nextStorm = state.elapsed + 26;
  return true;
}

function blast(
  state: SimulationState,
  host: AdventureHost,
  x: number,
  z: number,
  radius: number,
  owner: string | null,
  chain = 0,
) {
  host.emit("explode", x, z, radius);
  for (const tile of state.tiles) {
    const distance = Math.hypot(tile.x - x, tile.z - z);
    if (distance > radius || protectedGround(state, tile)) continue;
    if (tile.structure) {
      tile.structure = null;
      state.metrics.destroyed++;
    }
    tile.resource = null;
    tile.quantity = 0;
    tile.torch = false;
    tile.fire = 0;
    if (tile.material !== "water") {
      tile.height = Math.max(0.35, tile.height - (1 - distance / radius) * 0.7);
      tile.hazard = tile.hazard === "lava" ? "lava" : "scorch";
      if (
        Math.abs(tile.x) < 1.6 &&
        Math.abs(tile.z) < 3.5 &&
        tile.height < 0.65 &&
        state.tiles.filter((tile) => tile.hazard === "lava").length < MAX_LAVA
      )
        tile.hazard = "lava";
    } else if (
      Math.abs(tile.x) < 1.6 &&
      Math.abs(tile.z) < 3.5 &&
      state.tiles.filter((tile) => tile.hazard === "lava").length < MAX_LAVA
    ) {
      tile.hazard = "lava";
    }
  }
  state.terrainVersion++;
  for (const bot of state.bots) {
    if (bot.health <= 0) continue;
    const distance = Math.hypot(bot.x - x, bot.z - z);
    if (distance < radius + 0.3)
      host.hurt(bot, Math.max(1, 8 * (1 - distance / (radius + 0.3))), owner);
  }
  for (const mob of state.adventure.mobs) {
    if (Math.hypot(mob.x - x, mob.z - z) < radius) {
      mob.health = Math.max(0, mob.health - 7);
      mob.hurt = 0.3;
    }
  }
  for (const charge of state.adventure.charges) {
    if (chain < 3 && Math.hypot(charge.x - x, charge.z - z) < radius + 0.7) {
      charge.fuse = Math.min(charge.fuse, 0.2);
      charge.chain = chain + 1;
    }
  }
  host.settle();
}

function moveMob(
  mob: SimulationMob,
  x: number,
  z: number,
  distance: number,
  host: AdventureHost,
) {
  const dx = x - mob.x,
    dz = z - mob.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) return;
  mob.facing = [dx / length, dz / length];
  const step = Math.min(distance, length);
  for (const rotation of [0, 0.8, -0.8, 1.5, -1.5]) {
    const vx =
      (dx / length) * Math.cos(rotation) - (dz / length) * Math.sin(rotation);
    const vz =
      (dx / length) * Math.sin(rotation) + (dz / length) * Math.cos(rotation);
    const nextX = mob.x + vx * step,
      nextZ = mob.z + vz * step;
    const tile = host.tile(nextX, nextZ);
    if (tile && host.walkable(tile)) {
      mob.x = nextX;
      mob.z = nextZ;
      return;
    }
  }
}

function spawnMob(
  state: SimulationState,
  host: AdventureHost,
  kind: SimulationMob["kind"],
) {
  const world = state.adventure;
  if (world.mobs.length >= MAX_MOBS) return;
  const torches = state.tiles.filter((tile) => tile.torch);
  const candidates = state.tiles.filter(
    (tile) =>
      host.walkable(tile) &&
      Math.hypot(tile.x, tile.z) > 4 &&
      Math.hypot(tile.x, tile.z) < 7.5 &&
      !protectedGround(state, tile) &&
      (kind === "creeper" ||
        !torches.some(
          (torch) => Math.hypot(torch.x - tile.x, torch.z - tile.z) < 3,
        )),
  );
  const tile = candidates[Math.floor(random(world) * candidates.length)];
  if (!tile) return;
  world.mobs.push({
    id: world.nextId++,
    kind,
    x: tile.x,
    z: tile.z,
    health: kind === "creeper" ? 8 : kind === "zombie" ? 8 : 6,
    facing: [1, 0],
    fuse: -1,
    cooldown: 0.6,
    hurt: 0,
  });
  host.emit("spawn", tile.x, tile.z);
}

function updateMobs(state: SimulationState, host: AdventureHost, dt: number) {
  const world = state.adventure;
  world.mobs = world.mobs.filter((mob) => mob.health > 0);
  for (const mob of world.mobs) {
    mob.cooldown = Math.max(0, mob.cooldown - dt);
    mob.hurt = Math.max(0, mob.hurt - dt);
    const ground = host.tile(mob.x, mob.z);
    if (ground?.hazard === "lava") {
      mob.health = 0;
      continue;
    }
    if ((ground?.fire ?? 0) > 0) mob.health = Math.max(0, mob.health - dt * 2);
    const target = state.bots
      .filter((bot) => bot.health > 0)
      .sort(
        (a, b) =>
          Math.hypot(a.x - mob.x, a.z - mob.z) -
          Math.hypot(b.x - mob.x, b.z - mob.z),
      )[0];
    if (!target) continue;
    const distance = Math.hypot(target.x - mob.x, target.z - mob.z);
    mob.facing =
      distance > 0.01
        ? [(target.x - mob.x) / distance, (target.z - mob.z) / distance]
        : mob.facing;
    if (mob.kind === "creeper") {
      if (distance < 1.7 && mob.fuse < 0) mob.fuse = 1.5;
      if (mob.fuse >= 0) {
        mob.fuse -= dt;
        if (mob.fuse <= 0) {
          mob.health = 0;
          blast(state, host, mob.x, mob.z, 2.1, null);
          continue;
        }
      } else moveMob(mob, target.x, target.z, 1.65 * dt, host);
    } else if (mob.kind === "skeleton") {
      if (distance > 5) moveMob(mob, target.x, target.z, 1.2 * dt, host);
      else if (distance < 2.5)
        moveMob(
          mob,
          mob.x - (target.x - mob.x),
          mob.z - (target.z - mob.z),
          dt,
          host,
        );
      if (
        distance < 6.5 &&
        distance > 0.1 &&
        mob.cooldown <= 0 &&
        world.arrows.length < MAX_ARROWS
      ) {
        const height = host.tile(mob.x, mob.z)?.height ?? 1;
        const targetHeight = host.tile(target.x, target.z)?.height ?? 1;
        const travel = distance / 7;
        world.arrows.push({
          id: world.nextId++,
          x: mob.x,
          y: height + 0.8,
          z: mob.z,
          vx: ((target.x - mob.x) / distance) * 7,
          vz: ((target.z - mob.z) / distance) * 7,
          vy:
            (targetHeight + 0.45 - (height + 0.8) + 1.5 * travel * travel) /
            travel,
          age: 0,
          stuck: false,
        });
        mob.cooldown = 1.8;
      }
    } else {
      if (distance > 1.05) moveMob(mob, target.x, target.z, 1.2 * dt, host);
      else if (mob.cooldown <= 0) {
        host.hurt(target, 1.8, null);
        mob.cooldown = 1.1;
      }
    }
    if (mob.kind !== "creeper" && world.night < 0.2)
      mob.health = Math.max(0, mob.health - dt * 0.7);
  }
}

function updateArrows(state: SimulationState, host: AdventureHost, dt: number) {
  for (const arrow of state.adventure.arrows) {
    arrow.age += dt;
    if (arrow.stuck) continue;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    arrow.z += arrow.vz * dt;
    arrow.vy -= 3 * dt;
    const tile = host.tile(arrow.x, arrow.z);
    if (!tile) {
      arrow.age = 4;
      continue;
    }
    const obstacle =
      tile.height +
      (tile.structure?.kind === "wall" ? 0.9 : tile.resource ? 0.7 : 0);
    if (arrow.y < obstacle) {
      arrow.stuck = true;
      arrow.age = 2.3;
      continue;
    }
    const victim = state.bots.find(
      (bot) =>
        bot.health > 0 &&
        Math.hypot(bot.x - arrow.x, bot.z - arrow.z) < 0.45 &&
        Math.abs(arrow.y - (host.tile(bot.x, bot.z)?.height ?? 1) - 0.45) <
          0.65,
    );
    if (victim) {
      host.hurt(victim, 1.5, null);
      arrow.age = 4;
    }
  }
  state.adventure.arrows = state.adventure.arrows.filter(
    (arrow) => arrow.age < 3,
  );
}

function strike(state: SimulationState, host: AdventureHost) {
  const candidates = state.tiles.filter(
    (tile) =>
      (tile.resource || tile.structure) && !protectedGround(state, tile),
  );
  const tile =
    candidates[Math.floor(random(state.adventure) * candidates.length)];
  if (!tile) return;
  host.emit("lightning", tile.x, tile.z, 1);
  if (tile.structure) {
    tile.structure = null;
    state.metrics.destroyed++;
  }
  tile.resource = null;
  tile.quantity = 0;
  tile.fire = 5;
  tile.hazard = "scorch";
  tile.torch = false;
  state.terrainVersion++;
  for (const bot of state.bots)
    if (Math.hypot(bot.x - tile.x, bot.z - tile.z) < 1) host.hurt(bot, 3, null);
  host.settle();
}

function siege(state: SimulationState, host: AdventureHost) {
  const candidates = state.bots
    .filter((bot) => bot.health > 0 && bot.genome.aggression > 0.4)
    .sort((a, b) => b.genome.aggression - a.genome.aggression);
  for (const bot of candidates) {
    const camp = state.teams[bot.team];
    if (
      camp.wood < 1 ||
      camp.stone < 1 ||
      Math.hypot(bot.x - camp.home[0], bot.z - camp.home[1]) > 3
    )
      continue;
    const target = state.tiles.find(
      (tile) =>
        tile.structure?.kind === "wall" && tile.structure.team !== bot.team,
    );
    if (
      armCharge(
        state,
        target?.x ?? (bot.team === 0 ? 2 : -2),
        target?.z ?? 0,
        bot,
        2.8,
      )
    ) {
      camp.wood--;
      camp.stone--;
      state.metrics.crafted++;
      bot.action = 0.3;
      host.emit("craft", bot.x, bot.z);
      host.reward(bot, "economy", 1);
      return;
    }
  }
}

function buildTorches(state: SimulationState, host: AdventureHost) {
  const torches = state.tiles.filter((tile) => tile.torch);
  if (torches.length >= MAX_TORCHES) return;
  for (const bot of state.bots) {
    if (bot.health <= 0 || bot.wood < 1 || bot.genome.caution < 0.45) continue;
    const tile = host.tile(bot.x, bot.z);
    if (
      !tile ||
      !host.walkable(tile) ||
      tile.torch ||
      torches.some(
        (torch) => Math.hypot(torch.x - tile.x, torch.z - tile.z) < 2.5,
      )
    )
      continue;
    bot.wood--;
    tile.torch = true;
    state.metrics.built++;
    state.terrainVersion++;
    host.emit("build", tile.x, tile.z);
    host.reward(bot, "build", 2);
    return;
  }
}

function spreadLava(state: SimulationState, host: AdventureHost) {
  const lava = state.tiles.filter((tile) => tile.hazard === "lava");
  if (lava.length >= MAX_LAVA) return;
  for (const source of lava) {
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const start = Math.floor(random(state.adventure) * directions.length);
    for (let index = 0; index < directions.length; index++) {
      const [dx, dz] = directions[(start + index) % directions.length];
      const tile = host.tile(source.x + dx, source.z + dz);
      if (
        !tile ||
        tile.hazard === "lava" ||
        tile.height > 0.7 ||
        protectedGround(state, tile) ||
        Math.abs(tile.x) > 2
      )
        continue;
      tile.hazard = "lava";
      tile.resource = null;
      tile.quantity = 0;
      tile.torch = false;
      if (tile.structure) {
        tile.structure = null;
        state.metrics.destroyed++;
      }
      state.terrainVersion++;
      host.settle();
      return;
    }
  }
}

export function stepAdventure(
  state: SimulationState,
  host: AdventureHost,
  dt: number,
) {
  const world = state.adventure;
  if (!world.enabled) return;
  const phase = state.elapsed / state.roundDuration;
  const dusk = Math.min(1, Math.max(0, (phase - 0.18) / 0.14));
  const dawn = 1 - Math.min(1, Math.max(0, (phase - 0.84) / 0.14));
  world.storm = Math.max(0, world.storm - dt);
  world.night = Math.max(dusk * dawn, world.storm > 0 ? 0.65 : 0);
  for (const tile of state.tiles)
    if (tile.fire) {
      tile.fire = Math.max(0, tile.fire - dt);
      if (tile.fire === 0) state.terrainVersion++;
    }
  if (state.elapsed >= world.nextStorm) summonStorm(state);
  if (world.storm > 0 && state.elapsed >= world.nextBolt) {
    strike(state, host);
    world.nextBolt = state.elapsed + 3.5;
  }
  for (const charge of [...world.charges]) {
    charge.flight = Math.max(0, charge.flight - dt);
    charge.fuse -= dt;
    if (charge.fuse <= 0) {
      world.charges = world.charges.filter((other) => other.id !== charge.id);
      blast(state, host, charge.x, charge.z, 2.4, charge.owner, charge.chain);
    }
  }
  if (state.elapsed >= world.nextWave) {
    world.nextWave = state.elapsed + (world.night > 0.3 ? 3.5 : 7);
    const kind =
      world.night > 0.3
        ? random(world) < 0.45
          ? "skeleton"
          : "zombie"
        : "creeper";
    spawnMob(
      state,
      host,
      world.mobs.some((mob) => mob.kind === "creeper") ? kind : "creeper",
    );
    if (world.night > 0.4) spawnMob(state, host, kind);
  }
  if (state.elapsed >= world.nextSiege) {
    siege(state, host);
    world.nextSiege = state.elapsed + 5;
    buildTorches(state, host);
  }
  if (state.elapsed >= world.nextLava) {
    spreadLava(state, host);
    world.nextLava = state.elapsed + 3;
  }
  updateMobs(state, host, dt);
  updateArrows(state, host, dt);
}
