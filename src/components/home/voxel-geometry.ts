import type {
  SimulationBot,
  SimulationState,
  SimulationTile,
} from "./voxel-simulation-types";

export type Color = readonly [number, number, number];
type Vertex = readonly [number, number, number];
export const VERTEX_STRIDE = 9;
const campColors: readonly Color[] = [
  [0.4, 0.85, 0.83],
  [0.93, 0.69, 0.46],
];
const grass: Color = [0.22, 0.43, 0.38];
const rock: Color = [0.35, 0.43, 0.45];
const timber: Color = [0.5, 0.34, 0.22];
const leaves: Color = [0.21, 0.43, 0.3];
const planks: Color = [0.64, 0.47, 0.3];

export class Geometry {
  vertices: number[] = [];

  cube(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: Color,
    angle = 0,
    faceMask = 7,
    glow = 0,
  ) {
    const halfX = width / 2;
    const halfZ = depth / 2;
    const vertex = (px: number, py: number, pz: number): Vertex => [
      x + px * Math.cos(angle) - pz * Math.sin(angle),
      y + py,
      z + px * Math.sin(angle) + pz * Math.cos(angle),
    ];
    const faces = [
      [
        vertex(-halfX, 0, halfZ),
        vertex(halfX, 0, halfZ),
        vertex(halfX, height, halfZ),
        vertex(-halfX, height, halfZ),
      ],
      [
        vertex(halfX, 0, -halfZ),
        vertex(halfX, 0, halfZ),
        vertex(halfX, height, halfZ),
        vertex(halfX, height, -halfZ),
      ],
      [
        vertex(-halfX, height, -halfZ),
        vertex(halfX, height, -halfZ),
        vertex(halfX, height, halfZ),
        vertex(-halfX, height, halfZ),
      ],
    ];
    const uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const [face, corners] of faces.entries()) {
      if (!(faceMask & (1 << face))) continue;
      const shade = [0.54, 0.72, 1][face];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        this.vertices.push(
          ...corners[index],
          color[0] * shade,
          color[1] * shade,
          color[2] * shade,
          ...uv[index],
          glow,
        );
      }
    }
  }

  finish() {
    return new Float32Array(this.vertices);
  }

  beam(from: Vertex, to: Vertex, width: number, color: Color, glow = 0) {
    const dx = to[0] - from[0],
      dy = to[1] - from[1],
      dz = to[2] - from[2];
    const horizontal = Math.hypot(dx, dz);
    const right: Vertex =
      horizontal > 0.0001 ? [-dz / horizontal, 0, dx / horizontal] : [1, 0, 0];
    const upRaw = [
      dy * right[2],
      dz * right[0] - dx * right[2],
      -dy * right[0],
    ];
    const length = Math.hypot(...upRaw) || 1;
    const up: Vertex = [
      upRaw[0] / length,
      upRaw[1] / length,
      upRaw[2] / length,
    ];
    const uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const normal of [right, up]) {
      const corners = [from, to, to, from].map((point, index) =>
        point.map(
          (value, axis) =>
            value + normal[axis] * width * (index < 2 ? -0.5 : 0.5),
        ),
      );
      for (const index of [0, 1, 2, 0, 2, 3])
        this.vertices.push(...corners[index], ...color, ...uv[index], glow);
    }
  }
}

export function tileSurface(tile: SimulationTile | undefined) {
  if (!tile) return 1;
  return tile.height + (tile.structure?.kind === "bridge" ? 0.15 : 0);
}

