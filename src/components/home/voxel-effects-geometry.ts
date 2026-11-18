import { mobKey, restPose, type Pose } from "./voxel-animation";
import {
  Geometry,
  KIND,
  tileNoise,
  tileSurface,
  tileTop,
  type Color,
  type Rig,
  type Vertex,
} from "./voxel-geometry";
import { flicker } from "./voxel-lights";
import type { SimulationMob, SimulationState } from "./voxel-simulation-types";

const flame: Color = [1, 0.47, 0.07];
const white: Color = [0.93, 0.97, 1];
const black: Color = [0.035, 0.055, 0.045];
const bowWood: Color = [0.49, 0.28, 0.13];
const SKELETON_RELOAD_SECONDS = 1.8;

function glowCube(
  g: Geometry,
  x: number,
  y: number,
  z: number,
  size: number,
  color: Color,
  light = 1,
) {
  g.cube(x, y, z, size, size, size, color, 0, 7, light);
}

function soft(opacity: number) {
  return { kind: KIND.soft, param: Math.max(0, Math.min(1, opacity)) };
}

function mobGeometry(
  g: Geometry,
  mob: SimulationMob,
  pose: Pose,
  height: number,
  time: number,
) {
  const walk = pose.walk;
  const idle = 1 - walk;
  const swing = Math.sin(pose.stride) * 0.65 * walk;
  const fused = mob.fuse >= 0;
  const rig: Rig = {
    x: pose.x + (fused ? Math.sin(time * 45) * 0.012 : 0),
    y: height + Math.abs(Math.sin(pose.stride)) * 0.03 * walk,
    z: pose.z,
    yaw: pose.yaw,
    scale: pose.scale * (fused ? 1 + Math.sin(time * 16) * 0.1 : 1),
  };
  g.shadow(pose.x, height, pose.z, 0.3 * pose.scale, 0.34);
  if (mob.kind === "creeper") {
    const green: Color =
      mob.hurt > 0 || (fused && Math.sin(time * 14) > 0.5)
        ? white
        : [0.34, 0.7, 0.2];
    for (const [dx, dz] of [
      [-0.13, -0.15],
      [-0.13, 0.15],
      [0.13, -0.15],
      [0.13, 0.15],
    ] as const)
      g.part(
        rig,
        [dx, 0.23, dz],
        [0, -0.23, 0, 0.17, 0.23, 0.2],
        green,
        swing * Math.sign(dx * dz),
      );
    g.part(rig, [0, 0.23, 0], [0, 0, 0, 0.32, 0.52, 0.28], green);
    const head: Vertex = [0, 0.72, 0];
    const look = Math.sin(time * 0.8 + mob.id) * 0.35 * idle;
    g.part(rig, head, [0, 0, 0, 0.48, 0.42, 0.42], green, 0, look);
    for (const dx of [-0.12, 0.12])
      g.part(rig, head, [dx, 0.22, 0.213, 0.1, 0.09, 0.012], black, 0, look);
    g.part(rig, head, [0, 0.06, 0.213, 0.14, 0.16, 0.012], black, 0, look);
    for (const dx of [-0.075, 0.075])
      g.part(rig, head, [dx, 0.04, 0.213, 0.06, 0.075, 0.012], black, 0, look);
    if (fused) {
      const y = height + 1.22 + Math.sin(time * 8) * 0.06;
      glowCube(g, pose.x, y, pose.z, 0.12, flame);
      g.halo(pose.x, y, pose.z, 1.1, [1, 0.9, 0.7], 0.5);
    }
    return;
  }
  const skeleton = mob.kind === "skeleton";
  const skin: Color =
    mob.hurt > 0 ? white : skeleton ? [0.85, 0.86, 0.76] : [0.26, 0.55, 0.25];
  const torso: Color = skeleton ? skin : [0.16, 0.46, 0.49];
  const limb = skeleton ? 0.075 : 0.12;
  for (const dx of [-0.09, 0.09])
    g.part(
      rig,
      [dx, 0.35, 0],
      [0, -0.35, 0, limb, 0.35, limb],
      skeleton ? skin : [0.24, 0.2, 0.32],
      swing * Math.sign(dx),
    );
  g.part(
    rig,
    [0, 0.35, 0],
    [0, 0, 0, skeleton ? 0.22 : 0.31, 0.35, skeleton ? 0.13 : 0.21],
    torso,
  );
  const head: Vertex = [0, 0.71, 0];
  const tilt = skeleton ? 0 : Math.sin(time * 1.3 + mob.id) * 0.14;
  const look = Math.sin(time * 0.9 + mob.id * 2) * (skeleton ? 0.15 : 0.3);
  g.part(rig, head, [0, 0, 0, 0.29, 0.29, 0.27], skin, tilt, look);
  for (const dx of [-0.075, 0.075])
    g.part(rig, head, [dx, 0.15, 0.137, 0.065, 0.06, 0.012], black, tilt, look);
  if (skeleton) {
    for (const rib of [0.06, 0.16, 0.26])
      g.part(rig, [0, 0.35, 0], [0, rib, 0.07, 0.24, 0.035, 0.035], skin);
    // The free arm pulls back while the bow reloads.
    const draw = 1 - Math.min(1, mob.cooldown / SKELETON_RELOAD_SECONDS);
    const bowArm: Vertex = [-0.16, 0.66, 0];
    g.part(rig, bowArm, [0, -0.36, 0, 0.07, 0.36, 0.07], skin, 1.5);
    g.part(rig, bowArm, [0, -0.41, 0, 0.05, 0.05, 0.5], bowWood, 1.5);
    for (const tip of [-0.27, 0.27])
      g.part(rig, bowArm, [0, -0.37, tip, 0.05, 0.07, 0.08], bowWood, 1.5);
    g.part(
      rig,
      bowArm,
      [0, -0.32, 0, 0.014, 0.014, 0.56],
      [0.8, 0.8, 0.7],
      1.5,
    );
    g.part(
      rig,
      [0.16, 0.66, 0],
      [0, -0.36, 0, 0.07, 0.36, 0.07],
      skin,
      1.5 - draw * 0.55,
    );
  } else {
    for (const dx of [-0.2, 0.2])
      g.part(
        rig,
        [dx, 0.66, 0],
        [0, -0.4, 0, 0.12, 0.4, 0.12],
        skin,
        1.45 + Math.sin(time * 2.4 + mob.id + dx * 9) * 0.14,
      );
  }
}

