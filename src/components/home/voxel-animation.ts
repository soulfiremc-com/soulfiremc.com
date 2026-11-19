import type { Point, SimulationState } from "./voxel-simulation-types";

/** How an entity is drawn this frame. The simulation never reads it. */
export type Pose = {
  x: number;
  z: number;
  /** Rotation that turns the model's front toward its facing. */
  yaw: number;
  /** Walk cycle phase in radians. It advances with distance traveled. */
  stride: number;
  /** Blend between standing (0) and walking (1). */
  walk: number;
  /** Size multiplier. It grows from 0 while a new entity appears. */
  scale: number;
};

type Tracked = {
  age: number;
} & Pose;

type Entity = {
  x: number;
  z: number;
  facing: Point;
};

const SPAWN_SECONDS = 0.35;
const STRIDE_PER_TILE = 7.5;

function yawOf(facing: Point) {
  return Math.atan2(-facing[0], facing[1]);
}

export function mobKey(id: number) {
  return `mob:${id}`;
}

/** The pose of an entity that stands still at its simulated position. */
export function restPose(entity: Entity): Pose {
  return {
    x: entity.x,
    z: entity.z,
    yaw: yawOf(entity.facing),
    stride: 0,
    walk: 0,
    scale: 1,
  };
}

function popIn(age: number) {
  const t = Math.min(1, age / SPAWN_SECONDS);
  // Ease out with a small overshoot.
  return 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
}

function entities(state: SimulationState) {
  const list: [string, Entity][] = [];
  for (const bot of state.bots) if (bot.health > 0) list.push([bot.id, bot]);
  for (const mob of state.adventure.mobs)
    if (mob.health > 0) list.push([mobKey(mob.id), mob]);
  return list;
}

/**
 * Tracks render-only motion for bots and mobs: positions between simulation
 * ticks, smooth turning, walk cycles, and the pop when an entity appears.
 */
export function createAnimator() {
  let previous = new Map<string, { x: number; z: number }>();
  const tracked = new Map<string, Tracked>();
  let settled = false;
  let snap = true;

  return {
    /** Call before each simulation tick to remember where entities were. */
    beforeTick(state: SimulationState) {
      previous = new Map(
        entities(state).map(([key, entity]) => [
          key,
          { x: entity.x, z: entity.z },
        ]),
      );
    },
    /** Makes the next frame adopt facings at once, without turning. */
    snap() {
      snap = true;
    },
    reset() {
      previous.clear();
      tracked.clear();
      settled = false;
      snap = true;
    },
    /**
     * Returns the poses for this frame. `alpha` is the progress between the
     * last two ticks and `elapsed` is the animated time since the last frame.
     */
    frame(state: SimulationState, alpha: number, elapsed: number) {
      const seen = new Set<string>();
      for (const [key, entity] of entities(state)) {
        seen.add(key);
        const from = previous.get(key) ?? entity;
        const x = from.x + (entity.x - from.x) * alpha;
        const z = from.z + (entity.z - from.z) * alpha;
        const yaw = yawOf(entity.facing);
        let pose = tracked.get(key);
        if (!pose) {
          // Entities that exist on the first frame are already full size.
          pose = {
            x,
            z,
            yaw,
            stride: key.length * 1.3,
            walk: 0,
            scale: 1,
            age: settled ? 0 : SPAWN_SECONDS,
          };
          tracked.set(key, pose);
        }
        const distance = Math.hypot(x - pose.x, z - pose.z);
        pose.x = x;
        pose.z = z;
        if (elapsed > 0) {
          const moving = distance / elapsed > 0.25;
          pose.stride += Math.min(distance, 0.5) * STRIDE_PER_TILE;
          pose.walk +=
            ((moving ? 1 : 0) - pose.walk) * (1 - Math.exp(-elapsed * 10));
          const turn =
            ((((yaw - pose.yaw + Math.PI) % (Math.PI * 2)) + Math.PI * 2) %
              (Math.PI * 2)) -
            Math.PI;
          pose.yaw += turn * (1 - Math.exp(-elapsed * 14));
          pose.age += elapsed;
        }
        if (snap) {
          pose.yaw = yaw;
          pose.age = Math.max(pose.age, SPAWN_SECONDS);
        }
        pose.scale = popIn(pose.age);
      }
      for (const key of tracked.keys()) if (!seen.has(key)) tracked.delete(key);
      settled = true;
      snap = false;
      return tracked as ReadonlyMap<string, Pose>;
    },
  };
}
