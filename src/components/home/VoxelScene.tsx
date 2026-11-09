import {
  Blocks,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Swords,
  Scale,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/lib/i18n-react";
import { fallbackSummary, VoxelFallback } from "./VoxelFallback";
import { useReducedMotion } from "./use-reduced-motion";
import type { createVoxelRenderer } from "./voxel-renderer";
import type {
  SelectionPressure,
  SimulationSummary,
} from "./voxel-simulation-types";

const pressures = [
  { value: "balanced", label: "Balanced", icon: Scale },
  { value: "build", label: "Building", icon: Blocks },
  { value: "battle", label: "Combat", icon: Swords },
] as const;

const traits = [
  { value: "aggression", label: "Aggression" },
  { value: "building", label: "Building preference" },
  { value: "caution", label: "Caution" },
] as const;

export function VoxelScene() {
  const t = useT();
  const goalId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createVoxelRenderer>>(null);
  const [pressure, setPressure] = useState<SelectionPressure>("balanced");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 3>(1);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const [summary, setSummary] = useState<SimulationSummary>(fallbackSummary);
  const reducedMotion = useReducedMotion();
  const ready = status === "ready";
  const stopped = paused || reducedMotion !== false;

  useEffect(() => {
    let cancelled = false;
    void import("./voxel-renderer")
      .then(({ createVoxelRenderer: create }) => {
        if (cancelled || !canvasRef.current) return;
        const renderer = create(
          canvasRef.current,
          () => {
            rendererRef.current = null;
            setSummary(fallbackSummary);
            setStatus("unavailable");
          },
          setSummary,
        );
        rendererRef.current = renderer;
        setStatus(renderer ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
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
    rendererRef.current?.setPressure(pressure);
  }, [pressure, ready]);

  useEffect(() => {
    rendererRef.current?.setSpeed(speed);
  }, [speed, ready]);

  useEffect(() => {
    function movePointer(event: PointerEvent) {
      rendererRef.current?.setPointer(
        Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1)),
        Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1)),
      );
    }
    function resetPointer() {
      rendererRef.current?.setPointer(0, 0);
    }
    function leaveWindow(event: PointerEvent) {
      if (event.relatedTarget === null) resetPointer();
    }
    window.addEventListener("pointermove", movePointer);
    window.addEventListener("pointerout", leaveWindow);
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("pointerout", leaveWindow);
      window.removeEventListener("blur", resetPointer);
    };
  }, []);

  return (
    <section
      className="voxel-experience"
      aria-label={t("Evolving bot simulation")}
    >
      <div className="voxel-stage">
        {!ready && <VoxelFallback />}
        <canvas
          ref={canvasRef}
          className="voxel-canvas"
          data-ready={ready}
          aria-hidden="true"
        />
      </div>
      <div className="voxel-caption">
        <span>
          {t("Generation {generation}", { generation: summary.generation })}
        </span>
        <span>
          {t("{seconds}s left", { seconds: Math.ceil(summary.remaining) })}
        </span>
      </div>
      <div className="voxel-camps">
        <span className="voxel-team" data-team="cyan">
          {t("Cyan camp: {count}", { count: summary.alive[0] })}
        </span>
        <span className="voxel-team" data-team="amber">
          {t("Amber camp: {count}", { count: summary.alive[1] })}
        </span>
      </div>
      <dl className="voxel-metrics">
        <div>
          <dt>{t("Gathered")}</dt>
          <dd>{summary.metrics.gathered}</dd>
        </div>
        <div>
          <dt>{t("Crafted")}</dt>
          <dd>{summary.metrics.crafted}</dd>
        </div>
        <div>
          <dt>{t("Built")}</dt>
          <dd>{summary.metrics.built}</dd>
        </div>
      </dl>
      <div className="voxel-controls">
        <div className="voxel-pressure">
          <Field orientation="horizontal" className="flex-wrap">
            <FieldLabel id={goalId}>{t("Reward")}</FieldLabel>
            <ToggleGroup
              value={[pressure]}
              onValueChange={([value]) => {
                const next = pressures.find((option) => option.value === value);
                if (next) setPressure(next.value);
              }}
              variant="outline"
              size="sm"
              aria-labelledby={goalId}
              disabled={!ready}
            >
              {pressures.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value}>
                  <Icon aria-hidden="true" />
                  {t(label)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </div>
        <div className="voxel-playback">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPaused(!paused)}
              aria-label={t(
                paused ? "Play scene animation" : "Pause scene animation",
              )}
              disabled={reducedMotion !== false || !ready}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rendererRef.current?.step()}
              disabled={!ready || !stopped}
              aria-label={t("Advance simulation by one second")}
            >
              <StepForward data-icon="inline-start" />
              {t("Step")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpeed(speed === 1 ? 3 : 1)}
              aria-label={t("Simulation speed: {speed}×", { speed })}
              disabled={!ready || reducedMotion !== false}
            >
              {speed}×
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => rendererRef.current?.reset()}
            disabled={!ready}
          >
            <RotateCcw data-icon="inline-start" />
            {t("Reset")}
          </Button>
        </div>
      </div>
      <p className="voxel-note">
        {status === "unavailable"
          ? t("3D animation is unavailable. Showing a still scene.")
          : reducedMotion === true
            ? t("Reduced motion is on. Use Step to advance.")
            : t(
                "Gather, craft, build and fight. Successful bots pass on their traits.",
              )}
      </p>
      <details className="voxel-traits">
        <summary>{t("Inherited traits")}</summary>
        <div className="voxel-trait-grid">
          <span />
          <span>{t("Cyan camp")}</span>
          <span>{t("Amber camp")}</span>
          {traits.map(({ value, label }) => (
            <div className="voxel-trait-row" key={value}>
              <span>{t(label)}</span>
              <meter
                min={0}
                max={1}
                value={summary.traits[0][value]}
                aria-label={t("Cyan camp: {trait}", { trait: t(label) })}
              >
                {Math.round(summary.traits[0][value] * 100)}%
              </meter>
              <meter
                min={0}
                max={1}
                value={summary.traits[1][value]}
                aria-label={t("Amber camp: {trait}", { trait: t(label) })}
              >
                {Math.round(summary.traits[1][value] * 100)}%
              </meter>
            </div>
          ))}
        </div>
      </details>
      <p className="voxel-local">
        {t("Local simulation. No Minecraft server connection.")}
      </p>
      <p className="sr-only" role="status">
        {t("Generation {generation}. Reward: {reward}.", {
          generation: summary.generation,
          reward: t(
            pressures.find((option) => option.value === pressure)?.label ??
              "Balanced",
          ),
        })}
      </p>
    </section>
  );
}