export function createTerrainGeometry(state: SimulationState) {
  const geometry = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  const rendered = (tile: SimulationTile) =>
    tile.material !== "water" || Math.hypot(tile.x, tile.z) <= 9.2;
  for (const tile of state.tiles) {
    if (!rendered(tile)) continue;
    let faceMask = 4;
    for (const [dx, dz, mask] of [
      [0, 1, 1],
      [1, 0, 2],
    ]) {
      const neighbor = tiles.get(`${tile.x + dx}:${tile.z + dz}`);
      if (!neighbor || !rendered(neighbor) || neighbor.height < tile.height)
        faceMask |= mask;
    }
    const color =
      tile.hazard === "lava"
        ? ([1, 0.25, 0.025] as const)
        : tile.hazard === "scorch"
          ? ([0.22, 0.24, 0.24] as const)
          : tile.material === "water"
            ? ([0.12, 0.29, 0.36] as const)
            : tile.material === "sand"
              ? ([0.57, 0.52, 0.37] as const)
              : tile.material === "stone"
                ? rock
                : grass;
    const variation = Math.sin(tile.x * 7.3 + tile.z * 4.7) * 0.025;
    geometry.cube(
      tile.x,
      -0.9,
      tile.z,
      0.98,
      tile.height + 0.9,
      0.98,
      [color[0] + variation, color[1] + variation, color[2] + variation],
      0,
      faceMask,
      tile.hazard === "lava" ? 1 : 0,
    );
    if (tile.resource === "wood" && tile.quantity > 0) {
      const height = 0.75 + Math.min(tile.quantity, 4) * 0.14;
      geometry.cube(tile.x, tile.height, tile.z, 0.22, height, 0.22, timber);
      geometry.cube(
        tile.x,
        tile.height + height * 0.6,
        tile.z,
        0.76,
        0.54,
        0.76,
        leaves,
      );
      geometry.cube(
        tile.x,
        tile.height + height * 0.6 + 0.54,
        tile.z,
        0.5,
        0.28,
        0.5,
        leaves,
      );
    } else if (tile.resource === "stone" && tile.quantity > 0) {
      geometry.cube(
        tile.x,
        tile.height,
        tile.z,
        0.65,
        0.25 + Math.min(tile.quantity, 4) * 0.1,
        0.65,
        rock,
      );
      geometry.cube(
        tile.x - 0.17,
        tile.height + 0.1,
        tile.z + 0.19,
        0.25,
        0.3,
        0.3,
        [0.62, 0.7, 0.68],
      );
    }
    if (tile.structure) {
      const bridge = tile.structure.kind === "bridge";
      geometry.cube(
        tile.x,
        tile.height,
        tile.z,
        0.92,
        bridge ? 0.15 : 1.05,
        0.92,
        bridge ? planks : rock,
      );
      if (!bridge) {
        geometry.cube(
          tile.x,
          tile.height + 1.03,
          tile.z,
          0.94,
          0.07,
          0.94,
          campColors[tile.structure.team],
        );
        for (const [dx, dz] of [
          [-0.3, -0.3],
          [-0.3, 0.3],
          [0.3, -0.3],
          [0.3, 0.3],
        ])
          geometry.cube(
            tile.x + dx,
            tile.height + 1.1,
            tile.z + dz,
            0.23,
            0.22,
            0.23,
            rock,
          );
      }
    }
    if (tile.torch)
      geometry.cube(
        tile.x + 0.22,
        tile.height,
        tile.z + 0.2,
        0.09,
        0.65,
        0.09,
        timber,
      );
  }
  for (const team of state.teams) {
    const [x, z] = team.home;
    const height = tileSurface(
      state.tiles.find((tile) => tile.x === x && tile.z === z),
    );
    geometry.cube(x, height, z, 0.7, 0.45, 0.7, timber);
    geometry.cube(x, height + 0.45, z, 0.74, 0.08, 0.74, planks);
    for (const offset of [-0.2, 0.2]) {
      geometry.cube(x + offset, height + 0.53, z, 0.035, 0.01, 0.7, timber);
      geometry.cube(x, height + 0.53, z + offset, 0.7, 0.01, 0.035, timber);
    }
    geometry.cube(x, height + 0.53, z - 0.35, 0.055, 1.3, 0.055, planks);
    geometry.cube(
      x + 0.24,
      height + 1.5,
      z - 0.35,
      0.5,
      0.3,
      0.055,
      campColors[team.id],
    );
  }
  return geometry.finish();
}

