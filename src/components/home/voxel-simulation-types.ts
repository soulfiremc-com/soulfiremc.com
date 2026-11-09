export type TeamId = 0 | 1;
export type SelectionPressure = "balanced" | "build" | "battle";
export type ResourceKind = "wood" | "stone";
export type Point = readonly [number, number];

export interface Genome {
  aggression: number;
  building: number;
  caution: number;
}

export interface SimulationTile {
  id: string;
  x: number;
  z: number;
  height: number;
  material: "grass" | "stone" | "sand" | "water";
  resource: ResourceKind | null;
  quantity: number;
  structure: { kind: "wall" | "bridge"; team: TeamId; health: number } | null;
  hazard?: "scorch" | "lava";
  torch?: boolean;
  fire?: number;
}

export type BotTask =
  | "gather"
  | "deliver"
  | "craft"
  | "build"
  | "attack"
  | "defend"
  | "retreat"
  | "idle"
  | "dead";

export interface SimulationBot {
  id: string;
  team: TeamId;
  x: number;
  z: number;
  health: number;
  wood: number;
  stone: number;
  tool: "none" | "pickaxe" | "sword";
  task: BotTask;
  genome: Genome;
  fitness: number;
  parentId: string | null;
  facing: Point;
  action: number;
  hurt: number;
}

export interface SimulationTeam {
  id: TeamId;
  home: Point;
  wood: number;
  stone: number;
  wins: number;
}

export interface SimulationEvent {
  id: number;
  kind:
    | "mine"
    | "build"
    | "craft"
    | "hit"
    | "defeat"
    | "explode"
    | "lightning"
    | "spawn";
  x: number;
  z: number;
  team: TeamId;
  age: number;
  power?: number;
}

export interface SimulationMob {
  id: number;
  kind: "creeper" | "skeleton" | "zombie";
  x: number;
  z: number;
  health: number;
  facing: Point;
  fuse: number;
  cooldown: number;
  hurt: number;
}

export interface PrimedCharge {
  id: number;
  x: number;
  z: number;
  fuse: number;
  owner: string | null;
  chain: number;
  originX: number;
  originZ: number;
  flight: number;
}

export interface SimulationArrow {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  stuck: boolean;
}

export interface AdventureState {
  enabled: boolean;
  rng: number;
  nextId: number;
  night: number;
  storm: number;
  charges: PrimedCharge[];
  mobs: SimulationMob[];
  arrows: SimulationArrow[];
  nextWave: number;
  nextSiege: number;
  nextStorm: number;
  nextBolt: number;
  nextLava: number;
  breachReadyAt: number;
  stormReadyAt: number;
}

export interface SimulationMetrics {
  gathered: number;
  crafted: number;
  built: number;
  destroyed: number;
  hits: number;
}

export interface SimulationState {
  seed: number;
  generation: number;
  elapsed: number;
  roundDuration: number;
  pressure: SelectionPressure;
  tiles: SimulationTile[];
  bots: SimulationBot[];
  teams: [SimulationTeam, SimulationTeam];
  events: SimulationEvent[];
  metrics: SimulationMetrics;
  terrainVersion: number;
  adventure: AdventureState;
}

export interface SimulationSummary {
  generation: number;
  remaining: number;
  alive: [number, number];
  traits: [Genome, Genome];
  metrics: SimulationMetrics;
  pressure: SelectionPressure;
  night: number;
  storm: boolean;
  canBreach: boolean;
  canStorm: boolean;
}
