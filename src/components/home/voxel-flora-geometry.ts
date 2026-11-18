import { itemAt } from "@/lib/item-at";
import { Geometry, tileNoise, timber, type Color } from "./voxel-geometry";
import type { SimulationState, SimulationTile } from "./voxel-simulation-types";

/** Render-only plant sizes. Plants ease toward what the simulation allows. */
export interface FloraGrowth {
  /** Grass cover per tile ID, from 0 (bare) to 1 (full). */
  grass: Map<string, number>;
  /** Trunk height per tile ID. */
  trees: Map<string, number>;
}

const GRASS_GROW_PER_SECOND = 0.14;
const GRASS_WITHER_PER_SECOND = 2.5;
const TREE_PER_SECOND = 0.45;
const leaves: Color = [0.21, 0.43, 0.3];
const petals: readonly Color[] = [
  [0.96, 0.8, 0.32],
  [0.93, 0.47, 0.52],
  [0.86, 0.88, 0.97],
];

export function createFloraGrowth(): FloraGrowth {
  return { grass: new Map(), trees: new Map() };
}

function grassTarget(tile: SimulationTile, homes: ReadonlySet<string>) {
  return tile.material === "grass" &&
    !tile.structure &&
    !tile.hazard &&
    !tile.fire &&
    tile.resource !== "stone" &&
    !homes.has(tile.id)
    ? 1
    : 0;
}

function treeTarget(tile: SimulationTile) {
  return tile.resource === "wood" && tile.quantity > 0
    ? 0.75 + Math.min(tile.quantity, 4) * 0.14
    : 0;
}

function approach(value: number, target: number, up: number, down: number) {
  return value < target
    ? Math.min(target, value + up)
    : Math.max(target, value - down);
}

/**
 * Moves every plant toward its target size. A tile seen for the first time
 * starts at its target. Returns true when a size changed.
 */
export function advanceFlora(
  growth: FloraGrowth,
  state: SimulationState,
  seconds: number,
) {
  const homes = new Set(state.teams.map((team) => team.home.join(":")));
  let changed = false;
  for (const tile of state.tiles) {
    const grass = grassTarget(tile, homes);
    const grassNow = growth.grass.get(tile.id);
    const grassNext =
      grassNow === undefined
        ? grass
        : approach(
            grassNow,
            grass,
            GRASS_GROW_PER_SECOND * seconds,
            GRASS_WITHER_PER_SECOND * seconds,
          );
    if (grassNext !== grassNow) {
      growth.grass.set(tile.id, grassNext);
      changed = true;
    }
    const tree = treeTarget(tile);
    const treeNow = growth.trees.get(tile.id);
    if (treeNow === undefined && tree === 0) continue;
    const step = TREE_PER_SECOND * seconds;
    const treeNext =
      treeNow === undefined ? tree : approach(treeNow, tree, step, step);
    if (treeNext !== treeNow) {
      growth.trees.set(tile.id, treeNext);
      changed = true;
    }
  }
  return changed;
}

/**
 * Builds trees, grass and flowers. Without `growth`, every plant has its
 * target size. Set `detail` to false to build only the trees.
 */
export function createFloraGeometry(
  state: SimulationState,
  growth?: FloraGrowth,
  detail = true,
) {
  const g = new Geometry();
  const homes = new Set(state.teams.map((team) => team.home.join(":")));
  for (const tile of state.tiles) {
    const { x, z, height } = tile;
    const trunk = growth?.trees.get(tile.id) ?? treeTarget(tile);
    if (trunk > 0.05) {
      const size = Math.min(1, trunk / 0.89);
      const tint = (tileNoise(x, z, 5) - 0.5) * 0.06;
      const leaf: Color = [leaves[0] + tint, leaves[1] + tint, leaves[2]];
      g.cube(
        x,
        height,
        z,
        0.14 + 0.08 * size,
        trunk,
        0.14 + 0.08 * size,
        timber,
        0,
        7,
        0,
        {
          param: 0,
          paramTop: 0.2,
        },
      );
      g.cube(
        x,
        height + trunk * 0.6,
        z,
        0.76 * size,
        0.54 * size,
        0.76 * size,
        leaf,
        0,
        7,
        0,
        {
          param: 0.25,
          paramTop: 0.5,
        },
      );
      g.cube(
        x,
        height + trunk * 0.6 + 0.54 * size,
        z,
        0.5 * size,
        0.28 * size,
        0.5 * size,
        leaf,
        0,
        7,
        0,
        { param: 0.5, paramTop: 0.75 },
      );
    }
    if (!detail) continue;
    const cover = growth?.grass.get(tile.id) ?? grassTarget(tile, homes);
    if (cover <= 0.02) continue;
    const tufts = 1 + Math.floor(tileNoise(x, z, 1) * 3);
    for (let tuft = 0; tuft < tufts; tuft++) {
      const tx = x + (tileNoise(x, z, 10 + tuft) - 0.5) * 0.72;
      const tz = z + (tileNoise(x, z, 20 + tuft) - 0.5) * 0.72;
      // Keep the trunk and the torch clear.
      if (Math.hypot(tx - x, tz - z) < 0.22) continue;
      for (let blade = 0; blade < 3; blade++) {
        const salt = tuft * 3 + blade;
        const shade = tileNoise(x, z, 30 + salt) * 0.12;
        g.cube(
          tx + (blade - 1) * 0.06,
          height,
          tz + (tileNoise(x, z, 50 + salt) - 0.5) * 0.1,
          0.05,
          (0.08 + tileNoise(x, z, 40 + salt) * 0.16) * cover,
          0.05,
          [0.3 + shade, 0.62 + shade, 0.4],
          0,
          7,
          0,
          { param: 0, paramTop: 1 },
        );
      }
    }
    const bloom = tileNoise(x, z, 7);
    if (bloom < 0.14 && trunk <= 0.05) {
      const fx = x + (tileNoise(x, z, 8) - 0.5) * 0.5;
      const fz = z + (tileNoise(x, z, 9) - 0.5) * 0.5;
      const stem = 0.24 * cover;
      g.cube(fx, height, fz, 0.035, stem, 0.035, [0.27, 0.55, 0.33], 0, 3, 0, {
        param: 0,
        paramTop: 1,
      });
      // The flower opens only on a nearly grown stem.
      const open = Math.max(0, (cover - 0.7) / 0.3);
      if (open > 0)
        g.cube(
          fx,
          height + stem,
          fz,
          0.12 * open,
          0.09 * open,
          0.12 * open,
          itemAt(petals, Math.floor(bloom * 1000) % petals.length),
          0,
          7,
          0.12,
          { param: 1 },
        );
    }
  }
  return g.finish();
}
