import {
  createAdventure,
  decorateAdventure,
  primeBreach,
  stepAdventure,
  summonStorm,
  type AdventureHost,
} from "./voxel-adventure";
import type {
  Genome,
  Point,
  ResourceKind,
  SelectionPressure,
  SimulationBot,
  SimulationEvent,
  SimulationMetrics,
  SimulationState,
  SimulationSummary,
  SimulationTeam,
  SimulationTile,
  TeamId,
} from "@/components/home/voxel-simulation-types";
import { itemAt } from "@/lib/item-at";

export type {
  BotTask,
  Genome,
  Point,
  ResourceKind,
  SelectionPressure,
  SimulationBot,
  SimulationEvent,
  SimulationMetrics,
  SimulationState,
  SimulationSummary,
  SimulationTeam,
  SimulationTile,
  TeamId,
} from "@/components/home/voxel-simulation-types";

/*
 * Pure, seeded voxel arena simulation.
 *
 * Semantics the renderer relies on:
 * - `tiles` is a 21x21 grid (x and z from -10 to 10). `height` is terrain only.
 *   Structures never change `height`; the renderer stacks walls and bridges on top.
 * - `resource` is a solid node drawn on top of the terrain. A node disappears
 *   (`resource: null`) when its `quantity` reaches 0. Depleted nodes regrow slowly.
 * - Walls block movement for both teams. Bridges make water walkable.
 * - `bot.action` and `bot.hurt` are remaining animation seconds
 *   (up to ACTION_SECONDS and HURT_SECONDS). `bot.facing` is a unit vector.
 * - `events` keep at most MAX_EVENTS entries, and each event is removed once its
 *   `age` passes EVENT_LIFETIME seconds. Event ids keep increasing across rounds.
 * - `metrics` count the current round only and reset with each generation.
 * - `terrainVersion` increases whenever any tile changes.
 * - Resources carried by a bot when it dies are lost.
 */

export const GRID_RADIUS = 10;
export const INITIAL_SIMULATION_SEED = 1847;
export const GRID_SIZE = GRID_RADIUS * 2 + 1;
export const ISLAND_RADIUS = 9;
export const BOTS_PER_TEAM = 8;
export const ROUND_SECONDS = 75;
export const MAX_HEALTH = 10;
export const CARRY_CAPACITY = 3;
export const MAX_EVENTS = 48;
export const EVENT_LIFETIME = 1.5;
export const ACTION_SECONDS = 0.3;
export const HURT_SECONDS = 0.35;
export const SIMULATION_STEP = 0.1;
export const MAX_FRAME_SECONDS = 1;
export const MAX_WALLS_PER_TEAM = 5;
export const MAX_BRIDGES_PER_TEAM = 2;
export const REGROW_SECONDS = 8;

export const RECIPES = {
  pickaxe: { wood: 2, stone: 1 },
  sword: { wood: 1, stone: 2 },
} as const;

export const STRUCTURE_COSTS = {
  wall: { wood: 0, stone: 2 },
  bridge: { wood: 2, stone: 0 },
} as const;

const STRUCTURE_HEALTH = { wall: 8, bridge: 12 } as const;
const STARTING_STOCK = { wood: 3, stone: 3 } as const;
/** Camp positions when a world cannot place varied ones. */
const DEFAULT_HOMES: [Point, Point] = [
  [-5, 0],
  [5, 0],
];
const RESOURCE_QUANTITY: Record<ResourceKind, number> = { wood: 4, stone: 5 };
const WALK_SPEED = 2.2;
const RETREAT_SPEED = 2.6;
const ATTACK_RANGE = 1.3;
const HEAL_PER_SECOND = 2.5;
const SEPARATION = 0.5;
/** Bots at or below this caution ignore a lit fuse. */
const RECKLESS = 0.15;
/** Bots run from monsters and attackers when caution beats aggression by more than this. */
const TIMID = 0.25;
/** A bot that ran this long, or got cornered, turns and fights for a while. */
const MAX_FLEE_SECONDS = 3.5;
const NERVE_SECONDS = 7;
const MAX_SEPARATION_STEP = 0.08;
const DEFAULT_SEED = 0x50f1;

const REWARD_WEIGHTS: Record<
  SelectionPressure,
  { economy: number; build: number; combat: number }
> = {
  balanced: { economy: 1, build: 1, combat: 1 },
  build: { economy: 1.4, build: 3, combat: 0.35 },
  battle: { economy: 0.5, build: 0.4, combat: 2.6 },
};

const BEHAVIOR_BIAS: Record<
  SelectionPressure,
  { aggression: number; building: number }
> = {
  balanced: { aggression: 0, building: 0 },
  build: { aggression: -0.15, building: 0.25 },
  battle: { aggression: 0.2, building: -0.1 },
};

const PRESSURES: ReadonlySet<SelectionPressure> = new Set<SelectionPressure>([
  "balanced",
  "build",
  "battle",
]);

type Tool = "pickaxe" | "sword";
type StructureKind = "wall" | "bridge";

interface Brain {
  path: number[];
  goal: number;
  stand: number;
  enemy: string | null;
  timer: number;
  cooldown: number;
  rethink: number;
  repath: number;
  /** Seconds for which the bot will not run from monsters or attackers. */
  nerve: number;
  phase: "fetch" | "place";
  structure: StructureKind;
  craft: Tool;
}

interface ResourceSite {
  index: number;
  kind: ResourceKind;
}

interface Internal {
  rng: number;
  nextEventId: number;
  brains: Map<string, Brain>;
  sites: ResourceSite[];
  regrow: number;
}

const internals = new WeakMap<SimulationState, Internal>();

