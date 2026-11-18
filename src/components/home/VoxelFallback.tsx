import type { StillFace } from "./voxel-still-scene";

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
