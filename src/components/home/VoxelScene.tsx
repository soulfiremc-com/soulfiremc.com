import {
  Bomb,
  CloudLightning,
  Moon,
  Sun,
  FlagTriangleRight,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-react";
import { fallbackSummary, VoxelFallback } from "./VoxelFallback";
import { selectionOptions, VoxelSettings } from "./VoxelSettings";
import { useReducedMotion } from "./use-reduced-motion";
import type { createVoxelRenderer } from "./voxel-renderer";
import type {
  SelectionPressure,
  SimulationSummary,
} from "./voxel-simulation-types";

export function VoxelScene() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createVoxelRenderer>>(null);
  const [pressure, setPressure] = useState<SelectionPressure>("balanced");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 3>(1);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const [summary, setSummary] = useState<SimulationSummary>(fallbackSummary);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();
  const ready = status === "ready";
  const stopped = paused || reducedMotion !== false;
  const WeatherIcon = summary.storm
    ? CloudLightning
    : summary.night > 0.4
      ? Moon
      : Sun;
  const weatherLabel = t(
    summary.storm
      ? "simulation.storm"
      : summary.night > 0.4
        ? "simulation.night"
        : "simulation.day",
  );

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
      aria-label={t("simulation.evolvingBotSimulation")}
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
        <span>{t("simulation.gen", { generation: summary.generation })}</span>
        <div className="voxel-scores">
          <span
            role="img"
            data-team="cyan"
            aria-label={t("simulation.cyanCamp", { count: summary.alive[0] })}
          >
            <FlagTriangleRight aria-hidden="true" />
            {summary.alive[0]}
          </span>
          <span
            role="img"
            data-team="amber"
            aria-label={t("simulation.amberCamp", { count: summary.alive[1] })}
          >
            <FlagTriangleRight aria-hidden="true" />
            {summary.alive[1]}
          </span>
        </div>
        <span className="voxel-weather" title={weatherLabel}>
          <WeatherIcon aria-hidden="true" />
          <span className="sr-only">{weatherLabel}: </span>
          {t("simulation.sLeft", { seconds: Math.ceil(summary.remaining) })}
        </span>
      </div>
      <div className="voxel-controls">
        <div className="voxel-playback">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (rendererRef.current?.breach())
                  setAnnouncement(t("simulation.tntArmed"));
              }}
              disabled={!ready || !summary.canBreach}
              aria-label={t("simulation.triggerATntBreach")}
            >
              <Bomb data-icon="inline-start" />
              TNT
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (rendererRef.current?.storm())
                  setAnnouncement(t("simulation.stormIncoming"));
              }}
              disabled={!ready || !summary.canStorm}
              aria-label={t("simulation.summonAStorm")}
              title={t("simulation.summonAStorm")}
            >
              <CloudLightning />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPaused(!paused)}
              aria-label={t(
                paused
                  ? "simulation.playSceneAnimation"
                  : "simulation.pauseSceneAnimation",
              )}
              disabled={reducedMotion !== false || !ready}
            >
              {paused ? <Play /> : <Pause />}
            </Button>
            {stopped && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => rendererRef.current?.step()}
                disabled={!ready}
                aria-label={t("simulation.advanceSimulationByOneSecond")}
                title={t("simulation.step")}
              >
                <StepForward />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpeed(speed === 1 ? 3 : 1)}
              aria-label={t("simulation.simulationSpeed", { speed })}
              disabled={!ready || reducedMotion !== false}
            >
              {speed}×
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => rendererRef.current?.reset()}
              disabled={!ready}
              aria-label={t("simulation.reset")}
            >
              <RotateCcw />
            </Button>
          </div>
          <VoxelSettings
            pressure={pressure}
            onPressureChange={setPressure}
            summary={summary}
            disabled={!ready}
          />
        </div>
      </div>
      {(status === "unavailable" || reducedMotion === true) && (
        <p className="voxel-note">
          {status === "unavailable"
            ? t("simulation.3dAnimationIsUnavailableShowingAStillScene")
            : t("simulation.reducedMotionIsOnUseStepToAdvance")}
        </p>
      )}
      <p className="sr-only">
        {t("simulation.localSimulationNoMinecraftServerConnection")}
      </p>
      <p className="sr-only" role="status">
        {announcement}
        {t("simulation.generationReward", {
          generation: summary.generation,
          reward: t(
            selectionOptions.find((option) => option.value === pressure)
              ?.label ?? "simulation.balanced",
          ),
        })}
      </p>
    </section>
  );
}