function mixSeed(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- mulberry32 needs the int32 wraparound of | 0, which Math.trunc does not do
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function random(internal: Internal) {
  // oxlint-disable-next-line unicorn/prefer-math-trunc -- mulberry32 needs the int32 wraparound of | 0, which Math.trunc does not do
  internal.rng = (internal.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(internal.rng ^ (internal.rng >>> 15), 1 | internal.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function tileIndex(x: number, z: number) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > GRID_RADIUS ||
    Math.abs(z) > GRID_RADIUS
  )
    return -1;
  return (z + GRID_RADIUS) * GRID_SIZE + (x + GRID_RADIUS);
}

function indexOf(x: number, z: number) {
  return tileIndex(Math.round(x), Math.round(z));
}

export function getTile(
  state: SimulationState,
  x: number,
  z: number,
): SimulationTile | undefined {
  const index = indexOf(x, z);
  return index < 0 ? undefined : state.tiles[index];
}

function isWalkable(tile: SimulationTile) {
  if (tile.hazard === "lava" || (tile.fire ?? 0) > 0) return false;
  if (tile.resource) return false;
  if (tile.structure) return tile.structure.kind === "bridge";
  return tile.material !== "water";
}

function isPassable(tile: SimulationTile, team: TeamId, breakWalls: boolean) {
  if (tile.hazard === "lava" || (tile.fire ?? 0) > 0) return false;
  if (isWalkable(tile)) return true;
  return (
    breakWalls &&
    tile.resource === null &&
    tile.structure?.kind === "wall" &&
    tile.structure.team !== team
  );
}

const NEIGHBORS: readonly Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function chebyshev(a: SimulationTile, b: SimulationTile) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
}

/** Breadth-first search over 8-neighbour tiles without cutting blocked corners. */
function findPath(
  tiles: SimulationTile[],
  start: number,
  isGoal: (index: number) => boolean,
  canEnter: (tile: SimulationTile) => boolean,
): number[] | null {
  if (start < 0) return null;
  if (isGoal(start)) return [];
  const previous = new Int16Array(tiles.length).fill(-1);
  previous[start] = start;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = itemAt(queue, head);
    const tile = itemAt(tiles, current);
    for (const [dx, dz] of NEIGHBORS) {
      const next = tileIndex(tile.x + dx, tile.z + dz);
      if (next < 0 || previous[next] !== -1 || !canEnter(itemAt(tiles, next)))
        continue;
      if (dx !== 0 && dz !== 0) {
        const sideA = itemAt(tiles, tileIndex(tile.x + dx, tile.z));
        const sideB = itemAt(tiles, tileIndex(tile.x, tile.z + dz));
        if (!canEnter(sideA) || !canEnter(sideB)) continue;
      }
      previous[next] = current;
      if (isGoal(next)) {
        const path = [next];
        let step = current;
        while (step !== start) {
          path.push(step);
          step = itemAt(previous, step);
        }
        return path.toReversed();
      }
      queue.push(next);
    }
  }
  return null;
}

function countReachable(tiles: SimulationTile[], start: number, blocked = -1) {
  const seen = new Uint8Array(tiles.length);
  if (start < 0 || start === blocked || !isWalkable(itemAt(tiles, start)))
    return 0;
  seen[start] = 1;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const tile = itemAt(tiles, itemAt(queue, head));
    for (const [dx, dz] of NEIGHBORS.slice(0, 4)) {
      const next = tileIndex(tile.x + dx, tile.z + dz);
      if (next < 0 || next === blocked || seen[next]) continue;
      if (!isWalkable(itemAt(tiles, next))) continue;
      seen[next] = 1;
      queue.push(next);
    }
  }
  return queue.length;
}

function homeIndex(home: Point) {
  return tileIndex(home[0], home[1]);
}

function generateWorld(seed: number, generation: number) {
  const rand = createRandom(mixSeed(seed, generation));
  for (let attempt = 0; attempt < 40; attempt++) {
    const world = tryGenerateWorld(rand);
    if (world) return world;
  }
  const plain = tryGenerateWorld(rand, true);
  if (!plain) throw new Error("The plain fallback world failed to generate");
  return plain;
}

function tryGenerateWorld(rand: () => number, plain = false) {
  const riverHalf = 2 + Math.floor(rand() * 2);
  const ledgeCenters = [rand(), rand()].map(
    (value) => Math.PI * (0.6 + value * 0.8),
  );
  const edgeNoise = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => rand());
  // The camps mirror each other, but each world puts them somewhere else.
  const homes: [Point, Point] = plain
    ? DEFAULT_HOMES
    : (() => {
        const x = 4 + Math.floor(rand() * 2);
        const z = Math.floor(rand() * 5) - 2;
        return [
          [-x, z],
          [x, z],
        ];
      })();
  const tiles: SimulationTile[] = [];
  for (let z = -GRID_RADIUS; z <= GRID_RADIUS; z++) {
    for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
      // Mirror the left half so both camps get a fair map.
      const mx = -Math.abs(x);
      const distance = Math.hypot(mx, z);
      const angle = (Math.atan2(z, mx) + Math.PI * 2) % (Math.PI * 2);
      const noise = itemAt(edgeNoise, tileIndex(mx, z));
      const ledge =
        distance >= 6.5 &&
        ledgeCenters.some((center) => Math.abs(angle - center) < 0.4);
      let material: SimulationTile["material"] = "grass";
      let height = 1;
      if (distance > ISLAND_RADIUS + (noise - 0.5) * 0.6) {
        material = "water";
        height = 0;
      } else if (x === 0 && Math.abs(z) <= riverHalf) {
        material = "water";
        height = 0;
      } else if (ledge) {
        material = "stone";
        height = 2;
      } else if (distance > 8.2) {
        material = "sand";
      }
      tiles.push({
        id: `${x}:${z}`,
        x,
        z,
        height,
        material,
        resource: null,
        quantity: 0,
        structure: null,
      });
    }
  }

  const sites: ResourceSite[] = [];
  if (!plain) {
    const place = (kind: ResourceKind, count: number) => {
      for (let tries = 0; tries < 200 && count > 0; tries++) {
        const x = -1 - Math.floor(rand() * 8);
        const z = Math.floor(rand() * 15) - 7;
        const tile = itemAt(tiles, tileIndex(x, z));
        const home = homes[0];
        const homeDistance = Math.hypot(x - home[0], z - home[1]);
        if (!isWalkable(tile) || homeDistance < 2 || homeDistance > 6.5)
          continue;
        if (kind === "wood" && tile.material !== "grass") continue;
        const crowded = NEIGHBORS.some(([dx, dz]) => {
          const near = tiles[tileIndex(x + dx, z + dz)];
          return near?.resource !== null && near !== undefined;
        });
        if (crowded) continue;
        for (const mirrorX of [x, -x]) {
          const target = itemAt(tiles, tileIndex(mirrorX, z));
          target.resource = kind;
          target.quantity = RESOURCE_QUANTITY[kind];
          sites.push({ index: tileIndex(mirrorX, z), kind });
        }
        count--;
      }
    };
    place("wood", 3 + Math.floor(rand() * 4));
    place("stone", 2 + Math.floor(rand() * 3));
  }

  // Keep both homes connected and every resource node reachable.
  const reachable = new Uint8Array(tiles.length);
  const start = homeIndex(homes[0]);
  if (!isWalkable(itemAt(tiles, start))) return null;
  reachable[start] = 1;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const tile = itemAt(tiles, itemAt(queue, head));
    for (const [dx, dz] of NEIGHBORS.slice(0, 4)) {
      const next = tileIndex(tile.x + dx, tile.z + dz);
      if (next < 0 || reachable[next] || !isWalkable(itemAt(tiles, next)))
        continue;
      reachable[next] = 1;
      queue.push(next);
    }
  }
  if (!reachable[homeIndex(homes[1])]) return null;
  for (const team of [0, 1] as const) {
    const home = itemAt(tiles, homeIndex(homes[team]));
    for (const [dx, dz] of [[0, 0] as const, ...NEIGHBORS]) {
      const tile = itemAt(tiles, tileIndex(home.x + dx, home.z + dz));
      // A camp stands on flat ground, never on a ledge.
      if (!isWalkable(tile) || tile.height !== 1) return null;
    }
  }
  for (const site of sites) {
    const tile = itemAt(tiles, site.index);
    const accessible = NEIGHBORS.some(([dx, dz]) => {
      const near = tileIndex(tile.x + dx, tile.z + dz);
      return near >= 0 && reachable[near] === 1;
    });
    if (!accessible) return null;
  }
  return { tiles, sites, homes };
}

