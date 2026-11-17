import {
  createActorGeometry,
  createTerrainGeometry,
  VERTEX_STRIDE,
} from "./voxel-geometry";
import { createEffectsGeometry } from "./voxel-effects-geometry";
import { createFloraGeometry } from "./voxel-flora-geometry";
import {
  createSimulation,
  getSimulationSummary,
  INITIAL_SIMULATION_SEED,
} from "./voxel-simulation";

interface StillFace {
  id: string;
  points: string;
  depth: number;
  color: string;
}

/**
 * The caption values before the page hydrates. They are the same for every
 * seed at the start of a round, apart from the camp traits.
 */
export const fallbackSummary = getSimulationSummary(
  createSimulation(INITIAL_SIMULATION_SEED),
);

/**
 * Builds the still scene for a seed: the first frame of the world that the
 * live renderer starts with the same seed.
 */
export function createStillScene(seed: number) {
  const state = createSimulation(seed);
  // The still scene keeps solid faces only and skips the grass to stay small.
  const vertices = [
    createTerrainGeometry(state),
    createFloraGeometry(state, undefined, false),
    createActorGeometry(state, new Map(), 0),
    createEffectsGeometry(state, 0),
  ].flatMap((mesh) => [
    ...mesh.vertices.subarray(0, mesh.opaque * VERTEX_STRIDE),
  ]);
  const faces: StillFace[] = [];
  for (let offset = 0; offset < vertices.length; offset += VERTEX_STRIDE * 6) {
    const corners = [0, 1, 2, 5].map((index) => {
      const start = offset + index * VERTEX_STRIDE;
      return vertices.slice(start, start + 3);
    });
    const points = corners
      .map(
        ([x, y, z]) =>
          `${Math.round((300 + (x - z) * 19.5) * 10) / 10},${Math.round((270 + (x + z) * 10.7 - y * 23) * 10) / 10}`,
      )
      .join(" ");
    faces.push({
      id: corners.flat().join(":"),
      points,
      depth: corners.reduce((sum, [x, y, z]) => sum + x + y + z, 0),
      color: `rgb(${vertices
        .slice(offset + 3, offset + 6)
        .map((value) => Math.round(value * 255))
        .join(" ")})`,
    });
  }
  faces.sort((a, b) => a.depth - b.depth);
  return { summary: getSimulationSummary(state), faces };
}

export function VoxelFallback({ faces }: { faces: readonly StillFace[] }) {
  return (
    <svg viewBox="0 0 600 500" className="voxel-fallback" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="0.3" strokeLinejoin="round">
        {faces.map((face) => (
          <polygon key={face.id} points={face.points} fill={face.color} />
        ))}
      </g>
    </svg>
  );
}
