import { tileSurface, tileTop } from "./voxel-geometry";
import type { SimulationState } from "./voxel-simulation-types";

/** The fragment shader loops over at most this many lights. */
export const MAX_LIGHTS = 16;

export type SceneLights = {
  /** How many of the slots hold a light. */
  count: number;
  /** X, Y, Z and radius for each light. */
  positions: Float32Array;
  /** Red, green and blue, already multiplied by the intensity. */
  colors: Float32Array;
};

/** A soft, never-repeating flicker around 1 for flames. */
export function flicker(time: number, seed: number) {
  return (
    0.86 +
    Math.sin(time * 11 + seed * 3.1) * 0.09 +
    Math.sin(time * 23 + seed * 1.7) * 0.05
  );
}

/**
 * Picks the lights that shine on the scene this frame. Short, bright events
 * come first so that the limit drops the steady lava glow last.
 */
export function collectLights(state: SimulationState, time: number) {
  const lights: number[][] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    radius: number,
    color: readonly [number, number, number],
    intensity: number,
  ) =>
    lights.push([
      x,
      y,
      z,
      radius,
      color[0] * intensity,
      color[1] * intensity,
      color[2] * intensity,
    ]);
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  const ground = (x: number, z: number) =>
    tileSurface(tiles.get(`${Math.round(x)}:${Math.round(z)}`));
  for (const event of state.events) {
    if (event.kind === "explode" && event.age < 0.5)
      add(
        event.x,
        ground(event.x, event.z) + 0.8,
        event.z,
        4.5 * ((event.power ?? 2.4) / 2.4),
        [1, 0.8, 0.5],
        2.2 * (1 - event.age / 0.5),
      );
    if (event.kind === "lightning" && event.age < 0.3)
      add(
        event.x,
        ground(event.x, event.z) + 1,
        event.z,
        5,
        [0.7, 0.85, 1],
        2 * (1 - event.age / 0.3),
      );
  }
  for (const charge of state.adventure.charges)
    if (charge.flight <= 0)
      add(
        charge.x,
        ground(charge.x, charge.z) + 0.7,
        charge.z,
        1.9,
        [1, 0.6, 0.3],
        charge.fuse < 1.5 && Math.sin(time * 14) > 0.3 ? 1 : 0.35,
      );
  for (const mob of state.adventure.mobs)
    if (mob.health > 0 && mob.fuse >= 0)
      add(
        mob.x,
        ground(mob.x, mob.z) + 0.8,
        mob.z,
        1.9,
        [1, 1, 0.85],
        Math.sin(time * 14) > 0.5 ? 0.9 : 0.25,
      );
  for (const tile of state.tiles) {
    if ((tile.fire ?? 0) > 0)
      add(
        tile.x,
        tile.height + 0.6,
        tile.z,
        2.6,
        [1, 0.5, 0.12],
        1.1 * flicker(time, tile.x + tile.z),
      );
    if (tile.torch)
      add(
        tile.x + 0.22,
        tile.height + 0.75,
        tile.z + 0.2,
        2.5,
        [1, 0.62, 0.2],
        0.85 * flicker(time, tile.x),
      );
  }
  for (const tile of state.tiles)
    if (tile.hazard === "lava")
      add(
        tile.x,
        tileTop(tile) + 0.3,
        tile.z,
        1.7,
        [1, 0.34, 0.05],
        0.5 + Math.sin(time * 1.3 + tile.x * 2 + tile.z) * 0.08,
      );
  const result: SceneLights = {
    count: Math.min(lights.length, MAX_LIGHTS),
    positions: new Float32Array(MAX_LIGHTS * 4),
    colors: new Float32Array(MAX_LIGHTS * 3),
  };
  for (let index = 0; index < MAX_LIGHTS; index++) {
    const light = lights[index];
    // An unused slot keeps a radius of 1 so that the shader never divides by 0.
    result.positions.set(light ? light.slice(0, 4) : [0, 0, 0, 1], index * 4);
    if (light) result.colors.set(light.slice(4), index * 3);
  }
  return result;
}