/** Fireflies at night and butterflies by day, on fixed hashed paths. */
function wildlife(
  g: Geometry,
  state: SimulationState,
  time: number,
  heightAt: (x: number, z: number) => number,
) {
  const night = state.adventure.night;
  const dark = Math.min(1, Math.max(0, (night - 0.3) / 0.3));
  const day = state.adventure.storm > 0 ? 0 : 1 - Math.min(1, night / 0.3);
  for (let index = 0; index < 12; index++) {
    const angle = tileNoise(index, 1, 11) * Math.PI * 2;
    const radius = 1.5 + tileNoise(index, 2, 12) * 5.5;
    const x =
      Math.cos(angle) * radius + Math.sin(time * 0.31 + index * 1.9) * 0.7;
    const z =
      Math.sin(angle) * radius + Math.sin(time * 0.23 + index * 2.7) * 0.7;
    const y = heightAt(x, z) + 0.55 + Math.sin(time * 0.8 + index * 1.3) * 0.22;
    if (index < 5 && day > 0) {
      const flap = Math.abs(Math.sin(time * 13 + index)) * 0.09 + 0.02;
      const wing: Color = index % 2 ? [0.97, 0.79, 0.36] : [0.93, 0.56, 0.74];
      const bx = x + Math.sin(time * 1.7 + index) * 0.5;
      g.cube(bx, y, z, 0.03 * day, 0.03 * day, 0.09 * day, black);
      for (const side of [-1, 1])
        g.cube(
          bx + side * (flap / 2 + 0.015),
          y + 0.03 - flap * 0.25,
          z,
          flap * day,
          0.014,
          0.1 * day,
          wing,
        );
    }
    if (dark > 0) {
      const blink = dark * Math.max(0, Math.sin(time * 1.6 + index * 2.4)) ** 2;
      if (blink < 0.05) continue;
      glowCube(g, x, y, z, 0.045, [0.85, 1, 0.5], blink);
      g.halo(x, y, z, 0.42, [0.7, 1, 0.35], blink * 0.6);
    }
  }
}