function emptyMetrics(): SimulationMetrics {
  return { gathered: 0, crafted: 0, built: 0, destroyed: 0, hits: 0 };
}

function newBrain(): Brain {
  return {
    path: [],
    goal: -1,
    stand: -1,
    enemy: null,
    timer: 0,
    cooldown: 0,
    rethink: 0,
    repath: 0,
    nerve: 0,
    phase: "fetch",
    structure: "wall",
    craft: "pickaxe",
  };
}

function spawnBots(
  generation: number,
  genomes: [Genome[], Genome[]],
  parents: [(string | null)[], (string | null)[]],
  homes: [Point, Point],
): SimulationBot[] {
  const bots: SimulationBot[] = [];
  for (const team of [0, 1] as const) {
    const [hx, hz] = homes[team];
    for (let index = 0; index < BOTS_PER_TEAM; index++) {
      const [dx, dz] = itemAt(NEIGHBORS, index);
      bots.push({
        id: `g${generation}-t${team}-b${index}`,
        team,
        x: hx + dx,
        z: hz + dz,
        health: MAX_HEALTH,
        wood: 0,
        stone: 0,
        tool: "none",
        task: "idle",
        genome: itemAt(genomes[team], index),
        fitness: 0,
        parentId: itemAt(parents[team], index),

        facing: [team === 0 ? 1 : -1, 0],
        action: 0,
        hurt: 0,
      });
    }
  }
  return bots;
}

function newTeams(
  wins: [number, number],
  homes: [Point, Point],
): [SimulationTeam, SimulationTeam] {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the simulation always creates exactly two teams
  return [0, 1].map((id) => ({
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the simulation always creates exactly two teams
    id: id as TeamId,
    home: homes[id],
    wood: STARTING_STOCK.wood,
    stone: STARTING_STOCK.stone,
    wins: wins[id],
  })) as [SimulationTeam, SimulationTeam];
}

function normalizeSeed(seed: number | undefined) {
  return seed !== undefined && Number.isFinite(seed)
    ? Math.trunc(seed) >>> 0
    : DEFAULT_SEED;
}

function isPressure(value: unknown): value is SelectionPressure {
  return (PRESSURES as ReadonlySet<unknown>).has(value);
}

export function createSimulation(
  seed?: number,
  pressure: SelectionPressure = "balanced",
  options: { spectacle?: boolean } = {},
): SimulationState {
  const normalized = normalizeSeed(seed);
  const rand = createRandom(mixSeed(normalized, 0x6e6f6d65));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the simulation always creates exactly two teams
  const genomes = [0, 1].map(() =>
    Array.from({ length: BOTS_PER_TEAM }, () => ({
      aggression: rand(),
      building: rand(),
      caution: rand(),
    })),
  ) as [Genome[], Genome[]];
  const nulls = Array.from({ length: BOTS_PER_TEAM }, () => null);
  const world = generateWorld(normalized, 1);
  const state: SimulationState = {
    seed: normalized,
    generation: 1,
    elapsed: 0,
    roundDuration: ROUND_SECONDS,
    pressure: isPressure(pressure) ? pressure : "balanced",
    tiles: world.tiles,
    bots: spawnBots(1, genomes, [nulls, nulls], world.homes),
    teams: newTeams([0, 0], world.homes),
    events: [],
    metrics: emptyMetrics(),
    terrainVersion: 1,
    adventure: createAdventure(normalized, 1, options.spectacle !== false),
  };
  decorateAdventure(state);
  internals.set(state, {
    rng: mixSeed(normalized, 0x62726169),
    nextEventId: 1,
    brains: new Map(state.bots.map((bot) => [bot.id, newBrain()])),
    sites: world.sites,
    regrow: REGROW_SECONDS,
  });
  return state;
}

function getInternal(state: SimulationState): Internal {
  let internal = internals.get(state);
  if (!internal) {
    // A state that was copied outside the engine gets a fresh deterministic brain.
    internal = {
      rng: mixSeed(
        state.seed,
        state.generation * 7919 + Math.round(state.elapsed * 10),
      ),
      nextEventId:
        state.events.reduce((max, event) => Math.max(max, event.id), 0) + 1,
      brains: new Map(),
      sites: state.tiles.flatMap((tile, index) =>
        tile.resource ? [{ index, kind: tile.resource }] : [],
      ),
      regrow: REGROW_SECONDS,
    };
    internals.set(state, internal);
  }
  return internal;
}

function brainOf(internal: Internal, bot: SimulationBot) {
  let brain = internal.brains.get(bot.id);
  if (!brain) {
    brain = newBrain();
    internal.brains.set(bot.id, brain);
  }
  return brain;
}

export function setSelectionPressure(
  state: SimulationState,
  pressure: SelectionPressure,
) {
  if (isPressure(pressure)) state.pressure = pressure;
}

function addEvent(
  state: SimulationState,
  internal: Internal,
  kind: SimulationEvent["kind"],
  x: number,
  z: number,
  team: TeamId,
  power?: number,
) {
  state.events.push({
    id: internal.nextEventId++,
    kind,
    x,
    z,
    team,
    age: 0,
    power,
  });
  if (state.events.length > MAX_EVENTS)
    state.events.splice(0, state.events.length - MAX_EVENTS);
}

function reward(
  state: SimulationState,
  bot: SimulationBot,
  kind: "economy" | "build" | "combat",
  amount: number,
) {
  bot.fitness += amount * REWARD_WEIGHTS[state.pressure][kind];
}

function traits(state: SimulationState, bot: SimulationBot) {
  const bias = BEHAVIOR_BIAS[state.pressure];
  return {
    aggression: clamp01(bot.genome.aggression + bias.aggression),
    building: clamp01(bot.genome.building + bias.building),
    caution: bot.genome.caution,
  };
}

function face(bot: SimulationBot, x: number, z: number) {
  const dx = x - bot.x;
  const dz = z - bot.z;
  const length = Math.hypot(dx, dz);
  if (length > 1e-6) bot.facing = [dx / length, dz / length];
}

function setTask(
  bot: SimulationBot,
  brain: Brain,
  task: SimulationBot["task"],
) {
  bot.task = task;
  brain.path = [];
  brain.goal = -1;
  brain.stand = -1;
  brain.enemy = null;
  brain.timer = 0;
  brain.repath = 0;
}

function distanceToHome(state: SimulationState, bot: SimulationBot) {
  const [hx, hz] = state.teams[bot.team].home;
  return Math.hypot(bot.x - hx, bot.z - hz);
}

