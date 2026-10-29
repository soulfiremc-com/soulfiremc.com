import { Grid2X2, Pause, Play, ScatterChart, Circle } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  botIds,
  getFormation,
  terrain,
  terrainHeight,
  type Formation,
} from "./voxel-world";
import type { createVoxelRenderer } from "./voxel-renderer";

const formations = [
  { value: "scatter", label: "Scatter", icon: ScatterChart },
  { value: "circle", label: "Circle", icon: Circle },
  { value: "grid", label: "Grid", icon: Grid2X2 },
] as const;

function project(x: number, y: number, z: number) {
  return `${300 + (x - z) * 20},${280 + (x + z) * 11 - y * 24}`;
}

const sortedTerrain = [...terrain].sort((a, b) => a.x + a.z - b.x - b.z);

function VoxelFallback({ formation }: { formation: Formation }) {
  const positions = getFormation(formation);
  return (
    <svg viewBox="0 0 600 500" className="voxel-fallback" aria-hidden="true">
      {sortedTerrain.map(({ id, x, z, height: h }) => (
        <g key={id} stroke="var(--voxel-line)" strokeWidth="0.6">
          <polygon
            fill="var(--voxel-front)"
            points={`${project(x - 0.5, h, z + 0.5)} ${project(x + 0.5, h, z + 0.5)} ${project(x + 0.5, -0.7, z + 0.5)} ${project(x - 0.5, -0.7, z + 0.5)}`}
          />
          <polygon
            fill="var(--voxel-side)"
            points={`${project(x + 0.5, h, z - 0.5)} ${project(x + 0.5, h, z + 0.5)} ${project(x + 0.5, -0.7, z + 0.5)} ${project(x + 0.5, -0.7, z - 0.5)}`}
          />
          <polygon
            fill="var(--voxel-top)"
            points={`${project(x - 0.5, h, z - 0.5)} ${project(x + 0.5, h, z - 0.5)} ${project(x + 0.5, h, z + 0.5)} ${project(x - 0.5, h, z + 0.5)}`}
          />
        </g>
      ))}
      {botIds.map((botId) => {
        const [x, z] = positions[botId - 1];
        return (
          <rect
            key={botId}
            x={300 + (x - z) * 20 - 3}
            y={
              280 +
              (x + z) * 11 -
              (terrainHeight(Math.round(x), Math.round(z)) + 0.68) * 24
            }
            width="6"
            height="13"
            fill="var(--voxel-bot)"
          />
        );
      })}
    </svg>
  );
}

export function VoxelScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createVoxelRenderer>>(null);
  const [formation, setFormation] = useState<Formation>("scatter");
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void import("./voxel-renderer")
      .then(({ createVoxelRenderer: create }) => {
        if (cancelled || !canvasRef.current) return;
        const renderer = create(canvasRef.current, () => {
          rendererRef.current?.destroy();
          rendererRef.current = null;
          setReady(false);
        });
        rendererRef.current = renderer;
        // Start still until the user's motion preference is applied.
        renderer?.setMotion(true, true);
        setReady(Boolean(renderer));
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setMotion(paused, reducedMotion !== false);
  }, [paused, reducedMotion, ready]);

  useEffect(() => {
    rendererRef.current?.setFormation(formation);
  }, [formation, ready]);

  return (
    <div className="voxel-experience">
      <div
        className="voxel-stage"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          rendererRef.current?.setPointer(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
          );
        }}
        onPointerLeave={() => rendererRef.current?.setPointer(0, 0)}
      >
        <div className="voxel-orbit" aria-hidden="true" />
        {!ready && <VoxelFallback formation={formation} />}
        <canvas
          ref={canvasRef}
          className="voxel-canvas"
          data-ready={ready}
          aria-hidden="true"
        />
      </div>
      <div className="voxel-caption">
        <span>36 bots</span>
        <span className="home-mono">Interactive preview</span>
      </div>
      <div className="voxel-controls">
        <ToggleGroup
          type="single"
          value={formation}
          onValueChange={(value) => {
            if (value) setFormation(value as Formation);
          }}
          variant="outline"
          size="sm"
          aria-label="Bot formation"
        >
          {formations.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={`${label} formation`}
            >
              <Icon aria-hidden="true" />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Play scene animation" : "Pause scene animation"}
          aria-pressed={paused}
          disabled={reducedMotion === true || !ready}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>
      <p className="sr-only" role="status">
        Preview: 36 bots in {formation} formation. This illustration does not
        connect to a server.
      </p>
    </div>
  );
}