export interface RenderPosition {
  x: number;
  z: number;
}

function addBot(
  geometry: Geometry,
  bot: SimulationBot,
  position: RenderPosition,
  height: number,
  time: number,
  moving: boolean,
) {
  const { x, z } = position;
  const gait = moving ? Math.sin(time * 12 + bot.team) * 0.09 : 0;
  const color =
    bot.hurt > 0 ? ([1, 0.91, 0.82] as const) : campColors[bot.team];
  const action = bot.action > 0 ? Math.sin(time * 22) * 0.12 : 0;
  geometry.cube(
    x - 0.085,
    height + Math.max(0, gait),
    z,
    0.12,
    0.24,
    0.16,
    [0.15, 0.22, 0.25],
  );
  geometry.cube(
    x + 0.085,
    height + Math.max(0, -gait),
    z,
    0.12,
    0.24,
    0.16,
    [0.15, 0.22, 0.25],
  );
  geometry.cube(x, height + 0.24, z, 0.3, 0.34, 0.19, color);
  geometry.cube(x, height + 0.6, z, 0.26, 0.26, 0.26, [0.86, 0.78, 0.63]);
  geometry.cube(x, height + 0.8, z, 0.29, 0.1, 0.29, color);
  geometry.cube(x - 0.22, height + 0.23 + action, z, 0.1, 0.32, 0.14, color);
  geometry.cube(x + 0.22, height + 0.23 - action, z, 0.1, 0.32, 0.14, color);
  if (bot.wood > 0 || bot.stone > 0) {
    geometry.cube(
      x - 0.24,
      height + 0.17,
      z + 0.16,
      0.23,
      0.23,
      0.23,
      bot.wood > 0 ? planks : rock,
    );
  }
  if (bot.tool !== "none") {
    const angle = Math.atan2(bot.facing[1], bot.facing[0]);
    const toolX = x + Math.cos(angle) * 0.29;
    const toolZ = z + Math.sin(angle) * 0.29;
    geometry.cube(
      toolX,
      height + 0.24 + action,
      toolZ,
      0.07,
      0.39,
      0.07,
      timber,
    );
    geometry.cube(
      toolX,
      height + 0.53 + action,
      toolZ,
      bot.tool === "pickaxe" ? 0.3 : 0.075,
      bot.tool === "pickaxe" ? 0.075 : 0.28,
      0.075,
      [0.76, 0.85, 0.86],
      angle,
    );
  }
}

export function createActorGeometry(
  state: SimulationState,
  positions: ReadonlyMap<string, RenderPosition>,
  time: number,
  moving: ReadonlySet<string>,
) {
  const geometry = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  for (const bot of state.bots) {
    if (bot.health <= 0) continue;
    const position = positions.get(bot.id) ?? bot;
    const tile = tiles.get(
      `${Math.round(position.x)}:${Math.round(position.z)}`,
    );
    addBot(
      geometry,
      bot,
      position,
      tileSurface(tile) + 0.025,
      time,
      moving.has(bot.id),
    );
  }
  for (const event of state.events) {
    if (event.kind === "explode" || event.kind === "lightning") continue;
    const life = Math.max(0, 1 - event.age / 0.65);
    if (!life) continue;
    const tile = tiles.get(`${Math.round(event.x)}:${Math.round(event.z)}`);
    const height = tileSurface(tile);
    const color =
      event.kind === "hit" || event.kind === "defeat"
        ? ([1, 0.87, 0.68] as const)
        : campColors[event.team];
    for (let part = 0; part < 3; part++) {
      const angle = part * 2.1 + event.id;
      const spread = (1 - life) * 0.5;
      geometry.cube(
        event.x + Math.cos(angle) * spread,
        height + 0.35 + (1 - life) * 0.6,
        event.z + Math.sin(angle) * spread,
        0.1 * life,
        0.1 * life,
        0.1 * life,
        color,
      );
    }
  }
  return geometry.finish();
}
