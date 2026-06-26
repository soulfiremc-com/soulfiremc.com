import { SiGithub } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppWindow,
  ArrowRight,
  Blocks,
  Box,
  Brain,
  Bug,
  CloudDownload,
  Download,
  MousePointerClick,
  Rocket,
  TerminalIcon,
  Workflow,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  type ComponentType,
  type ReactElement,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  BreadcrumbList,
  FAQPage,
  SoftwareApplication,
  WithContext,
} from "schema-dts";
import { EnderDashSponsor } from "@/components/enderdash-sponsor";
import { JsonLd } from "@/components/json-ld";
import { SiteShell } from "@/components/site-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";
import { Meteors } from "@/components/ui/meteors";
import { RetroGrid } from "@/components/ui/retro-grid";
import { Ripple } from "@/components/ui/ripple";
import { getRequiredEnv } from "@/lib/env";
import {
  createStructuredDataGraph,
  createWebPageStructuredData,
  getCanonicalLinks,
  getPageMeta,
  jsonLdScript,
  siteDescription,
} from "@/lib/seo";
import { cn } from "@/lib/utils";

type ShaderModule = typeof import("@paper-design/shaders-react");

let cachedShaderModule: ShaderModule | null = null;

function useShaderModule() {
  const [shaderModule, setShaderModule] = useState<ShaderModule | null>(
    cachedShaderModule,
  );

  useEffect(() => {
    if (cachedShaderModule) {
      return;
    }

    let cancelled = false;

    void import("@paper-design/shaders-react").then((module) => {
      cachedShaderModule = module;
      if (!cancelled) {
        setShaderModule(module);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return shaderModule;
}

// Intersection observer for visibility detection
let observer: IntersectionObserver;

const observerTargets = new WeakMap<
  Element,
  (entry: IntersectionObserverEntry) => void
>();

function useIsVisible(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        observerTargets.get(entry.target)?.(entry);
      }
    });

    const element = ref.current;
    if (!element) return;
    observerTargets.set(element, (entry) => {
      setVisible(entry.isIntersecting);
    });
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observerTargets.delete(element);
    };
  }, [ref]);

  return visible;
}

function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useIsVisible(ref);
  const shaderModule = useShaderModule();
  const GrainGradient = shaderModule?.GrainGradient as
    | ComponentType<Record<string, unknown>>
    | undefined;
  const Dithering = shaderModule?.Dithering as
    | ComponentType<Record<string, unknown>>
    | undefined;

  if (!GrainGradient || !Dithering) {
    return (
      <div ref={ref} className="absolute inset-0 overflow-hidden rounded-2xl" />
    );
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden rounded-2xl">
      <GrainGradient
        className="absolute inset-0 animate-in fade-in duration-800"
        colors={
          resolvedTheme === "dark"
            ? ["#0ea5e9", "#0066cc", "#1a0a3e00"] // Cyan to deep blue (dark mode)
            : ["#38bdf8", "#60a5fa", "#1e40af20"] // Light blues (light mode)
        }
        colorBack="#00000000"
        softness={1}
        intensity={0.9}
        noise={0.5}
        speed={visible ? 0.8 : 0}
        shape="corners"
        minPixelRatio={1}
        maxPixelCount={1920 * 1080}
      />
      <Dithering
        width={720}
        height={720}
        colorBack="#00000000"
        colorFront={resolvedTheme === "dark" ? "#0ea5e9" : "#3b82f6"}
        shape="sphere"
        type="4x4"
        scale={0.5}
        size={3}
        speed={0}
        frame={5000 * 120}
        className="absolute animate-in fade-in duration-400 max-lg:bottom-[-50%] max-lg:left-[-200px] lg:top-[-5%] lg:right-0"
        minPixelRatio={1}
      />
    </div>
  );
}