function nearestEnemy(state: SimulationState, bot: SimulationBot) {
  let best: SimulationBot | null = null;
  let bestDistance = Infinity;
  for (const other of state.bots) {
    if (other.team === bot.team || other.health <= 0) continue;
    const distance = Math.hypot(other.x - bot.x, other.z - bot.z);
    if (distance < bestDistance) {
      best = other;
      bestDistance = distance;
    }
  }
  return { enemy: best, distance: bestDistance };
}

interface Threat {
  x: number;
  z: number;
  /** The bot wants to be at least this far away. */
  radius: number;
}

/**
 * Lists what the bot wants to get away from right now. Caution decides how
 * early a bot notices a fuse. Caution minus aggression decides whether it
 * runs from monsters and attackers or stands and fights. A bot that already
 * flees keeps going a little farther, so that it does not turn back at once.
 */
function threatsTo(
  state: SimulationState,
  bot: SimulationBot,
  genome: Genome,
  blastOnly: boolean,
  fleeing: boolean,
) {
  const world = state.adventure;
  const threats: Threat[] = [];
  const slack = fleeing ? 1.25 : 1;
  const add = (x: number, z: number, radius: number) => {
    if (Math.hypot(x - bot.x, z - bot.z) < radius * slack)
      threats.push({ x, z, radius: radius * slack });
  };
  if (genome.caution > RECKLESS) {
    const notice = 1 + genome.caution * 3;
    for (const charge of world.charges)
      if (charge.fuse < notice) add(charge.x, charge.z, charge.power + 0.6);
    for (const mob of world.mobs)
      if (mob.kind === "creeper" && mob.fuse >= 0)
        add(mob.x, mob.z, 2.1 * world.mood.blast + 0.6);
  }
  const fear = genome.caution - genome.aggression;
  if (blastOnly || fear <= TIMID) return threats;
  for (const mob of world.mobs)
    if (mob.health > 0) add(mob.x, mob.z, 1 + fear * 2.2);
  for (const other of state.bots)
    if (other.team !== bot.team && other.health > 0 && other.task === "attack")
      add(other.x, other.z, 0.8 + fear * 2);
  return threats;
}

/** Picks the neighboring tile that gets the bot farthest out of danger. */
function fleeStep(
  state: SimulationState,
  bot: SimulationBot,
  threats: readonly Threat[],
) {
  const margin = (x: number, z: number) =>
    Math.min(
      ...threats.map(
        (threat) => Math.hypot(threat.x - x, threat.z - z) - threat.radius,
      ),
    );
  const here = state.tiles[indexOf(bot.x, bot.z)];
  let best = -1;
  let bestMargin = margin(bot.x, bot.z);
  if (!here) return best;
  for (const [dx, dz] of NEIGHBORS) {
    const index = tileIndex(here.x + dx, here.z + dz);
    if (index < 0 || !isWalkable(itemAt(state.tiles, index))) continue;
    // A diagonal step must not cut a blocked corner.
    if (dx !== 0 && dz !== 0) {
      const sideX = state.tiles[tileIndex(here.x + dx, here.z)];
      const sideZ = state.tiles[tileIndex(here.x, here.z + dz)];
      if (!sideX || !sideZ || !isWalkable(sideX) || !isWalkable(sideZ))
        continue;
    }
    const value = margin(here.x + dx, here.z + dz);
    if (value > bestMargin + 1e-6) {
      best = index;
      bestMargin = value;
    }
  }
  return best;
}

function isOccupied(state: SimulationState, tile: SimulationTile) {
  return state.bots.some(
    (bot) => Math.abs(bot.x - tile.x) < 0.85 && Math.abs(bot.z - tile.z) < 0.85,
  );
}

function structureCount(
  state: SimulationState,
  team: TeamId,
  kind: StructureKind,
) {
  let count = 0;
  for (const tile of state.tiles)
    if (tile.structure?.team === team && tile.structure.kind === kind) count++;
  return count;
}

function isClaimed(
  state: SimulationState,
  internal: Internal,
  self: SimulationBot,
  index: number,
  field: "goal" | "stand",
) {
  return state.bots.some(
    (bot) =>
      bot !== self &&
      bot.health > 0 &&
      internal.brains.get(bot.id)?.[field] === index,
  );
}

function canPlace(
  state: SimulationState,
  kind: StructureKind,
  index: number,
): boolean {
  const tile = itemAt(state.tiles, index);
  if (tile.hazard === "lava" || (tile.fire ?? 0) > 0) return false;
  if (tile.resource || tile.structure || isOccupied(state, tile)) return false;

  if (kind === "bridge") {
    if (
      tile.material !== "water" ||
      Math.hypot(tile.x, tile.z) > ISLAND_RADIUS - 1
    )
      return false;
    const land = (dx: number, dz: number) => {
      const near = getTile(state, tile.x + dx, tile.z + dz);
      return near !== undefined && isWalkable(near);
    };
    return (land(1, 0) && land(-1, 0)) || (land(0, 1) && land(0, -1));
  }
  if (tile.material === "water") return false;
  // A wall must never cut any walkable area off from the rest of the island.
  const home = homeIndex(state.teams[0].home);
  return (
    countReachable(state.tiles, home, index) ===
    countReachable(state.tiles, home) - 1
  );
}

function chooseBuildSite(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
): { kind: StructureKind; index: number } | null {
  const team = state.teams[bot.team];
  const options: { kind: StructureKind; index: number; score: number }[] = [];
  if (
    team.wood >= STRUCTURE_COSTS.bridge.wood &&
    structureCount(state, bot.team, "bridge") < MAX_BRIDGES_PER_TEAM
  ) {
    state.tiles.forEach((tile, index) => {
      if (tile.material === "water" && canPlace(state, "bridge", index))
        options.push({ kind: "bridge", index, score: Math.abs(tile.z) });
    });
  }
  if (
    team.stone >= STRUCTURE_COSTS.wall.stone &&
    structureCount(state, bot.team, "wall") < MAX_WALLS_PER_TEAM
  ) {
    const [hx, hz] = team.home;
    const x = hx + (bot.team === 0 ? 2 : -2);
    for (let z = hz - 2; z <= hz + 2; z++) {
      const index = tileIndex(x, z);
      if (canPlace(state, "wall", index))
        options.push({ kind: "wall", index, score: Math.abs(z) + 0.5 });
    }
  }
  let best: { kind: StructureKind; index: number; score: number } | null = null;
  for (const option of options) {
    if (isClaimed(state, internal, bot, option.index, "goal")) continue;
    const score = option.score + random(internal) * 0.6;
    if (!best || score < best.score) best = { ...option, score };
  }
  return best;
}

