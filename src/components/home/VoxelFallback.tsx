import {
  createActorGeometry,
  createTerrainGeometry,
  VERTEX_STRIDE,
} from "./voxel-geometry";
import {
  createSimulation,
  getSimulationSummary,
  INITIAL_SIMULATION_SEED,
} from "./voxel-simulation";

const state = createSimulation(INITIAL_SIMULATION_SEED);
export const fallbackSummary = getSimulationSummary(state);
const vertices = [
  ...createTerrainGeometry(state),
  ...createActorGeometry(state, new Map(), 0, new Set()),
];
const faces: { id: string; points: string; depth: number; color: string }[] =
  [];
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

export function VoxelFallback() {
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
