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
}

export type BotTask =
  | "gather"
  | "deliver"
  | "craft"
  | "build"
  | "attack"
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
  kind: "mine" | "build" | "craft" | "hit" | "defeat";
  x: number;
  z: number;
  team: TeamId;
  age: number;
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
}

export interface SimulationSummary {
  generation: number;
  remaining: number;
  alive: [number, number];
  traits: [Genome, Genome];
  metrics: SimulationMetrics;
  pressure: SelectionPressure;
}
