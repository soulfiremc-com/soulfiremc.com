import { Geometry, tileSurface, type Color } from "./voxel-geometry";
import type { SimulationMob, SimulationState } from "./voxel-simulation-types";

const flame: Color = [1, 0.47, 0.07];
const white: Color = [0.93, 0.97, 1];
const black: Color = [0.035, 0.055, 0.045];

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

function mobGeometry(
  g: Geometry,
  mob: SimulationMob,
  height: number,
  time: number,
) {
  const { x, z } = mob;
  const gait = Math.sin(time * 8 + mob.id) * 0.07;
  if (mob.kind === "creeper") {
    const swell = mob.fuse >= 0 ? 1 + Math.sin(time * 16) * 0.1 : 1;
    const green: Color =
      mob.hurt > 0 || (mob.fuse >= 0 && Math.sin(time * 14) > 0.5)
        ? white
        : [0.34, 0.7, 0.2];
    for (const [dx, dz] of [
      [-0.13, -0.15],
      [-0.13, 0.15],
      [0.13, -0.15],
      [0.13, 0.15],
    ])
      g.cube(
        x + dx,
        height + Math.max(0, gait * Math.sign(dz)),
        z + dz,
        0.17,
        0.23,
        0.2,
        green,
      );
    g.cube(
      x,
      height + 0.23,
      z,
      0.32 * swell,
      0.52 * swell,
      0.28 * swell,
      green,
    );
    g.cube(
      x,
      height + 0.72,
      z,
      0.48 * swell,
      0.42 * swell,
      0.42 * swell,
      green,
    );
    for (const dx of [-0.12, 0.12])
      g.cube(x + dx, height + 0.94, z + 0.215, 0.1, 0.09, 0.012, black);
    g.cube(x, height + 0.78, z + 0.215, 0.14, 0.16, 0.012, black);
    for (const dx of [-0.075, 0.075])
      g.cube(x + dx, height + 0.76, z + 0.215, 0.06, 0.075, 0.012, black);
    if (mob.fuse >= 0)
      glowCube(g, x, height + 1.22 + Math.sin(time * 8) * 0.06, z, 0.12, flame);
    return;
  }
  const skeleton = mob.kind === "skeleton";
  const skin: Color =
    mob.hurt > 0 ? white : skeleton ? [0.85, 0.86, 0.76] : [0.26, 0.55, 0.25];
  const torso: Color = skeleton ? skin : [0.16, 0.46, 0.49];
  const limb = skeleton ? 0.075 : 0.12;
  for (const dx of [-0.09, 0.09])
    g.cube(
      x + dx,
      height + Math.max(0, gait * Math.sign(dx)),
      z,
      limb,
      0.35,
      limb,
      skeleton ? skin : [0.24, 0.2, 0.32],
    );
  g.cube(
    x,
    height + 0.35,
    z,
    skeleton ? 0.22 : 0.31,
    0.35,
    skeleton ? 0.13 : 0.21,
    torso,
  );
  g.cube(x, height + 0.72, z, 0.29, 0.29, 0.27, skin);
  for (const dx of [-0.075, 0.075])
    g.cube(x + dx, height + 0.87, z + 0.14, 0.065, 0.06, 0.015, black);
  if (skeleton) {
    for (const h of [0.41, 0.51, 0.61])
      g.cube(x, height + h, z + 0.07, 0.24, 0.035, 0.035, skin);
    const bx = x + mob.facing[0] * 0.36,
      bz = z + mob.facing[1] * 0.36;
    g.beam([x, height + 0.64, z], [bx, height + 0.58, bz], 0.065, skin);
    g.beam(
      [bx, height + 0.3, bz],
      [bx + 0.12, height + 0.57, bz + 0.1],
      0.055,
      [0.49, 0.28, 0.13],
    );
    g.beam(
      [bx + 0.12, height + 0.57, bz + 0.1],
      [bx, height + 0.86, bz],
      0.055,
      [0.49, 0.28, 0.13],
    );
    g.beam(
      [bx, height + 0.3, bz],
      [bx, height + 0.86, bz],
      0.015,
      [0.8, 0.8, 0.7],
    );
  } else {
    for (const dx of [-0.2, 0.2])
      g.beam(
        [x + dx, height + 0.63, z],
        [x + dx + mob.facing[0] * 0.4, height + 0.6, z + mob.facing[1] * 0.4],
        0.12,
        skin,
      );
  }
}

export function createEffectsGeometry(state: SimulationState, time: number) {
  const g = new Geometry();
  const tiles = new Map(
    state.tiles.map((tile) => [`${tile.x}:${tile.z}`, tile]),
  );
  const heightAt = (x: number, z: number) =>
    tileSurface(tiles.get(`${Math.round(x)}:${Math.round(z)}`));
  for (const tile of state.tiles) {
    if (tile.torch) {
      const flicker = 0.9 + Math.sin(time * 13 + tile.x) * 0.12;
      glowCube(
        g,
        tile.x + 0.22,
        tile.height + 0.61,
        tile.z + 0.2,
        0.16 * flicker,
        flame,
      );
      glowCube(
        g,
        tile.x + 0.22,
        tile.height + 0.73,
        tile.z + 0.2,
        0.09 * flicker,
        [1, 0.85, 0.32],
      );
    }
    if (tile.hazard === "lava") {
      for (let part = 0; part < 2; part++) {
        const phase = (time * 1.5 + tile.x * 0.7 + tile.z + part * 0.5) % 1;
        const bubble = Math.abs(phase);
        glowCube(
          g,
          tile.x + Math.sin(tile.z + part) * 0.25,
          tile.height + 0.04 + Math.sin(bubble * Math.PI) * 0.22,
          tile.z + Math.cos(tile.x + part) * 0.25,
          0.09,
          [1, 0.65, 0.09],
        );
      }
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
      );
    }
  }
  for (const mob of state.adventure.mobs)
    if (mob.health > 0)
      mobGeometry(g, mob, heightAt(mob.x, mob.z) + 0.02, time);
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
      ])
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
    .filter((event) => event.kind === "lightning" && event.age < 0.42)
    .slice(-2)) {
    const height = heightAt(event.x, event.z);
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
      );
    }
  return g.finish();
}
