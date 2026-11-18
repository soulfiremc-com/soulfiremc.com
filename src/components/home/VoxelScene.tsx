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
import { useEffect, useMemo, useRef, useState } from "react";
import { useIsHydrated } from "@/components/auth/use-is-hydrated";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-react";
import { VoxelFallback } from "./VoxelFallback";
import { selectionOptions } from "./voxel-selection-options";
import { VoxelSettings } from "./VoxelSettings";
import { createStillScene, fallbackSummary } from "./voxel-still-scene";
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
  // null follows the reduced motion preference until the visitor chooses.
  const [paused, setPaused] = useState<boolean | null>(null);
  const [speed, setSpeed] = useState<1 | 3>(1);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const [liveSummary, setLiveSummary] =
    useState<SimulationSummary>(fallbackSummary);
  // Each visit starts a different world. The prerendered page cannot know the
  // seed, so the still scene appears once the page hydrates.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const hydrated = useIsHydrated();
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();
  const ready = status === "ready";
  const still = useMemo(
    () => (hydrated && !ready ? createStillScene(seed) : null),
    [hydrated, ready, seed],
  );
  const summary = ready ? liveSummary : (still?.summary ?? fallbackSummary);
  const stopped = paused ?? reducedMotion !== false;
  const playbackLabel = t(
    stopped
      ? "simulation.playSceneAnimation"
      : "simulation.pauseSceneAnimation",
  );
  const speedLabel = t("simulation.simulationSpeed", { speed });
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
            setStatus("unavailable");
          },
          setLiveSummary,
          seed,
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
  }, [seed]);

  useEffect(() => {
    rendererRef.current?.setMotion(stopped, reducedMotion !== false);
  }, [stopped, reducedMotion, ready]);

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
        {still && <VoxelFallback faces={still.faces} />}
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
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the elements and their label form one labelled image
            role="img"
            data-team="cyan"
            aria-label={t("simulation.cyanCamp", { count: summary.alive[0] })}
          >
            <FlagTriangleRight aria-hidden="true" />
            {summary.alive[0]}
          </span>
          <span
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the elements and their label form one labelled image
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
              // Pressing it disables it, so keep focus on it for keyboard users.
              focusableWhenDisabled
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
              // Pressing it disables it, so keep focus on it for keyboard users.
              focusableWhenDisabled
              aria-label={t("simulation.summonAStorm")}
              title={t("simulation.summonAStorm")}
            >
              <CloudLightning />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPaused(!stopped)}
              aria-label={playbackLabel}
              title={playbackLabel}
              disabled={!ready}
            >
              {stopped ? <Play /> : <Pause />}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => rendererRef.current?.step()}
              disabled={!ready || !stopped}
              aria-label={t("simulation.advanceSimulationByOneSecond")}
              title={t("simulation.step")}
            >
              <StepForward />
            </Button>
            <Button
              variant={speed === 3 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSpeed(speed === 1 ? 3 : 1)}
              aria-label={speedLabel}
              title={speedLabel}
              disabled={!ready}
            >
              {speed}×
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => rendererRef.current?.reset()}
              disabled={!ready}
              aria-label={t("simulation.reset")}
              title={t("simulation.reset")}
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
      {(status === "unavailable" ||
        (reducedMotion === true && paused === null)) && (
        <p className="voxel-note">
          {status === "unavailable"
            ? t("simulation.3dAnimationIsUnavailableShowingAStillScene")
            : t("simulation.reducedMotionIsOnPressPlayOrUseStep")}
        </p>
      )}
      <p className="sr-only">
        {t("simulation.localSimulationNoMinecraftServerConnection")}
      </p>
      <output className="sr-only">
        {announcement && `${announcement} `}
        {t("simulation.generationReward", {
          generation: summary.generation,
          reward: t(
            selectionOptions.find((option) => option.value === pressure)
              ?.label ?? "simulation.balanced",
          ),
        })}
      </output>
    </section>
  );
}