function TerminalAnimation() {
  const tickTime = 100;

  // Animation timeline
  const commands = [
    {
      type: "command",
      text: "java -jar SoulFireCLI.jar --address mc.server.com --amount 100 --start",
    },
    { type: "output", text: "◇ Connecting to mc.server.com:25565" },
    { type: "output", text: "│ Connected!" },
    { type: "output", text: "◇ Starting 100 bots..." },
    { type: "output", text: "│ Bot_1 joined the server" },
    { type: "output", text: "│ Bot_2 joined the server" },
    { type: "output", text: "│ ..." },
    { type: "output", text: "│ Bot_100 joined the server" },
    { type: "prompt", text: "" },
    { type: "command", text: "online" },
    { type: "output", text: "│ 100 bots connected" },
    { type: "prompt", text: "" },
    { type: "command", text: "move 578 65 100" },
    { type: "output", text: "◆ Moving all bots to coordinates..." },
  ];

  // Calculate timing for each step
  const getTicksForStep = (index: number): number => {
    let ticks = 0;
    for (let i = 0; i <= index; i++) {
      const item = commands[i];
      if (item.type === "command") {
        ticks += item.text.length + 3; // typing + pause
      } else if (item.type === "output") {
        ticks += 2; // quick display
      } else if (item.type === "prompt") {
        ticks += 5; // pause before next command
      }
    }
    return ticks;
  };

  const totalTicks = getTicksForStep(commands.length - 1) + 30; // Add pause at end

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= totalTicks ? 0 : prev + 1));
    }, tickTime);

    return () => clearInterval(timer);
  }, [totalTicks]);

  // Build visible lines based on current tick
  const lines: ReactElement[] = [];
  let currentTick = 0;

  for (let i = 0; i < commands.length; i++) {
    const item = commands[i];

    if (item.type === "command") {
      const startTick = currentTick;
      const typingEndTick = startTick + item.text.length;

      if (tick >= startTick) {
        const charsToShow = Math.min(tick - startTick, item.text.length);
        const showCursor = tick < typingEndTick;

        lines.push(
          <span key={`cmd-${i}`} className="flex">
            <span className="text-emerald-400 mr-2">{">"}</span>
            <span>
              {item.text.substring(0, charsToShow)}
              {showCursor && (
                <span className="inline-block w-2 h-4 bg-white animate-pulse ml-0.5" />
              )}
            </span>
          </span>,
        );
      }

      currentTick = typingEndTick + 3;
    } else if (item.type === "output") {
      if (tick >= currentTick) {
        lines.push(
          <span
            key={`out-${i}`}
            className={cn(
              "text-muted-foreground",
              item.text.startsWith("◆") && "text-cyan-400 font-medium",
              item.text.startsWith("◇") && "text-blue-400",
            )}
          >
            {item.text}
          </span>,
        );
      }
      currentTick += 2;
    } else if (item.type === "prompt") {
      currentTick += 5;
    }
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <pre className="overflow-hidden rounded-xl border text-sm shadow-lg bg-card">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2 bg-muted/50">
          <TerminalIcon className="size-4" />
          <span className="font-medium">SoulFire CLI</span>
          <div className="grow" />
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
        </div>
        <div className="h-[320px] p-4 font-mono text-xs sm:text-sm">
          <code className="grid gap-1">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

// ---- Editor-style scripting animation data ----

const ED_H = 26;
// header height
const ED_R = 20;
// port row height
const ED_P = 4;
// bottom padding

type SPort = { name: string; type: "exec" | "data" };

type SRow = { left?: SPort; right?: SPort; inputValue?: string };

type SNode = {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  rows: SRow[];
};

function sHeight(n: SNode) {
  return ED_H + n.rows.length * ED_R + ED_P;
}

function sPortXY(nodeId: string, portName: string, side: "left" | "right") {
  const n = sNodes.find((candidate) => candidate.id === nodeId);
  if (!n) {
    return { x: 0, y: 0 };
  }
  const ri = n.rows.findIndex(
    (r) => r.left?.name === portName || r.right?.name === portName,
  );
  return {
    x: side === "left" ? n.x : n.x + n.w,
    y: n.y + ED_H + (ri >= 0 ? ri : 0) * ED_R + ED_R / 2,
  };
}

function sBezier(x1: number, y1: number, x2: number, y2: number) {
  const cp = x2 >= x1 ? Math.max((x2 - x1) * 0.45, 25) : 40;
  return `M${x1},${y1} C${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
}

const sNodes: SNode[] = [
  {
    id: "trigger",
    label: "On Chat",
    color: "#f97316",
    x: 15,
    y: 40,
    w: 148,
    rows: [
      { right: { name: "Out", type: "exec" } },
      { right: { name: "Bot", type: "data" } },
      { right: { name: "Message", type: "data" } },
    ],
  },
  {
    id: "contains",
    label: "Contains?",
    color: "#3b82f6",
    x: 215,
    y: 30,
    w: 160,
    rows: [
      {
        left: { name: "In", type: "exec" },
        right: { name: "Out", type: "exec" },
      },
      {
        left: { name: "String", type: "data" },
        right: { name: "Result", type: "data" },
      },
      { left: { name: "Search", type: "data" }, inputValue: '"hello"' },
    ],
  },
  {
    id: "branch",
    label: "Branch",
    color: "#8b5cf6",
    x: 430,
    y: 20,
    w: 120,
    rows: [
      { left: { name: "In", type: "exec" } },
      {
        left: { name: "Cond", type: "data" },
        right: { name: "True", type: "exec" },
      },
      { right: { name: "False", type: "exec" } },
    ],
  },
  {
    id: "sendChat",
    label: "Send Chat",
    color: "#22c55e",
    x: 610,
    y: 5,
    w: 160,
    rows: [
      {
        left: { name: "In", type: "exec" },
        right: { name: "Out", type: "exec" },
      },
      { left: { name: "Bot", type: "data" } },
      { left: { name: "Msg", type: "data" }, inputValue: '"Welcome!"' },
    ],
  },
  {
    id: "aiChat",
    label: "AI Reply",
    color: "#06b6d4",
    x: 530,
    y: 150,
    w: 160,
    rows: [
      {
        left: { name: "In", type: "exec" },
        right: { name: "Out", type: "exec" },
      },
      { left: { name: "Prompt", type: "data" }, inputValue: '"Be friendly"' },
      { right: { name: "Reply", type: "data" } },
    ],
  },
];

type SEdge = {
  id: string;
  from: string;
  fp: string;
  fs: "left" | "right";
  to: string;
  tp: string;
  ts: "left" | "right";
  type: "exec" | "data";
};

const sEdges: SEdge[] = [
  {
    id: "e1",
    from: "trigger",
    fp: "Out",
    fs: "right",
    to: "contains",
    tp: "In",
    ts: "left",
    type: "exec",
  },
  {
    id: "e2",
    from: "trigger",
    fp: "Message",
    fs: "right",
    to: "contains",
    tp: "String",
    ts: "left",
    type: "data",
  },
  {
    id: "e3",
    from: "contains",
    fp: "Out",
    fs: "right",
    to: "branch",
    tp: "In",
    ts: "left",
    type: "exec",
  },
  {
    id: "e4",
    from: "contains",
    fp: "Result",
    fs: "right",
    to: "branch",
    tp: "Cond",
    ts: "left",
    type: "data",
  },
  {
    id: "e5",
    from: "branch",
    fp: "True",
    fs: "right",
    to: "sendChat",
    tp: "In",
    ts: "left",
    type: "exec",
  },
  {
    id: "e6",
    from: "branch",
    fp: "False",
    fs: "right",
    to: "aiChat",
    tp: "In",
    ts: "left",
    type: "exec",
  },
];

const sEdgePaths = sEdges.map((e) => {
  const f = sPortXY(e.from, e.fp, e.fs);
  const t = sPortXY(e.to, e.tp, e.ts);
  return { ...e, d: sBezier(f.x, f.y, t.x, t.y) };
});

const sPhases = [
  { nodes: ["trigger"], edges: [] as string[], ticks: 8 },
  { nodes: ["contains"], edges: ["e1", "e2"], ticks: 8 },
  { nodes: ["branch"], edges: ["e3", "e4"], ticks: 8 },
  { nodes: ["sendChat"], edges: ["e5"], ticks: 8 },
  { nodes: [] as string[], edges: [] as string[], ticks: 12 },
  { nodes: ["trigger"], edges: [] as string[], ticks: 8 },
  { nodes: ["contains"], edges: ["e1", "e2"], ticks: 8 },
  { nodes: ["branch"], edges: ["e3", "e4"], ticks: 8 },
  { nodes: ["aiChat"], edges: ["e6"], ticks: 8 },
  { nodes: [] as string[], edges: [] as string[], ticks: 12 },
];

const sTotalTicks = sPhases.reduce((s, p) => s + p.ticks, 0);

const sLogs = [
  {
    phase: 0,
    text: '\u25B6 On Chat - Bot_1 received "hello world"',
    color: "text-orange-400",
  },
  {
    phase: 1,
    text: '\u2713 Contains? - "hello" found',
    color: "text-blue-400",
  },
  {
    phase: 2,
    text: "\u21B3 Branch - condition: true",
    color: "text-purple-400",
  },
  {
    phase: 3,
    text: '\u2713 Send Chat - "Welcome!" sent',
    color: "text-green-400",
  },
  {
    phase: 5,
    text: '\u25B6 On Chat - Bot_3 received "how are you?"',
    color: "text-orange-400",
  },
  { phase: 6, text: "\u2713 Contains? - no match", color: "text-blue-400" },
  {
    phase: 7,
    text: "\u21B3 Branch - condition: false",
    color: "text-purple-400",
  },
  {
    phase: 8,
    text: "\u2713 AI Reply - generating response\u2026",
    color: "text-cyan-400",
  },
];

function ScriptingAnimation() {
  const tickTime = 120;
  const [tick, setTick] = useState(0);
  const svgIdPrefix = useId().replaceAll(":", "");
  const glowId = `${svgIdPrefix}-sf-glow`;
  const dotsId = `${svgIdPrefix}-sf-dots`;

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev + 1) % sTotalTicks);
    }, tickTime);
    return () => clearInterval(timer);
  }, []);

  let phaseIndex = 0;
  let remaining = tick;
  for (let i = 0; i < sPhases.length; i++) {
    if (remaining < sPhases[i].ticks) {
      phaseIndex = i;
      break;
    }
    remaining -= sPhases[i].ticks;
  }

  const activeNodes = new Set(sPhases[phaseIndex].nodes);
  const activeEdges = new Set(sPhases[phaseIndex].edges);
  const isPathB = phaseIndex >= 5;

  const visibleLogs = sLogs.filter((log) =>
    isPathB
      ? log.phase >= 5 && log.phase <= phaseIndex
      : log.phase < 5 && log.phase <= phaseIndex,
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="overflow-hidden rounded-xl shadow-lg bg-[#1a1a2e] border border-white/[0.08]">
        {/* Header bar */}
        <div className="flex flex-row items-center gap-2 px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
          <Workflow className="size-4 text-white/60" />
          <span className="font-medium text-sm text-white/90">
            SoulFire Script Editor
          </span>
          <span className="text-xs text-white/40 ml-1 hidden sm:inline">
            auto_reply.sf
          </span>
          <div className="grow" />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-xs font-medium">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            Running
          </div>
          <div className="flex gap-1.5 ml-2">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
          </div>
        </div>

        {/* Node graph canvas - always dark like real editor */}
        <svg
          viewBox="0 0 790 250"
          className="w-full h-auto"
          style={{ minHeight: "180px", background: "#1e1e2e" }}
        >
          <title>SoulFire script execution graph</title>
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern
              id={dotsId}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="0.6" fill="#fff" opacity="0.06" />
            </pattern>
          </defs>

          <rect width="790" height="250" fill={`url(#${dotsId})`} />

          {/* Edges (bezier curves) */}
          {sEdgePaths.map((e) => {
            const active = activeEdges.has(e.id);
            return (
              <path
                key={e.id}
                d={e.d}
                fill="none"
                stroke={
                  active
                    ? e.type === "exec"
                      ? "#d0d0d0"
                      : "#fbbf24"
                    : e.type === "exec"
                      ? "#555"
                      : "#92400e"
                }
                strokeWidth={active ? 2.5 : 1.5}
                opacity={active ? 1 : 0.5}
                style={{
                  transition: "stroke 0.25s, stroke-width 0.25s, opacity 0.25s",
                }}
              />
            );
          })}

          {/* Nodes */}
          {sNodes.map((node) => {
            const h = sHeight(node);
            const active = activeNodes.has(node.id);
            return (
              <g key={node.id}>
                {/* Glow */}
                {active && (
                  <rect
                    x={node.x - 3}
                    y={node.y - 3}
                    width={node.w + 6}
                    height={h + 6}
                    rx="9"
                    fill={node.color}
                    opacity="0.12"
                    filter={`url(#${glowId})`}
                  />
                )}

                {/* Node body */}
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={h}
                  rx="6"
                  fill="#2a2a3a"
                  stroke={active ? node.color : "#3a3a4a"}
                  strokeWidth={active ? 1.5 : 0.5}
                  style={{ transition: "stroke 0.25s" }}
                />

                {/* Header accent bar */}
                <rect
                  x={node.x + 0.5}
                  y={node.y + 5}
                  width="2.5"
                  height={ED_H - 10}
                  rx="1.5"
                  fill={node.color}
                  opacity="0.8"
                />

                {/* Chevron */}
                <path
                  d={`M${node.x + 11},${node.y + ED_H / 2 - 3} L${node.x + 15},${node.y + ED_H / 2} L${node.x + 11},${node.y + ED_H / 2 + 3}`}
                  fill="none"
                  stroke="#777"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Node name */}
                <text
                  x={node.x + 22}
                  y={node.y + ED_H / 2 + 4}
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#e0e0e0"
                >
                  {node.label}
                </text>

                {/* Divider line */}
                <line
                  x1={node.x + 1}
                  y1={node.y + ED_H}
                  x2={node.x + node.w - 1}
                  y2={node.y + ED_H}
                  stroke="#3a3a4a"
                  strokeWidth="0.5"
                />

                {/* Port rows */}
                {node.rows.map((row, ri) => {
                  const cy = node.y + ED_H + ri * ED_R + ED_R / 2;
                  const rowKey = `${node.id}-${row.left?.name ?? "none"}-${row.right?.name ?? "none"}-${row.inputValue ?? "none"}`;
                  return (
                    <g key={rowKey}>
                      {/* Left port */}
                      {row.left && (
                        <>
                          {row.left.type === "exec" ? (
                            <rect
                              x={node.x - 3}
                              y={cy - 3}
                              width={6}
                              height={6}
                              rx="1"
                              fill={active ? "#e0e0e0" : "#777"}
                              style={{ transition: "fill 0.25s" }}
                            />
                          ) : (
                            <circle
                              cx={node.x}
                              cy={cy}
                              r="3.5"
                              fill={active ? "#fbbf24" : "#d97706"}
                              style={{ transition: "fill 0.25s" }}
                            />
                          )}
                          <text
                            x={node.x + 9}
                            y={cy + 3.5}
                            fontSize="9"
                            fill="#999"
                          >
                            {row.left.name}
                          </text>
                        </>
                      )}

                      {/* Right port */}
                      {row.right && (
                        <>
                          <text
                            x={node.x + node.w - 9}
                            y={cy + 3.5}
                            fontSize="9"
                            fill="#999"
                            textAnchor="end"
                          >
                            {row.right.name}
                          </text>
                          {row.right.type === "exec" ? (
                            <rect
                              x={node.x + node.w - 3}
                              y={cy - 3}
                              width={6}
                              height={6}
                              rx="1"
                              fill={active ? "#e0e0e0" : "#777"}
                              style={{ transition: "fill 0.25s" }}
                            />
                          ) : (
                            <circle
                              cx={node.x + node.w}
                              cy={cy}
                              r="3.5"
                              fill={active ? "#fbbf24" : "#d97706"}
                              style={{ transition: "fill 0.25s" }}
                            />
                          )}
                        </>
                      )}

                      {/* Input field */}
                      {row.inputValue != null &&
                        (() => {
                          const lw = row.left
                            ? row.left.name.length * 6 + 14
                            : 6;
                          const rp = row.right ? 35 : 8;
                          const fx = node.x + lw;
                          const fw = node.w - lw - rp;
                          return (
                            <>
                              <rect
                                x={fx}
                                y={cy - 7}
                                width={fw}
                                height={14}
                                rx="2"
                                fill="#1e1e2e"
                                stroke="#3a3a4a"
                                strokeWidth="0.5"
                              />
                              <text
                                x={fx + 4}
                                y={cy + 3}
                                fontSize="8.5"
                                fontFamily="monospace"
                                fill="#e0c070"
                              >
                                {row.inputValue}
                              </text>
                            </>
                          );
                        })()}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Execution log panel */}
        <div className="px-4 py-2 font-mono text-xs h-[104px] overflow-hidden bg-[#222232] border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-white/40">
              Execution Log
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {visibleLogs.map((log) => (
              <div key={log.phase} className={cn("truncate", log.color)}>
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeFaq({
  items,
}: {
  items: { question: string; answer: React.ReactNode }[];
}) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={item.question} value={`faq-${i}`}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const plugins = [
  "Kill Aura",
  "Auto Eat",
  "Auto Armor",
  "Auto Totem",
  "Anti AFK",
  "Auto Reconnect",
  "AI Chat Bot",
  "Auto Register",
];

const versions = [
  "Release (1.0.0 - latest)",
  "Beta (b1.0 - b1.8.1)",
  "Alpha (a1.0.15 - a1.2.6)",
  "Classic (c0.0.15 - c0.30 including CPE)",
  "April Fools (3D Shareware, 20w14infinite, 25w14craftmine)",
  "Combat Snapshots (Combat Test 8c)",
  "Bedrock Edition 1.21.130 (Some features are missing)",
];

const features = [
  {
    Icon: Rocket,
    name: "Easy to use",
    description:
      "Native installers for Windows, macOS, and Linux. No Java required. Just download, install, and start botting.",
    href: "/docs/start-here",
    cta: "Install now",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Ripple
        className="absolute -top-20 -right-20"
        mainCircleSize={180}
        mainCircleOpacity={0.1}
        numCircles={5}
      />
    ),
  },
  {
    Icon: Zap,
    name: "High performance",
    description:
      "Built on Fabric with official Minecraft client code. Bots use real physics and real networking. Servers can't tell them apart from real players.",
    href: "/docs",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: (
      <AnimatedGridPattern
        numSquares={20}
        maxOpacity={0.08}
        duration={4}
        className="[mask-image:radial-gradient(600px_circle_at_100%_0%,white,transparent)]"
      />
    ),
  },
  {
    Icon: CloudDownload,
    name: "Bring your own accounts",
    description:
      "Import Microsoft Java, Microsoft Bedrock, or Offline accounts. Supports device code auth, credentials, and auto-generated offline names.",
    href: "/docs/how-to/import-accounts",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: <Meteors number={80} />,
  },
  {
    Icon: SiGithub,
    name: "Open Source",
    description:
      "Fully open source under AGPL-3.0. Contribute features, report bugs, or fork it for your own projects. Community-driven development.",
    href: getRequiredEnv(import.meta.env.VITE_GITHUB_LINK, "VITE_GITHUB_LINK"),
    cta: "View on GitHub",
    className: "col-span-3 lg:col-span-1",
    background: (
      <DotPattern
        width={24}
        height={24}
        cr={1.5}
        className="[mask-image:radial-gradient(500px_circle_at_0%_0%,white,transparent)]"
      />
    ),
  },
  {
    Icon: Box,
    name: "Every version supported",
    description:
      "Connect to any Minecraft version ever released: Classic, Alpha, Beta, up to the latest release, including Bedrock Edition and April Fools snapshots.",
    href: "/docs/reference/versions",
    cta: "See all versions",
    className: "col-span-3 lg:col-span-1",
    background: (
      <Marquee pauseOnHover duration={20} gap={12} className="absolute top-8">
        {versions.map((version) => (
          <div
            key={version}
            className="rounded-lg border bg-muted/50 px-3 py-2 text-xs font-medium"
          >
            {version}
          </div>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: AppWindow,
    name: "Plugin system",
    description:
      "15+ built-in plugins including Kill Aura, Auto Eat, Auto Armor, AI Chat Bot, and more. Build your own Fabric-based plugin when scripting is not enough and you need direct API, protocol, or Mixin access.",
    href: "/docs/development",
    cta: "Build advanced plugins",
    className: "col-span-3 lg:col-span-2",
    background: (
      <Marquee pauseOnHover duration={20} gap={12} className="absolute top-8">
        {plugins.map((plugin) => (
          <div
            key={plugin}
            className="rounded-lg border bg-muted/50 px-3 py-2 text-xs font-medium"
          >
            {plugin}
          </div>
        ))}
      </Marquee>
    ),
  },
];

const githubLink = getRequiredEnv(
  import.meta.env.VITE_GITHUB_LINK,
  "VITE_GITHUB_LINK",
);

const faqItems: {
  question: string;
  answerHtml: string;
  answerElement: React.ReactNode;
}[] = [
  {
    question: "What is SoulFire?",
    answerHtml:
      "SoulFire is a Minecraft bot framework built on Fabric that runs real client code. Bots use actual Minecraft physics, networking, and protocol handling, so servers can't tell them apart from real players. It's built for stress testing servers, automating tasks, and development. <a href=\"https://soulfiremc.com/docs\">Read the docs</a> to learn more.",
    answerElement: (
      <>
        SoulFire is a Minecraft bot framework built on Fabric that runs real
        client code. Bots use actual Minecraft physics, networking, and protocol
        handling, so servers can't tell them apart from real players. It's built
        for stress testing servers, automating tasks, and development.{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "" }}
          className="underline text-primary"
        >
          Read the docs
        </Link>{" "}
        to learn more.
      </>
    ),
  },
  {
    question: "Is SoulFire free?",
    answerHtml: `Yes. SoulFire is fully open source under the AGPL-3.0 license. You can <a href="https://soulfiremc.com/download">download it</a>, use it, modify it, and contribute back to the project at no cost. Check out the <a href="${githubLink}">GitHub repository</a>.`,
    answerElement: (
      <>
        Yes. SoulFire is fully open source under the AGPL-3.0 license. You can{" "}
        <Link to="/download" className="underline text-primary">
          download it
        </Link>
        , use it, modify it, and contribute back to the project at no cost.
        Check out the{" "}
        <a
          href={githubLink}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-primary"
        >
          GitHub repository
        </a>
        .
      </>
    ),
  },
  {
    question: "What Minecraft versions does SoulFire support?",
    answerHtml:
      'Every version ever released, from Classic and Alpha through the latest release, including Beta, Combat Snapshots, April Fools editions, and Bedrock Edition. Version translation is handled automatically via built-in protocol support. See the <a href="https://soulfiremc.com/docs/reference/versions">full version list</a>.',
    answerElement: (
      <>
        Every version ever released, from Classic and Alpha through the latest
        release, including Beta, Combat Snapshots, April Fools editions, and
        Bedrock Edition. Version translation is handled automatically via
        built-in protocol support. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "reference/versions" }}
          className="underline text-primary"
        >
          full version list
        </Link>
        .
      </>
    ),
  },
  {
    question: "Can servers detect SoulFire bots?",
    answerHtml:
      "SoulFire bots run real Fabric client code, so they behave identically to real players at the protocol level. Standard anti-cheat and anti-bot plugins can't distinguish them by packet analysis alone. This makes SoulFire ideal for testing whether your server's defenses actually work.",
    answerElement: (
      <>
        SoulFire bots run real Fabric client code, so they behave identically to
        real players at the protocol level. Standard anti-cheat and anti-bot
        plugins can't distinguish them by packet analysis alone. This makes
        SoulFire ideal for testing whether your server's defenses actually work.
      </>
    ),
  },
  {
    question: "How do I install SoulFire?",
    answerHtml:
      '<a href="https://soulfiremc.com/download">Download</a> the native installer for your platform (Windows, macOS, or Linux). No Java required, everything is bundled. Just install and run. See the <a href="https://soulfiremc.com/docs/start-here">start-here guide</a> for a full walkthrough.',
    answerElement: (
      <>
        <Link to="/download" className="underline text-primary">
          Download
        </Link>{" "}
        the native installer for your platform (Windows, macOS, or Linux). No
        Java required, everything is bundled. Just install and run. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "start-here" }}
          className="underline text-primary"
        >
          start-here guide
        </Link>{" "}
        for a full walkthrough.
      </>
    ),
  },
  {
    question: "Does SoulFire support Bedrock Edition?",
    answerHtml:
      'Yes. SoulFire can connect to Bedrock Edition servers via built-in protocol translation. Some features are still being added, but core functionality like joining, moving, and interacting works. See <a href="https://soulfiremc.com/docs/reference/versions">supported versions</a> for details.',
    answerElement: (
      <>
        Yes. SoulFire can connect to Bedrock Edition servers via built-in
        protocol translation. Some features are still being added, but core
        functionality like joining, moving, and interacting works. See{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "reference/versions" }}
          className="underline text-primary"
        >
          supported versions
        </Link>{" "}
        for details.
      </>
    ),
  },
  {
    question: "Can I write custom plugins?",
    answerHtml:
      'Yes. SoulFire plugins are Fabric mods with full access to Minecraft and SoulFire internals. Use scripting for high-level automation, and move to the <a href="https://soulfiremc.com/docs/development">Development docs</a> when you need low-level hooks, custom settings, Mixins, or direct bot control.',
    answerElement: (
      <>
        Yes. SoulFire plugins are Fabric mods with full access to Minecraft and
        SoulFire internals. Use scripting for high-level automation, and move to
        the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "development" }}
          className="underline text-primary"
        >
          Development docs
        </Link>{" "}
        when you need low-level hooks, custom settings, Mixins, or direct bot
        control.
      </>
    ),
  },
  {
    question: "Can I automate bots without writing code?",
    answerHtml:
      'Yes. SoulFire includes a visual scripting system with 70+ drag-and-drop nodes. Build automation workflows by connecting triggers, actions, and logic nodes, no programming required. The built-in script editor supports real-time debugging, AI/LLM integration, and more. See the <a href="https://soulfiremc.com/docs/scripting">scripting docs</a> to get started.',
    answerElement: (
      <>
        Yes. SoulFire includes a visual scripting system with 70+ drag-and-drop
        nodes. Build automation workflows by connecting triggers, actions, and
        logic nodes, no programming required. The built-in script editor
        supports real-time debugging, AI/LLM integration, and more. See the{" "}
        <Link
          to="/docs/$"
          params={{ _splat: "scripting" }}
          className="underline text-primary"
        >
          scripting docs
        </Link>{" "}
        to get started.
      </>
    ),
  },
];

function Page() {
  const softwareJsonLd: WithContext<SoftwareApplication> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SoulFire",
    description:
      "Advanced Minecraft bot tool for testing, automation, and development. Run bot sessions on your servers.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS, Linux",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    downloadUrl: "https://soulfiremc.com/download",
    softwareVersion: "2.0",
    author: {
      "@type": "Organization",
      name: "SoulFire",
      url: "https://soulfiremc.com",
    },
    featureList: [
      "High-performance bot framework",
      "Multi-version support (Classic to latest)",
      "Visual scripting system with 70+ nodes",
      "Plugin system",
      "Open source",
      "Cross-platform support",
      "CLI and GUI modes",
      "Bedrock Edition support",
    ],
    screenshot: "https://soulfiremc.com/logo.png",
    url: "https://soulfiremc.com",
  };

  const faqJsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answerHtml,
      },
    })),
  };

  const breadcrumbJsonLd: WithContext<BreadcrumbList> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://soulfiremc.com",
      },
    ],
  };

  return (
    <div className="px-4 pt-4 pb-6 w-full max-w-(--fd-layout-width) mx-auto flex-1 md:pb-12">
      <JsonLd data={softwareJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {/* Hero Section */}
      <section className="py-4 md:py-8">
        <div className="relative flex min-h-[600px] border rounded-2xl overflow-hidden bg-background">
          <HeroBackground />
          <div className="relative z-10 max-w-(--fd-layout-width) px-4 md:px-6 py-12 md:py-16">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-6 text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-primary/30 backdrop-blur-sm shadow-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <AnimatedShinyText className="text-sm font-semibold">
                    the last bot tool you'll ever need.
                  </AnimatedShinyText>
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  The best Minecraft bot tool, undetectable and fast.
                </h1>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-14 px-8 text-lg font-semibold"
                  >
                    <Link to="/download">
                      <Download data-icon="inline-start" />
                      Get SoulFire
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-14 border-2 bg-background/80 px-8 text-lg font-semibold backdrop-blur-sm"
                  >
                    <a
                      href={getRequiredEnv(
                        import.meta.env.VITE_GITHUB_LINK,
                        "VITE_GITHUB_LINK",
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SiGithub data-icon="inline-start" />
                      Star on GitHub
                    </a>
                  </Button>
                </div>
              </div>
              <div className="relative rounded-2xl border bg-background/80 backdrop-blur p-2 shadow-xl overflow-hidden">
                <BorderBeam
                  size={200}
                  duration={8}
                  colorFrom="#0ea5e9"
                  colorTo="#3b82f6"
                  borderWidth={2}
                />
                <div className="aspect-video overflow-hidden rounded-xl">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/BD-xE8vbHtQ?si=h16uIIHV8A3Q2Zgb"
                    title="SoulFire demo video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="h-full w-full"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-2xl md:text-3xl text-muted-foreground mt-8">
          <span className="text-primary font-semibold">High performance</span>,{" "}
          <span className="text-primary font-semibold">multi-version</span>{" "}
          support,{" "}
          <span className="text-primary font-semibold">plugin system</span>, and{" "}
          <span className="text-primary font-semibold">open source</span>.
          SoulFire is a Minecraft bot framework built for speed and scale.
        </p>
      </section>

      {/* Features */}
      {/** biome-ignore lint/correctness/useUniqueElementIds: Need this for static links */}
      <section className="py-16" id="features">
        <div className="mb-12 flex flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Features
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Everything you need to test and automate your Minecraft servers
          </p>
        </div>
        <BentoGrid className="auto-rows-[18rem] grid-cols-3 lg:grid-cols-3">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="w-full max-w-3xl mx-auto">
          <div className="mb-12 flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              Common questions about SoulFire
            </p>
          </div>
          <HomeFaq
            items={faqItems.map((item) => ({
              question: item.question,
              answer: item.answerElement,
            }))}
          />
        </div>
      </section>

      {/* Visual Scripting Section */}
      <section className="py-16">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-12 flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Visual Scripting, No Code Required
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              Build complex bot behaviors by connecting nodes in a visual
              editor. Drag and drop from 70+ built-in nodes across 12 categories
              including triggers, actions, flow control, AI, and more.
            </p>
          </div>
          <ScriptingAnimation />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8">
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4">
              <Blocks className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-orange-500" />
              <div>
                <div className="font-semibold text-sm sm:text-base">
                  70+ Nodes
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">
                  12 categories
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4">
              <MousePointerClick className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-blue-500" />
              <div>
                <div className="font-semibold text-sm sm:text-base">
                  No Code
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">
                  Drag & drop
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4">
              <Bug className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-purple-500" />
              <div>
                <div className="font-semibold text-sm sm:text-base">
                  Live Debug
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">
                  Real-time logs
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 sm:p-4">
              <Brain className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-cyan-500" />
              <div>
                <div className="font-semibold text-sm sm:text-base">
                  AI Built-in
                </div>
                <div className="text-[11px] sm:text-xs text-muted-foreground">
                  LLM integration
                </div>
              </div>
            </div>
          </div>
          <div className="flex mt-8">
            <Button asChild variant="outline">
              <Link to="/docs/$" params={{ _splat: "scripting" }}>
                Explore scripting docs
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <section className="py-16">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-12 flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              CLI Mode for Power Users
            </h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              Automate bot sessions and control everything from the terminal.
              Perfect for scripting, headless servers, and keyboard-first
              workflows.
            </p>
          </div>
          <TerminalAnimation />
          <div className="flex mt-8">
            <Button asChild variant="outline">
              <Link to="/docs/$" params={{ _splat: "reference/commands" }}>
                View all commands
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-5xl">
          <EnderDashSponsor placement="homepage" variant="feature" />
        </div>
      </section>

      {/* Final CTA */}
      {/** biome-ignore lint/correctness/useUniqueElementIds: Need this for static links */}
      <section className="py-16" id="final-cta">
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border bg-background px-8 py-16 md:py-24">
          <RetroGrid lineWidth={2} fade={false} className="opacity-30" />
          <div className="relative z-10 flex flex-col items-center gap-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Ready to Get Started?
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-lg">
              Join thousands of users who are already testing and automating
              their Minecraft servers with SoulFire
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Button asChild size="lg" className="h-12 px-8">
                <Link to="/download">
                  <Download data-icon="inline-start" />
                  <span>Get SoulFire</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <a
                  href={getRequiredEnv(
                    import.meta.env.VITE_GITHUB_LINK,
                    "VITE_GITHUB_LINK",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiGithub data-icon="inline-start" />
                  <span>View on GitHub</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: getPageMeta({
      title: "SoulFire - Advanced Minecraft Bot Tool",
      description: siteDescription,
      path: "/",
      imageUrl: "/og/site/home/image.webp",
      imageAlt: "SoulFire home page preview",
    }),
    links: getCanonicalLinks("/"),
    scripts: [
      jsonLdScript(
        createStructuredDataGraph([
          createWebPageStructuredData({
            path: "/",
            title: "SoulFire - Advanced Minecraft Bot Tool",
            description: siteDescription,
            imageUrl: "/og/site/home/image.webp",
          }),
        ]),
      ),
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      <Page />
    </SiteShell>
  );
}
