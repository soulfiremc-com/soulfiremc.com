import { restPose, type Pose } from "./voxel-animation";
import { HURT_SECONDS } from "./voxel-simulation";
import type {
  SimulationBot,
  SimulationState,
  SimulationTile,
} from "./voxel-simulation-types";

export type Color = readonly [number, number, number];
export type Vertex = readonly [number, number, number];
/** Position, color, face UV, glow, then the material kind and its parameter. */
export const VERTEX_STRIDE = 11;
/**
 * Material kinds read by the shaders. The parameter means: sway weight for
 * `solid`, wave weight for `water`, opacity for `soft` and `shadow`, and the
 * radius for `halo`.
 */
export const KIND = {
  solid: 0,
  water: 1,
  lava: 2,
  soft: 3,
  halo: 4,
  shadow: 5,
} as const;

export interface Mesh {
  vertices: Float32Array;
  /** Vertices before this index are opaque. The rest need blending. */
  opaque: number;
}

export interface FaceStyle {
  kind?: number;
  param?: number;
  /** Parameter for the upper vertices of a cube. Defaults to `param`. */
  paramTop?: number;
}

/** Where an articulated model stands, and how it is turned and scaled. */
export interface Rig {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

/** Center X, bottom Y and center Z relative to the pivot, then the size. */
export type Box = readonly [number, number, number, number, number, number];

const campColors: readonly Color[] = [
  [0.4, 0.85, 0.83],
  [0.93, 0.69, 0.46],
];
const grass: Color = [0.22, 0.43, 0.38];
const rock: Color = [0.35, 0.43, 0.45];
export const timber: Color = [0.5, 0.34, 0.22];
const planks: Color = [0.64, 0.47, 0.3];
const skin: Color = [0.86, 0.78, 0.63];
const dark: Color = [0.08, 0.1, 0.12];
const quadUv = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;
const quadOrder = [0, 1, 2, 0, 2, 3] as const;
/** Unit vector from the scene toward the fixed isometric camera. */
const toCamera: Vertex = [0.591, 0.549, 0.591];
/** Local normal, then the corner signs (x, y, z) of each box face. */
const boxFaces: readonly (readonly [Vertex, readonly Vertex[]])[] = [
  [
    [0, 0, 1],
    [
      [-1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  ],
  [
    [0, 0, -1],
    [
      [1, 0, -1],
      [-1, 0, -1],
      [-1, 1, -1],
      [1, 1, -1],
    ],
  ],
  [
    [1, 0, 0],
    [
      [1, 0, -1],
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, -1],
    ],
  ],
  [
    [-1, 0, 0],
    [
      [-1, 0, 1],
      [-1, 0, -1],
      [-1, 1, -1],
      [-1, 1, 1],
    ],
  ],
  [
    [0, 1, 0],
    [
      [-1, 1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  ],
  [
    [0, -1, 0],
    [
      [-1, 0, -1],
      [1, 0, -1],
      [1, 0, 1],
      [-1, 0, 1],
    ],
  ],
];

function isBlended(kind: number) {
  return kind === KIND.water || kind >= KIND.soft;
}

export class Geometry {
  private opaque: number[] = [];
  private blended: number[] = [];

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
    style: FaceStyle = {},
  ) {
    const kind = style.kind ?? KIND.solid;
    const param = style.param ?? 0;
    const paramTop = style.paramTop ?? param;
    const target = isBlended(kind) ? this.blended : this.opaque;
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
    for (const [face, corners] of faces.entries()) {
      if (!(faceMask & (1 << face))) continue;
      const shade = [0.54, 0.72, 1][face];
      for (const index of quadOrder) {
        const corner = corners[index];
        target.push(
          corner[0],
          corner[1],
          corner[2],
          color[0] * shade,
          color[1] * shade,
          color[2] * shade,
          quadUv[index][0],
          quadUv[index][1],
          glow,
          kind,
          corner[1] > y + height / 2 ? paramTop : param,
        );
      }
    }
  }

  /**
   * Adds a box that belongs to an articulated model. The box pitches and
   * turns around `pivot`, then follows the rig. Local +Z is the front.
   */
  part(
    rig: Rig,
    pivot: Vertex,
    box: Box,
    color: Color,
    pitch = 0,
    turn = 0,
    glow = 0,
  ) {
    const [ox, oy, oz, width, height, depth] = box;
    const cosPitch = Math.cos(pitch),
      sinPitch = Math.sin(pitch);
    const cosTurn = Math.cos(turn),
      sinTurn = Math.sin(turn);
    const cosYaw = Math.cos(rig.yaw),
      sinYaw = Math.sin(rig.yaw);
    const rotate = (qx: number, qy: number, qz: number): Vertex => {
      const y = qy * cosPitch + qz * sinPitch;
      const z1 = -qy * sinPitch + qz * cosPitch;
      const x = qx * cosTurn - z1 * sinTurn;
      const z = qx * sinTurn + z1 * cosTurn;
      return [x * cosYaw - z * sinYaw, y, x * sinYaw + z * cosYaw];
    };
    // The pivot offset only follows the rig yaw, not the part's own rotation.
    const pivotX = pivot[0] * cosYaw - pivot[2] * sinYaw;
    const pivotZ = pivot[0] * sinYaw + pivot[2] * cosYaw;
    for (const [normal, corners] of boxFaces) {
      const n = rotate(normal[0], normal[1], normal[2]);
      const facing =
        n[0] * toCamera[0] + n[1] * toCamera[1] + n[2] * toCamera[2];
      if (facing < -0.12) continue;
      const shade = Math.max(
        0.4,
        0.63 + 0.09 * (n[0] - n[2]) + (n[1] > 0 ? 0.37 : 0.2) * n[1],
      );
      for (const index of quadOrder) {
        const sign = corners[index];
        const local = rotate(
          ox + (sign[0] * width) / 2,
          oy + sign[1] * height,
          oz + (sign[2] * depth) / 2,
        );
        this.opaque.push(
          rig.x + (pivotX + local[0]) * rig.scale,
          rig.y + (pivot[1] + local[1]) * rig.scale,
          rig.z + (pivotZ + local[2]) * rig.scale,
          color[0] * shade,
          color[1] * shade,
          color[2] * shade,
          quadUv[index][0],
          quadUv[index][1],
          glow,
          KIND.solid,
          0,
        );
      }
    }
  }

  /** Adds a soft round glow that always faces the camera. */
  halo(
    x: number,
    y: number,
    z: number,
    radius: number,
    color: Color,
    intensity = 1,
  ) {
    for (const index of quadOrder)
      this.blended.push(
        x,
        y,
        z,
        color[0] * intensity,
        color[1] * intensity,
        color[2] * intensity,
        quadUv[index][0],
        quadUv[index][1],
        0,
        KIND.halo,
        radius,
      );
  }

  /** Adds a round contact shadow that lies flat on the ground. */
  shadow(x: number, y: number, z: number, radius: number, opacity: number) {
    for (const index of quadOrder) {
      const [u, v] = quadUv[index];
      this.blended.push(
        x + (u * 2 - 1) * radius,
        y,
        z + (v * 2 - 1) * radius,
        0,
        0,
        0,
        u,
        v,
        0,
        KIND.shadow,
        opacity,
      );
    }
  }

  finish(): Mesh {
    const vertices = new Float32Array(this.opaque.length + this.blended.length);
    vertices.set(this.opaque);
    vertices.set(this.blended, this.opaque.length);
    return { vertices, opaque: this.opaque.length / VERTEX_STRIDE };
  }

  beam(
    from: Vertex,
    to: Vertex,
    width: number,
    color: Color,
    glow = 0,
    style: FaceStyle = {},
  ) {
    const kind = style.kind ?? KIND.solid;
    const param = style.param ?? 0;
    const target = isBlended(kind) ? this.blended : this.opaque;
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
    for (const normal of [right, up]) {
      const corners = [from, to, to, from].map((point, index) =>
        point.map(
          (value, axis) =>
            value + normal[axis] * width * (index < 2 ? -0.5 : 0.5),
        ),
      );
      for (const index of quadOrder)
        target.push(
          ...corners[index],
          ...color,
          ...quadUv[index],
          glow,
          kind,
          param,
        );
    }
  }
}

/**
 * How far the water surface is drawn above a water tile. Water tiles are one
 * block lower than land, and the near bank would hide a surface at that
 * level, so the water fills the channel almost to the top of the banks.
 */
const WATER_SURFACE = 0.82;

/** The height at which the terrain draws the top of a tile. */
export function tileTop(tile: SimulationTile) {
  if (tile.hazard === "lava") return tile.height - 0.1;
  if (tile.material === "water") return tile.height + WATER_SURFACE;
  return tile.height;
}

/** The height at which things stand on a tile. */
export function tileSurface(tile: SimulationTile | undefined) {
  if (!tile) return 1;
  const ground = tile.material === "water" ? tileTop(tile) : tile.height;
  return ground + (tile.structure?.kind === "bridge" ? 0.15 : 0);
}

/** Stable pseudo-random value in [0, 1) for a tile and a salt. */
export function tileNoise(x: number, z: number, salt = 0) {
  const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

const rendered = (tile: SimulationTile) =>
  tile.material !== "water" || Math.hypot(tile.x, tile.z) <= 9.2;

export function createTerrainGeometry(state: SimulationState) {
  const geometry = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  for (const tile of state.tiles) {
    if (!rendered(tile)) continue;
    const top = tileTop(tile);
    let faceMask = 4;
    for (const [dx, dz, mask] of [
      [0, 1, 1],
      [1, 0, 2],
    ]) {
      const neighbor = tiles.get(`${tile.x + dx}:${tile.z + dz}`);
      if (!neighbor || !rendered(neighbor) || tileTop(neighbor) < top)
        faceMask |= mask;
    }
    const variation = Math.sin(tile.x * 7.3 + tile.z * 4.7) * 0.025;
    if (tile.hazard === "lava") {
      geometry.cube(
        tile.x,
        -0.9,
        tile.z,
        0.98,
        top + 0.9,
        0.98,
        [1, 0.25, 0.025],
        0,
        faceMask,
        1,
        { kind: KIND.lava },
      );
    } else if (tile.material === "water") {
      // A seabed under a translucent water volume, so the depth shows through.
      const bed = -0.52 + tileNoise(tile.x, tile.z, 3) * 0.14;
      geometry.cube(
        tile.x,
        -0.9,
        tile.z,
        0.98,
        bed + 0.9,
        0.98,
        [0.2 + variation, 0.27 + variation, 0.25 + variation],
        0,
        faceMask,
      );
      geometry.cube(
        tile.x,
        bed,
        tile.z,
        1,
        top - bed,
        1,
        [0.14, 0.47, 0.78],
        0,
        faceMask,
        0,
        { kind: KIND.water, param: 0, paramTop: 1 },
      );
    } else {
      const color =
        tile.hazard === "scorch"
          ? ([0.22, 0.24, 0.24] as const)
          : tile.material === "sand"
            ? ([0.57, 0.52, 0.37] as const)
            : tile.material === "stone"
              ? rock
              : grass;
      geometry.cube(
        tile.x,
        -0.9,
        tile.z,
        0.98,
        top + 0.9,
        0.98,
        [color[0] + variation, color[1] + variation, color[2] + variation],
        0,
        faceMask,
      );
    }
    if (tile.resource === "stone" && tile.quantity > 0) {
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
    const base = tile.material === "water" ? top : tile.height;
    if (tile.structure) {
      const bridge = tile.structure.kind === "bridge";
      geometry.cube(
        tile.x,
        base,
        tile.z,
        0.92,
        bridge ? 0.15 : 1.05,
        0.92,
        bridge ? planks : rock,
      );
      if (!bridge) {
        geometry.cube(
          tile.x,
          base + 1.03,
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
            base + 1.1,
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
        base,
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
    // The cloth is cut into strips that sway more toward the free end.
    for (let strip = 0; strip < 3; strip++)
      geometry.cube(
        x + 0.11 + strip * 0.167,
        height + 1.5,
        z - 0.35,
        0.167,
        0.3,
        0.055,
        campColors[team.id],
        0,
        7,
        0,
        { param: 0.25 + strip * 0.4 },
      );
  }
  return geometry.finish();
}

function addBot(
  geometry: Geometry,
  bot: SimulationBot,
  pose: Pose,
  height: number,
  time: number,
) {
  const seed = bot.id.charCodeAt(bot.id.length - 1) * 1.7 + bot.team * 2.9;
  const walk = pose.walk;
  const idle = 1 - walk;
  const swing = Math.sin(pose.stride) * 0.75 * walk;
  const bob =
    Math.abs(Math.sin(pose.stride)) * 0.035 * walk +
    Math.sin(time * 2.2 + seed) * 0.008 * idle;
  const hop =
    bot.hurt > 0
      ? Math.sin(Math.min(1, bot.hurt / HURT_SECONDS) * Math.PI) * 0.09
      : 0;
  const rig: Rig = {
    x: pose.x,
    y: height + bob + hop,
    z: pose.z,
    yaw: pose.yaw,
    scale: pose.scale,
  };
  const color =
    bot.hurt > 0 ? ([1, 0.91, 0.82] as const) : campColors[bot.team];
  const trousers: Color = [0.15, 0.22, 0.25];
  const carrying = bot.wood > 0 || bot.stone > 0;
  const working = bot.action > 0;
  const look =
    Math.sin(time * 0.6 + seed) * Math.sin(time * 0.23 + seed * 2) * 0.7 * idle;
  // A fleeing bot throws its arms up and waves them.
  const panic =
    bot.task === "flee" ? 2.7 + Math.sin(time * 16 + seed) * 0.35 : null;
  const leftArm = panic ?? (carrying ? 0.8 : -swing);
  const rightArm = panic
    ? panic - 0.3
    : working
      ? 1.1 + Math.sin(time * 20) * 0.9
      : carrying
        ? 0.8
        : bot.tool === "none"
          ? swing
          : 0.35 + swing * 0.5;
  geometry.shadow(pose.x, height, pose.z, 0.27 * pose.scale, 0.34);
  geometry.part(
    rig,
    [-0.085, 0.24, 0],
    [0, -0.24, 0, 0.12, 0.24, 0.16],
    trousers,
    swing,
  );
  geometry.part(
    rig,
    [0.085, 0.24, 0],
    [0, -0.24, 0, 0.12, 0.24, 0.16],
    trousers,
    -swing,
  );
  geometry.part(rig, [0, 0.24, 0], [0, 0, 0, 0.3, 0.34, 0.19], color);
  geometry.part(
    rig,
    [-0.21, 0.56, 0],
    [0, -0.32, 0, 0.1, 0.32, 0.14],
    color,
    leftArm,
  );
  geometry.part(
    rig,
    [0.21, 0.56, 0],
    [0, -0.32, 0, 0.1, 0.32, 0.14],
    color,
    rightArm,
  );
  const nod = working ? 0.18 : 0;
  geometry.part(
    rig,
    [0, 0.59, 0],
    [0, 0, 0, 0.26, 0.26, 0.26],
    skin,
    nod,
    look,
  );
  geometry.part(
    rig,
    [0, 0.59, 0],
    [0, 0.2, 0, 0.29, 0.1, 0.29],
    color,
    nod,
    look,
  );
  for (const side of [-0.065, 0.065])
    geometry.part(
      rig,
      [0, 0.59, 0],
      [side, 0.09, 0.131, 0.05, 0.055, 0.012],
      dark,
      nod,
      look,
    );
  if (carrying)
    geometry.part(
      rig,
      [0, 0.27, 0.27],
      [0, 0, 0, 0.23, 0.23, 0.23],
      bot.wood > 0 ? planks : rock,
    );
  if (bot.tool !== "none") {
    const metal: Color = [0.76, 0.85, 0.86];
    const hand: Vertex = [0.21, 0.56, 0];
    if (bot.tool === "pickaxe") {
      geometry.part(
        rig,
        hand,
        [0, -0.33, 0.17, 0.06, 0.06, 0.4],
        timber,
        rightArm,
      );
      geometry.part(
        rig,
        hand,
        [0, -0.46, 0.36, 0.07, 0.32, 0.07],
        metal,
        rightArm,
      );
    } else {
      geometry.part(
        rig,
        hand,
        [0, -0.33, 0.04, 0.06, 0.06, 0.14],
        timber,
        rightArm,
      );
      geometry.part(
        rig,
        hand,
        [0, -0.35, 0.12, 0.17, 0.1, 0.035],
        timber,
        rightArm,
      );
      geometry.part(
        rig,
        hand,
        [0, -0.335, 0.33, 0.05, 0.07, 0.4],
        metal,
        rightArm,
      );
    }
  }
}

export function createActorGeometry(
  state: SimulationState,
  poses: ReadonlyMap<string, Pose>,
  time: number,
) {
  const geometry = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  for (const bot of state.bots) {
    if (bot.health <= 0) continue;
    const pose = poses.get(bot.id) ?? restPose(bot);
    const tile = tiles.get(`${Math.round(pose.x)}:${Math.round(pose.z)}`);
    addBot(geometry, bot, pose, tileSurface(tile) + 0.025, time);
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