function decide(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
) {
  const brain = brainOf(internal, bot);
  setTask(bot, brain, "idle");
  const team = state.teams[bot.team];
  const genome = traits(state, bot);
  const carried = bot.wood + bot.stone;
  if (carried >= CARRY_CAPACITY) {
    setTask(bot, brain, "deliver");
    return;
  }

  if (bot.tool === "none" && distanceToHome(state, bot) <= 2.6) {
    const tool: Tool = genome.aggression > 0.5 ? "sword" : "pickaxe";
    const cost = RECIPES[tool];
    if (team.wood >= cost.wood && team.stone >= cost.stone) {
      setTask(bot, brain, "craft");
      brain.craft = tool;
      brain.timer = 0.8;
      return;
    }
  }

  const { enemy, distance } = nearestEnemy(state, bot);
  if (
    enemy &&
    (distance < 1.5 + 3 * genome.aggression ||
      random(internal) < genome.aggression * genome.aggression * 0.5)
  ) {
    setTask(bot, brain, "attack");
    brain.enemy = enemy.id;
    brain.rethink = 2 + genome.aggression * 3;
    return;
  }

  if (random(internal) < genome.building * 0.8) {
    if (carried > 0) {
      setTask(bot, brain, "deliver");
      return;
    }
    const site = chooseBuildSite(state, internal, bot);
    if (site) {
      setTask(bot, brain, "build");
      brain.structure = site.kind;
      brain.goal = site.index;
      brain.phase = "fetch";
      return;
    }
  }

  const preferred: ResourceKind = team.wood <= team.stone ? "wood" : "stone";
  for (const kind of [
    preferred,
    preferred === "wood" ? "stone" : "wood",
  ] as const) {
    if (startGather(state, internal, bot, brain, kind)) return;
  }
  if (carried > 0) {
    setTask(bot, brain, "deliver");
    return;
  }
  brain.rethink = 0.5;
}

function startGather(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
  brain: Brain,
  kind: ResourceKind,
) {
  let target = -1;
  const path = findPath(
    state.tiles,
    indexOf(bot.x, bot.z),
    (index) => {
      if (isClaimed(state, internal, bot, index, "stand")) return false;
      const tile = itemAt(state.tiles, index);
      for (const [dx, dz] of NEIGHBORS) {
        const near = tileIndex(tile.x + dx, tile.z + dz);
        if (near >= 0 && itemAt(state.tiles, near).resource === kind) {
          target = near;
          return true;
        }
      }
      return false;
    },
    isWalkable,
  );
  if (!path) return false;
  setTask(bot, brain, "gather");
  brain.goal = target;
  brain.path = path;
  brain.stand = path.at(-1) ?? indexOf(bot.x, bot.z);
  brain.timer = bot.tool === "pickaxe" ? 0.45 : 0.9;
  return true;
}

/** Moves along the current path. Returns "arrived", "moving", or "blocked". */
function move(
  state: SimulationState,
  bot: SimulationBot,
  brain: Brain,
  speed: number,
  dt: number,
  breakWalls = false,
) {
  let budget = speed * dt;
  while (budget > 0) {
    const [next] = brain.path;
    if (next === undefined) return "arrived";
    const tile = itemAt(state.tiles, next);

    if (!isWalkable(tile)) {
      if (breakWalls && isPassable(tile, bot.team, true)) return "wall";
      return "blocked";
    }
    const dx = tile.x - bot.x;
    const dz = tile.z - bot.z;
    const distance = Math.hypot(dx, dz);
    const reach = Math.min(budget, distance);
    const crossed = getTile(
      state,
      bot.x + (dx / distance) * reach,
      bot.z + (dz / distance) * reach,
    );
    if (distance > 0 && (!crossed || !isWalkable(crossed))) {
      // An off-centre bot would clip a blocked corner, so recentre first.
      brain.path.unshift(indexOf(bot.x, bot.z));
      continue;
    }
    face(bot, tile.x, tile.z);
    if (distance <= budget) {
      bot.x = tile.x;
      bot.z = tile.z;
      budget -= distance;
      brain.path.shift();
    } else {
      bot.x += (dx / distance) * budget;
      bot.z += (dz / distance) * budget;
      budget = 0;
    }
  }
  return brain.path.length === 0 ? "arrived" : "moving";
}

function isHomeTile(state: SimulationState, team: TeamId, index: number) {
  const tile = state.tiles[index];
  const [hx, hz] = state.teams[team].home;
  return !!tile && Math.max(Math.abs(tile.x - hx), Math.abs(tile.z - hz)) <= 1;
}

/** Walks to the 3x3 camp area. Returns true once the bot stands in it. */
function walkHome(
  state: SimulationState,
  bot: SimulationBot,
  brain: Brain,
  speed: number,
  dt: number,
) {
  const here = indexOf(bot.x, bot.z);
  if (brain.path.length === 0 && isHomeTile(state, bot.team, here)) return true;
  brain.repath -= dt;
  if (brain.path.length === 0 || brain.repath <= 0) {
    const path = findPath(
      state.tiles,
      here,
      (index) => isHomeTile(state, bot.team, index),
      isWalkable,
    );
    brain.repath = 2;
    if (!path) return false;
    brain.path = path;
  }
  const result = move(state, bot, brain, speed, dt);
  if (result === "blocked") brain.path = [];
  return result === "arrived";
}

function deposit(state: SimulationState, bot: SimulationBot) {
  const team = state.teams[bot.team];
  const amount = bot.wood + bot.stone;
  team.wood += bot.wood;
  team.stone += bot.stone;
  bot.wood = 0;
  bot.stone = 0;
  if (amount > 0) reward(state, bot, "economy", amount * 0.5);
}

function damage(
  state: SimulationState,
  internal: Internal,
  attacker: SimulationBot,
  victim: SimulationBot,
) {
  const amount = attacker.tool === "sword" ? 2.5 : 1.5;
  const dealt = Math.min(victim.health, amount);
  victim.health = Math.max(0, victim.health - amount);
  victim.hurt = HURT_SECONDS;
  attacker.action = ACTION_SECONDS;
  face(attacker, victim.x, victim.z);
  state.metrics.hits++;
  reward(state, attacker, "combat", dealt);
  addEvent(state, internal, "hit", victim.x, victim.z, attacker.team);
  const victimBrain = brainOf(internal, victim);
  if (victim.health <= 0) {
    kill(state, internal, victim);
    reward(state, attacker, "combat", 4);
    return;
  }
  if (
    victim.task !== "attack" &&
    victim.task !== "retreat" &&
    random(internal) < 0.1 + 0.9 * traits(state, victim).aggression
  ) {
    setTask(victim, victimBrain, "attack");
    victimBrain.enemy = attacker.id;
    victimBrain.rethink = 3;
  }
}

function kill(state: SimulationState, internal: Internal, bot: SimulationBot) {
  const brain = brainOf(internal, bot);
  setTask(bot, brain, "dead");
  bot.health = 0;
  bot.wood = 0;
  bot.stone = 0;
  bot.action = 0;
  bot.fitness -= 3;
  addEvent(state, internal, "defeat", bot.x, bot.z, bot.team);
}