export function createEffectsGeometry(
  state: SimulationState,
  time: number,
  poses: ReadonlyMap<string, Pose> = new Map(),
) {
  const g = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  const heightAt = (x: number, z: number) =>
    tileSurface(tiles.get(`${Math.round(x)}:${Math.round(z)}`));
  for (const tile of state.tiles) {
    if (tile.torch) {
      const burn = flicker(time, tile.x);
      const tx = tile.x + 0.22,
        tz = tile.z + 0.2;
      glowCube(g, tx, tile.height + 0.61, tz, 0.16 * burn, flame);
      glowCube(g, tx, tile.height + 0.73, tz, 0.09 * burn, [1, 0.85, 0.32]);
      g.halo(tx, tile.height + 0.72, tz, 1.5 * burn, [1, 0.6, 0.2], 0.55);
      for (let puff = 0; puff < 2; puff++) {
        const phase = (time * 0.45 + puff * 0.5 + tile.z * 0.37) % 1;
        const size = 0.05 + phase * 0.07;
        g.cube(
          tx + Math.sin(time * 1.1 + puff * 3 + tile.x) * 0.06 * phase,
          tile.height + 0.86 + phase * 0.75,
          tz,
          size,
          size,
          size,
          [0.5, 0.5, 0.52],
          0,
          7,
          0,
          soft((1 - phase) * 0.4),
        );
      }
    }
    if (tile.hazard === "lava") {
      const top = tileTop(tile);
      for (let part = 0; part < 2; part++) {
        const phase = (time * 1.5 + tile.x * 0.7 + tile.z + part * 0.5) % 1;
        const bubble = Math.abs(phase);
        glowCube(
          g,
          tile.x + Math.sin(tile.z + part) * 0.25,
          top + Math.sin(bubble * Math.PI) * 0.2,
          tile.z + Math.cos(tile.x + part) * 0.25,
          0.09,
          [1, 0.65, 0.09],
        );
      }
      // One ember drifts up from each tile and fades out.
      const rise = (((time * 0.4 + tileNoise(tile.x, tile.z, 2)) % 1) + 1) % 1;
      g.cube(
        tile.x + Math.sin(time * 0.9 + tile.x * 3) * 0.3,
        top + 0.15 + rise * 1.7,
        tile.z + Math.cos(time * 0.7 + tile.z * 3) * 0.3,
        0.05,
        0.05,
        0.05,
        [1, 0.72, 0.2],
        0,
        7,
        1,
        soft(1 - rise),
      );
      g.halo(
        tile.x,
        top + 0.15,
        tile.z,
        1.35,
        [1, 0.3, 0.05],
        0.3 + Math.sin(time * 1.3 + tile.x * 2 + tile.z) * 0.06,
      );
    }
    if ((tile.fire ?? 0) > 0) {
      for (let part = 0; part < 4; part++) {
        const phase = (time * 1.8 + part * 0.26) % 1;
        glowCube(
          g,
          tile.x + Math.sin(part * 2.4) * 0.2,
          tile.height + phase * 1.1,
          tile.z + Math.cos(part * 2.4) * 0.2,
          0.3 * (1 - phase) + 0.04,
          part % 2 ? flame : [1, 0.75, 0.2],
        );
      }
      g.halo(
        tile.x,
        tile.height + 0.5,
        tile.z,
        2 * flicker(time, tile.x + tile.z),
        [1, 0.5, 0.12],
        0.6,
      );
    }
  }
  for (const charge of state.adventure.charges) {
    const flight = charge.flight / 0.8;
    const x = charge.x + (charge.originX - charge.x) * flight;
    const z = charge.z + (charge.originZ - charge.z) * flight;
    const height =
      heightAt(charge.x, charge.z) + Math.sin(flight * Math.PI) * 3.6;
    const pulse = charge.fuse < 1.5 && Math.sin(time * 14) > 0.3;
    const red: Color = pulse ? white : [0.82, 0.12, 0.075];
    g.cube(x, height, z, 0.62, 0.62, 0.62, red, 0, 7, pulse ? 0.8 : 0.15);
    g.cube(
      x,
      height + 0.2,
      z,
      0.635,
      0.2,
      0.635,
      [0.92, 0.88, 0.72],
      0,
      7,
      0.2,
    );
    for (const offset of [-0.18, 0, 0.18]) {
      if (offset === 0) {
        for (const dx of [-0.045, 0.045])
          g.cube(x + dx, height + 0.24, z + 0.325, 0.025, 0.13, 0.016, black);
        g.beam(
          [x - 0.045, height + 0.35, z + 0.325],
          [x + 0.045, height + 0.25, z + 0.325],
          0.025,
          black,
        );
        continue;
      }
      g.cube(x + offset, height + 0.24, z + 0.325, 0.035, 0.13, 0.016, black);
      g.cube(x + offset, height + 0.36, z + 0.325, 0.11, 0.028, 0.016, black);
    }
    glowCube(g, x, height + 0.68, z, 0.09, flame);
    g.halo(x, height + 0.7, z, pulse ? 1.3 : 0.7, [1, 0.6, 0.25], 0.55);
    for (let smoke = 0; smoke < 3; smoke++) {
      const phase = (time + smoke * 0.3) % 1;
      g.cube(
        x + Math.sin(time * 2 + smoke) * 0.1,
        height + 0.8 + phase,
        z,
        0.11 + phase * 0.06,
        0.11,
        0.11,
        [0.4, 0.42, 0.45],
        0,
        7,
        0,
        soft((1 - phase) * 0.7),
      );
    }
  }
  for (const mob of state.adventure.mobs)
    if (mob.health > 0) {
      const pose = poses.get(mobKey(mob.id)) ?? restPose(mob);
      mobGeometry(g, mob, pose, heightAt(pose.x, pose.z) + 0.02, time);
    }
  wildlife(g, state, time, heightAt);
  for (const arrow of state.adventure.arrows) {
    const length = Math.hypot(arrow.vx, arrow.vy, arrow.vz) || 1;
    const dx = arrow.vx / length,
      dy = arrow.vy / length,
      dz = arrow.vz / length;
    g.beam(
      [arrow.x - dx * 0.65, arrow.y - dy * 0.65, arrow.z - dz * 0.65],
      [arrow.x, arrow.y, arrow.z],
      0.04,
      [0.95, 0.87, 0.61],
      0.7,
    );
    glowCube(g, arrow.x, arrow.y, arrow.z, 0.07, white);
  }
  const explosions = state.events
    .filter((event) => event.kind === "explode" && event.age < 1.4)
    .slice(-3);
  for (const event of explosions) {
    const age = event.age;
    const scale = (event.power ?? 2.4) / 2.4;
    const height = heightAt(event.x, event.z);
    if (age < 0.5)
      g.halo(
        event.x,
        height + 0.7,
        event.z,
        5 * scale,
        [1, 0.82, 0.55],
        1 - age / 0.5,
      );
    if (age < 0.65) {
      const size = (0.3 + age * 2.5) * (1 - age / 0.8) * scale;
      const spread = (1 + age * 1.8) * scale;
      for (const [dx, dy, dz] of [
        [0, 0, 0],
        [-0.55, 0.2, 0],
        [0.55, 0.2, 0],
        [0, 0.2, -0.55],
        [0, 0.2, 0.55],
        [-0.3, 0.7, 0.25],
        [0.3, 0.8, -0.25],
      ] as const)
        glowCube(
          g,
          event.x + dx * spread,
          height + 0.25 + dy * spread,
          event.z + dz * spread,
          size,
          [1 - age * 0.4, 0.95 - age * 0.3, 0.85 - age * 0.2],
        );
    }
    for (let smoke = 0; smoke < 8; smoke++) {
      const angle = smoke * 2.4 + event.id;
      const size = (0.12 + age * 0.32) * (1 - age / 1.6) * scale;
      g.cube(
        event.x + Math.cos(angle) * age,
        height + 0.35 + age * (1.2 + Math.sin(smoke) * 0.4),
        event.z + Math.sin(angle) * age,
        size,
        size,
        size,
        [0.54, 0.56, 0.58],
        0,
        7,
        0.4,
        soft((1 - age / 1.4) * 0.85),
      );
    }
    for (let part = 0; part < 28; part++) {
      const angle = part * 2.3999 + event.id;
      const speed = (1.3 + Math.sin(part * 5.1) * 0.7) * scale;
      const x = event.x + Math.cos(angle) * speed * age * 2.5;
      const z = event.z + Math.sin(angle) * speed * age * 2.5;
      const y =
        height + 0.2 + (2 + Math.sin(part * 1.7) * 2) * age - 2.2 * age * age;
      const size = Math.max(
        0.02,
        (1 - age / 1.4) * (part % 4 === 0 ? 0.24 : 0.13),
      );
      if (y >= height - 0.1)
        g.cube(
          x,
          y,
          z,
          size,
          size,
          size,
          part % 3 === 0
            ? [0.4, 0.36, 0.3]
            : part % 2
              ? flame
              : [1, 0.82, 0.37],
          0,
          7,
          part % 3 === 0 ? 0 : 0.95,
        );
      if (part % 4 === 0 && age < 0.75 && y > height)
        g.beam(
          [x - Math.cos(angle) * 0.35, y - 0.05, z - Math.sin(angle) * 0.35],
          [x, y, z],
          0.045,
          [1, 0.86, 0.4],
          1,
        );
    }
    if (age < 0.65)
      for (let segment = 0; segment < 12; segment++) {
        const a = (segment / 12) * Math.PI * 2,
          b = ((segment + 1) / 12) * Math.PI * 2;
        const radius = age * 6 * scale;
        g.beam(
          [
            event.x + Math.cos(a) * radius,
            Math.max(
              height,
              heightAt(
                event.x + Math.cos(a) * radius,
                event.z + Math.sin(a) * radius,
              ),
            ) + 0.12,
            event.z + Math.sin(a) * radius,
          ],
          [
            event.x + Math.cos(b) * radius,
            Math.max(
              height,
              heightAt(
                event.x + Math.cos(b) * radius,
                event.z + Math.sin(b) * radius,
              ),
            ) + 0.12,
            event.z + Math.sin(b) * radius,
          ],
          0.08 * (1 - age / 0.65),
          flame,
          1,
        );
      }
  }
  for (const event of state.events
    .filter((effect) => effect.kind === "lightning" && effect.age < 0.42)
    .slice(-2)) {
    const height = heightAt(event.x, event.z);
    g.halo(
      event.x,
      height + 0.4,
      event.z,
      3.6,
      [0.6, 0.8, 1],
      1 - event.age / 0.42,
    );
    for (let part = 0; part < 6; part++) {
      const x = event.x + Math.sin(event.id + part * 3) * 0.35;
      const nextX = event.x + Math.sin(event.id + (part + 1) * 3) * 0.35;
      const fromY = height + 7 - part * 1.15,
        toY = height + 7 - (part + 1) * 1.15;
      g.beam([x, fromY, event.z], [nextX, toY, event.z], 0.08, white, 1);
      if (part === 2)
        g.beam(
          [x, fromY, event.z],
          [x + 1, toY - 0.8, event.z + 0.5],
          0.04,
          [0.5, 0.72, 1],
          1,
        );
    }
  }
  if (state.adventure.storm > 0)
    for (let cloud = 0; cloud < 3; cloud++) {
      const drift = Math.sin(time * 0.12 + cloud) * 0.4;
      for (let puff = 0; puff < 4; puff++)
        g.cube(
          -4 + cloud * 3 + puff * 0.6 + drift,
          5.4 + (puff % 2) * 0.2,
          -6 + cloud * 0.5,
          1.5,
          0.45,
          1.1,
          [0.22, 0.27, 0.33],
          0,
          7,
          0.45,
          soft(0.88),
        );
    }
  if (state.adventure.storm > 0)
    for (let drop = 0; drop < 32; drop++) {
      const x = Math.sin(drop * 4.7) * 8,
        z = Math.cos(drop * 2.3) * 8;
      const y = 2 + ((((6 - time * 5 + drop * 0.31) % 5) + 5) % 5);
      g.beam(
        [x, y, z],
        [x - 0.08, y - 0.55, z + 0.04],
        0.012,
        [0.35, 0.6, 0.8],
        0.3,
        soft(0.6),
      );
    }
  return g.finish();
}