function hitWall(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
  tile: SimulationTile,
) {
  const structure = tile.structure;
  if (!structure) return;
  face(bot, tile.x, tile.z);
  bot.action = ACTION_SECONDS;
  structure.health -= bot.tool === "sword" ? 3.5 : 2;
  state.metrics.hits++;
  addEvent(state, internal, "hit", tile.x, tile.z, bot.team);
  if (structure.health <= 0) {
    tile.structure = null;
    state.metrics.destroyed++;
    state.terrainVersion++;
    reward(state, bot, "combat", 3);
  }
}

function updateAttack(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
  brain: Brain,
  dt: number,
) {
  const enemy = state.bots.find((other) => other.id === brain.enemy);
  brain.rethink -= dt;
  if (!enemy || enemy.health <= 0 || brain.rethink <= 0) {
    decide(state, internal, bot);
    return;
  }
  const distance = Math.hypot(enemy.x - bot.x, enemy.z - bot.z);
  if (distance <= ATTACK_RANGE) {
    brain.path = [];
    face(bot, enemy.x, enemy.z);
    if (brain.cooldown <= 0) {
      damage(state, internal, bot, enemy);
      brain.cooldown = bot.tool === "sword" ? 0.7 : 0.85;
    }
    return;
  }
  brain.repath -= dt;
  if (brain.path.length === 0 || brain.repath <= 0) {
    const target = getTile(state, enemy.x, enemy.z);
    if (!target) {
      decide(state, internal, bot);
      return;
    }
    const path = findPath(
      state.tiles,
      indexOf(bot.x, bot.z),
      (index) => chebyshev(itemAt(state.tiles, index), target) <= 1,
      (tile) => isPassable(tile, bot.team, true),
    );
    brain.repath = 0.5;
    if (!path) {
      decide(state, internal, bot);
      return;
    }
    brain.path = path;
  }
  const result = move(state, bot, brain, WALK_SPEED, dt, true);
  if (result === "wall") {
    if (brain.cooldown <= 0) {
      hitWall(state, internal, bot, itemAt(state.tiles, itemAt(brain.path, 0)));
      brain.cooldown = bot.tool === "sword" ? 0.7 : 0.85;
    }
  } else if (result === "blocked") brain.path = [];
}

function updateDefense(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
  brain: Brain,
  dt: number,
) {
  const target = state.adventure.mobs.find(
    (mob) => `mob:${mob.id}` === brain.enemy && mob.health > 0,
  );
  if (!target) {
    decide(state, internal, bot);
    return;
  }
  const distance = Math.hypot(target.x - bot.x, target.z - bot.z);
  face(bot, target.x, target.z);
  if (distance <= 1.3) {
    brain.path = [];
    if (brain.cooldown <= 0) {
      const amount = bot.tool === "sword" ? 2.5 : 1.5;
      target.health = Math.max(0, target.health - amount);
      target.hurt = HURT_SECONDS;
      bot.action = ACTION_SECONDS;
      brain.cooldown = bot.tool === "sword" ? 0.7 : 0.85;
      state.metrics.hits++;
      reward(state, bot, "combat", amount);
      addEvent(state, internal, "hit", target.x, target.z, bot.team);
      if (target.health <= 0) {
        reward(state, bot, "combat", 4);
        addEvent(state, internal, "defeat", target.x, target.z, bot.team);
      }
    }
    return;
  }
  brain.repath -= dt;
  if (brain.path.length === 0 || brain.repath <= 0) {
    const tile = getTile(state, target.x, target.z);
    if (!tile) {
      decide(state, internal, bot);
      return;
    }
    brain.path =
      findPath(
        state.tiles,
        indexOf(bot.x, bot.z),
        (index) => chebyshev(itemAt(state.tiles, index), tile) <= 1,

        isWalkable,
      ) ?? [];
    brain.repath = 0.5;
  }
  if (move(state, bot, brain, WALK_SPEED, dt) === "blocked") brain.path = [];
}

function updateBot(
  state: SimulationState,
  internal: Internal,
  bot: SimulationBot,
  dt: number,
) {
  const brain = brainOf(internal, bot);
  brain.cooldown = Math.max(0, brain.cooldown - dt);
  const team = state.teams[bot.team];
  const genome = traits(state, bot);

  if (state.adventure.enabled) {
    // A hurt bot heads home and a cornered one fights, so only a blast can
    // turn those aside.
    brain.nerve = Math.max(0, brain.nerve - dt);
    const blastOnly = brain.nerve > 0 || bot.health < 2 + genome.caution * 5;
    const fleeing = bot.task === "flee";
    const threats = threatsTo(state, bot, genome, blastOnly, fleeing);
    if (threats.length > 0) {
      if (!fleeing) setTask(bot, brain, "flee");
    } else if (
      !fleeing &&
      bot.task !== "retreat" &&
      (brain.nerve > 0 || genome.caution - genome.aggression <= TIMID)
    ) {
      // Bold bots go after a monster that comes close.
      const mob = state.adventure.mobs
        .filter(
          (other) =>
            other.health > 0 &&
            Math.hypot(other.x - bot.x, other.z - bot.z) <
              2.5 + genome.aggression * 2,
        )
        .toSorted(
          (a, b) =>
            Math.hypot(a.x - bot.x, a.z - bot.z) -
            Math.hypot(b.x - bot.x, b.z - bot.z),
        )[0];
      if (mob && brain.enemy !== `mob:${mob.id}`) {
        setTask(bot, brain, "defend");
        brain.enemy = `mob:${mob.id}`;
      }
    }
  }

  if (
    bot.task !== "retreat" &&
    bot.task !== "flee" &&
    bot.health < 2 + genome.caution * 5
  )
    setTask(bot, brain, "retreat");

  switch (bot.task) {
    case "idle": {
      brain.rethink -= dt;
      if (brain.rethink <= 0) decide(state, internal, bot);
      return;
    }
    case "retreat": {
      if (!walkHome(state, bot, brain, RETREAT_SPEED, dt)) return;
      deposit(state, bot);
      bot.health = Math.min(MAX_HEALTH, bot.health + HEAL_PER_SECOND * dt);
      if (bot.health >= MAX_HEALTH) decide(state, internal, bot);
      return;
    }
    case "flee": {
      brain.timer += dt;
      if (brain.path.length === 0) {
        const threats = threatsTo(state, bot, genome, brain.nerve > 0, true);
        if (threats.length === 0) {
          decide(state, internal, bot);
          return;
        }
        const next = fleeStep(state, bot, threats);
        if (next < 0 || brain.timer > MAX_FLEE_SECONDS) {
          // Cornered or worn out: stop running and face what comes.
          brain.nerve = NERVE_SECONDS;
          decide(state, internal, bot);
          return;
        }
        brain.path = [next];
      }
      if (move(state, bot, brain, RETREAT_SPEED, dt) === "blocked")
        brain.path = [];
      return;
    }
    case "deliver": {
      if (!walkHome(state, bot, brain, WALK_SPEED, dt)) return;
      deposit(state, bot);
      decide(state, internal, bot);
      return;
    }
    case "craft": {
      brain.timer -= dt;
      bot.action = ACTION_SECONDS;
      if (brain.timer > 0) return;
      const cost = RECIPES[brain.craft];
      if (
        bot.tool === "none" &&
        team.wood >= cost.wood &&
        team.stone >= cost.stone
      ) {
        team.wood -= cost.wood;
        team.stone -= cost.stone;
        bot.tool = brain.craft;
        state.metrics.crafted++;
        reward(state, bot, "economy", 2);
        addEvent(state, internal, "craft", bot.x, bot.z, bot.team);
      }
      decide(state, internal, bot);
      return;
    }
    case "gather": {
      const resource = state.tiles[brain.goal];
      if (!resource?.resource) {
        decide(state, internal, bot);
        return;
      }
      if (brain.path.length > 0) {
        if (move(state, bot, brain, WALK_SPEED, dt) === "blocked")
          decide(state, internal, bot);
        return;
      }
      const here = getTile(state, bot.x, bot.z);
      if (!here || chebyshev(here, resource) > 1) {
        decide(state, internal, bot);
        return;
      }
      face(bot, resource.x, resource.z);
      brain.timer -= dt;
      if (brain.timer > 0) return;
      brain.timer = bot.tool === "pickaxe" ? 0.45 : 0.9;
      bot.action = ACTION_SECONDS;
      resource.quantity--;
      state.terrainVersion++;
      if (resource.resource === "wood") bot.wood++;
      else bot.stone++;
      state.metrics.gathered++;
      reward(state, bot, "economy", 1);
      addEvent(state, internal, "mine", resource.x, resource.z, bot.team);
      if (resource.quantity <= 0) {
        resource.quantity = 0;
        resource.resource = null;
      }
      if (bot.wood + bot.stone >= CARRY_CAPACITY || !resource.resource)
        decide(state, internal, bot);
      return;
    }
    case "build": {
      const cost = STRUCTURE_COSTS[brain.structure];
      if (brain.phase === "fetch") {
        if (!walkHome(state, bot, brain, WALK_SPEED, dt)) return;
        deposit(state, bot);
        if (
          team.wood < cost.wood ||
          team.stone < cost.stone ||
          !canPlace(state, brain.structure, brain.goal)
        ) {
          decide(state, internal, bot);
          return;
        }
        team.wood -= cost.wood;
        team.stone -= cost.stone;
        bot.wood += cost.wood;
        bot.stone += cost.stone;
        brain.phase = "place";
        brain.path = [];
        brain.repath = 0;
        return;
      }
      const site = state.tiles[brain.goal];
      if (!site) {
        decide(state, internal, bot);
        return;
      }
      if (
        brain.path.length === 0 &&
        chebyshev(itemAt(state.tiles, indexOf(bot.x, bot.z)), site) > 1
      ) {
        const path = findPath(
          state.tiles,
          indexOf(bot.x, bot.z),
          (index) =>
            index !== brain.goal &&
            chebyshev(itemAt(state.tiles, index), site) <= 1,
          isWalkable,
        );
        if (!path) {
          decide(state, internal, bot);
          return;
        }
        brain.path = path;
      }
      if (brain.path.length > 0) {
        if (move(state, bot, brain, WALK_SPEED, dt) === "blocked")
          brain.path = [];
        return;
      }
      face(bot, site.x, site.z);
      bot.action = ACTION_SECONDS;
      brain.timer += dt;
      if (brain.timer < 0.6) return;
      if (
        bot.wood >= cost.wood &&
        bot.stone >= cost.stone &&
        canPlace(state, brain.structure, brain.goal)
      ) {
        bot.wood -= cost.wood;
        bot.stone -= cost.stone;
        site.structure = {
          kind: brain.structure,
          team: bot.team,
          health: STRUCTURE_HEALTH[brain.structure],
        };
        state.metrics.built++;
        state.terrainVersion++;
        reward(state, bot, "build", 4);
        addEvent(state, internal, "build", site.x, site.z, bot.team);
      }
      // Unused materials go back home through the deliver task.
      decide(state, internal, bot);
      return;
    }
    case "attack": {
      updateAttack(state, internal, bot, brain, dt);
      break;
    }
    case "defend": {
      updateDefense(state, internal, bot, brain, dt);
      break;
    }
    case "dead":
      break;
  }
}

function separate(state: SimulationState) {
  const pushes = state.bots
    .filter((bot) => bot.health > 0)
    .map((bot) => ({ bot, x: 0, z: 0 }));
  for (let i = 0; i < pushes.length; i++) {
    const a = itemAt(pushes, i);
    for (let j = i + 1; j < pushes.length; j++) {
      const b = itemAt(pushes, j);
      let dx = b.bot.x - a.bot.x;
      let dz = b.bot.z - a.bot.z;
      let distance = Math.hypot(dx, dz);
      if (distance >= SEPARATION) continue;
      const overlap = SEPARATION - distance;
      if (distance < 1e-6) {
        const angle = (i * 7 + j * 3) * 0.7;
        dx = Math.cos(angle);
        dz = Math.sin(angle);
        distance = 1;
      }
      const push = overlap * 0.25;
      a.x -= (dx / distance) * push;
      a.z -= (dz / distance) * push;
      b.x += (dx / distance) * push;
      b.z += (dz / distance) * push;
    }
  }
  for (const { bot, x: px, z: pz } of pushes) {
    const length = Math.hypot(px, pz);
    if (length < 1e-9) continue;
    const scale = Math.min(1, MAX_SEPARATION_STEP / length);
    const x = bot.x + px * scale;
    const z = bot.z + pz * scale;
    const tile = getTile(state, x, z);
    if (tile && isWalkable(tile)) {
      bot.x = x;
      bot.z = z;
    }
  }
}

function regrow(state: SimulationState, internal: Internal, dt: number) {
  internal.regrow -= dt;
  if (internal.regrow > 0) return;
  internal.regrow = REGROW_SECONDS;
  for (const site of internal.sites) {
    const tile = itemAt(state.tiles, site.index);
    const max = RESOURCE_QUANTITY[site.kind];
    if (
      tile.quantity >= max ||
      tile.structure ||
      tile.hazard === "lava" ||
      (tile.fire ?? 0) > 0 ||
      isOccupied(state, tile)
    )
      continue;
    if (tile.resource === null && tile.quantity === 0) {
      tile.resource = site.kind;
    }
    if (tile.resource === site.kind) {
      tile.quantity++;
      state.terrainVersion++;
    }
  }
}

function tournament(internal: Internal, bots: SimulationBot[]) {
  let best = itemAt(bots, Math.floor(random(internal) * bots.length));
  for (let round = 0; round < 2; round++) {
    const challenger = itemAt(bots, Math.floor(random(internal) * bots.length));

    if (challenger.fitness > best.fitness) best = challenger;
  }
  return best;
}

function mutate(internal: Internal, value: number) {
  const noise =
    (random(internal) + random(internal) + random(internal) - 1.5) * 0.12;
  return clamp01(value + noise);
}

function nextGeneration(state: SimulationState, internal: Internal) {
  const aliveOn = (team: TeamId) =>
    state.bots.filter((bot) => bot.team === team && bot.health > 0).length;
  const scoreOf = (team: TeamId) =>
    state.bots
      .filter((bot) => bot.team === team)
      .reduce((sum, bot) => sum + bot.fitness, 0);
  const alive = [aliveOn(0), aliveOn(1)] as const;
  const score = [scoreOf(0), scoreOf(1)] as const;
  let winner: TeamId | null = null;
  if (alive[0] !== alive[1]) winner = alive[0] > alive[1] ? 0 : 1;
  else if (score[0] !== score[1]) winner = score[0] > score[1] ? 0 : 1;
  for (const bot of state.bots) {
    if (bot.health > 0) bot.fitness += 2;
    if (bot.team === winner) bot.fitness += 2;
  }
  const wins: [number, number] = [state.teams[0].wins, state.teams[1].wins];
  if (winner !== null) wins[winner]++;

  const genomes: [Genome[], Genome[]] = [[], []];
  const parents: [(string | null)[], (string | null)[]] = [[], []];
  for (const team of [0, 1] as const) {
    const members = state.bots
      .filter((bot) => bot.team === team)
      .toSorted((a, b) => b.fitness - a.fitness);
    for (let index = 0; index < BOTS_PER_TEAM; index++) {
      const parent =
        index === 0 ? itemAt(members, 0) : tournament(internal, members);
      genomes[team].push({
        aggression: mutate(internal, parent.genome.aggression),
        building: mutate(internal, parent.genome.building),
        caution: mutate(internal, parent.genome.caution),
      });
      parents[team].push(parent.id);
    }
  }

  state.generation++;
  const world = generateWorld(state.seed, state.generation);
  state.elapsed = 0;
  state.tiles = world.tiles;
  state.bots = spawnBots(state.generation, genomes, parents, world.homes);
  state.teams = newTeams(wins, world.homes);
  state.events = [];
  state.metrics = emptyMetrics();
  state.terrainVersion++;
  state.adventure = createAdventure(
    state.seed,
    state.generation,
    state.adventure.enabled,
  );
  decorateAdventure(state);
  internal.sites = world.sites;
  internal.brains = new Map(state.bots.map((bot) => [bot.id, newBrain()]));
  internal.regrow = REGROW_SECONDS;
}

function adventureHost(
  state: SimulationState,
  internal: Internal,
): AdventureHost {
  return {
    tile: (x, z) => getTile(state, x, z),
    walkable: isWalkable,
    emit: (kind, x, z, power) => {
      addEvent(state, internal, kind, x, z, 0, power);
    },
    reward: (bot, kind, amount) => {
      reward(state, bot, kind, amount);
    },
    hurt(bot, amount, owner) {
      if (bot.health <= 0) return;
      const dealt = Math.min(bot.health, amount);
      bot.health = Math.max(0, bot.health - amount);
      bot.hurt = HURT_SECONDS;
      state.metrics.hits++;
      addEvent(state, internal, "hit", bot.x, bot.z, bot.team);
      const source = state.bots.find((candidate) => candidate.id === owner);
      if (source) {
        if (source.team !== bot.team) reward(state, source, "combat", dealt);
        else source.fitness -= dealt * 0.5;
      }
      if (bot.health <= 0) {
        kill(state, internal, bot);
        if (source && source.team !== bot.team)
          reward(state, source, "combat", 4);
      }
    },
    settle() {
      for (const bot of state.bots) {
        if (bot.health <= 0) continue;
        const tile = getTile(state, bot.x, bot.z);
        if (tile && isWalkable(tile)) continue;
        const safe = state.tiles
          .filter(isWalkable)
          .toSorted(
            (a, b) =>
              Math.hypot(a.x - bot.x, a.z - bot.z) -
              Math.hypot(b.x - bot.x, b.z - bot.z),
          )[0];
        if (!safe) continue;
        bot.x = safe.x;
        bot.z = safe.z;
        const brain = brainOf(internal, bot);
        brain.path = [];
        brain.repath = 0;
      }
    },
  };
}

export function triggerBreach(state: SimulationState) {
  return primeBreach(state);
}

export function triggerStorm(state: SimulationState) {
  return summonStorm(state);
}

function tick(state: SimulationState, internal: Internal, dt: number) {
  state.elapsed += dt;
  for (const event of state.events) event.age += dt;
  state.events = state.events.filter((event) => event.age <= EVENT_LIFETIME);
  for (const bot of state.bots) {
    bot.action = Math.max(0, bot.action - dt);
    bot.hurt = Math.max(0, bot.hurt - dt);
    if (bot.health <= 0 && bot.task !== "dead") kill(state, internal, bot);
  }
  for (const bot of state.bots)
    if (bot.health > 0) updateBot(state, internal, bot, dt);
  separate(state);
  regrow(state, internal, dt);
  stepAdventure(state, adventureHost(state, internal), dt);

  const eliminated = [0, 1].some((team) =>
    state.bots.every((bot) => bot.team !== team || bot.health <= 0),
  );
  if (state.elapsed >= state.roundDuration || eliminated)
    nextGeneration(state, internal);
}

/**
 * Advances the simulation. Invalid or non-positive durations do nothing, and
 * a single call never advances more than MAX_FRAME_SECONDS.
 */
export function stepSimulation(state: SimulationState, seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const internal = getInternal(state);
  let remaining = Math.min(seconds, MAX_FRAME_SECONDS);
  while (remaining > 1e-9) {
    const dt = Math.min(SIMULATION_STEP, remaining);
    tick(state, internal, dt);
    remaining -= dt;
  }
}

function meanGenome(bots: SimulationBot[]): Genome {
  const total = { aggression: 0, building: 0, caution: 0 };
  for (const bot of bots) {
    total.aggression += bot.genome.aggression;
    total.building += bot.genome.building;
    total.caution += bot.genome.caution;
  }
  const count = Math.max(1, bots.length);
  return {
    aggression: total.aggression / count,
    building: total.building / count,
    caution: total.caution / count,
  };
}

export function getSimulationSummary(
  state: SimulationState,
): SimulationSummary {
  const membersOf = (team: TeamId) =>
    state.bots.filter((bot) => bot.team === team);
  const teams = [membersOf(0), membersOf(1)] as const;

  return {
    generation: state.generation,
    remaining: Math.max(0, state.roundDuration - state.elapsed),
    alive: [
      teams[0].filter((bot) => bot.health > 0).length,
      teams[1].filter((bot) => bot.health > 0).length,
    ],
    traits: [meanGenome(teams[0]), meanGenome(teams[1])],
    metrics: { ...state.metrics },
    pressure: state.pressure,
    night: state.adventure.night,
    storm: state.adventure.storm > 0,
    canBreach:
      state.adventure.enabled &&
      state.elapsed >= state.adventure.breachReadyAt &&
      state.adventure.charges.length < 4,
    canStorm:
      state.adventure.enabled && state.elapsed >= state.adventure.stormReadyAt,
  };
}
