import {
  Bot,
  Code,
  Gamepad2,
  Hammer,
  Heart,
  Mountain,
  Pickaxe,
  Puzzle,
  Shield,
  Sword,
  TreePine,
} from "lucide-react";

export type Category = "plugin" | "script";

export type FilterableTag =
  | "combat"
  | "farming"
  | "utility"
  | "movement"
  | "building"
  | "pvp"
  | "survival"
  | "minigame"
  | "automation"
  | "open-source";

export type Badge = FilterableTag | Category;

export type Resource = {
  slug: string;
  name: string;
  logo?: string;
  description: string;
  author: string;
  url: string;
  category: Category;
  badges: Badge[];
  sourceUrl?: string;
  version?: string;
  startDate?: string;
  gallery?: { src: string; alt: string }[];
};

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "plugin", label: "Plugin" },
  { value: "script", label: "Script" },
];

export const BADGE_CONFIG: Record<
  Badge,
  {
    label: string;
    className: string;
    description: string;
    icon: React.ReactNode;
  }
> = {
  plugin: {
    label: "Plugin",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    description:
      "A SoulFire plugin that extends the bot engine with new features and capabilities.",
    icon: <Puzzle className="h-3 w-3" />,
  },
  script: {
    label: "Script",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    description:
      "A SoulFire script that automates bot behavior using the scripting API.",
    icon: <Code className="h-3 w-3" />,
  },
  combat: {
    label: "Combat",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    description:
      "Relates to combat mechanics such as attacking, defending, and PvE encounters.",
    icon: <Sword className="h-3 w-3" />,
  },
  farming: {
    label: "Farming",
    className: "bg-success/10 text-success",
    description:
      "Automates farming tasks like crop harvesting, animal breeding, and resource gathering.",
    icon: <Pickaxe className="h-3 w-3" />,
  },
  utility: {
    label: "Utility",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    description:
      "General-purpose tools and helpers that improve the bot experience.",
    icon: <Hammer className="h-3 w-3" />,
  },
  movement: {
    label: "Movement",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    description:
      "Handles bot movement, pathfinding, navigation, and travel automation.",
    icon: <Mountain className="h-3 w-3" />,
  },
  building: {
    label: "Building",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    description:
      "Automates building structures, placing blocks, and construction tasks.",
    icon: <Hammer className="h-3 w-3" />,
  },
  pvp: {
    label: "PvP",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    description:
      "Focused on player-versus-player combat, including aiming, hitting, and strategy.",
    icon: <Shield className="h-3 w-3" />,
  },
  survival: {
    label: "Survival",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    description:
      "Helps bots survive by managing health, hunger, equipment, and dangers.",
    icon: <TreePine className="h-3 w-3" />,
  },
  minigame: {
    label: "Minigame",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    description:
      "Designed for specific Minecraft minigames and server game modes.",
    icon: <Gamepad2 className="h-3 w-3" />,
  },
  automation: {
    label: "Automation",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    description:
      "General automation of repetitive tasks and workflows for bots.",
    icon: <Bot className="h-3 w-3" />,
  },
  "open-source": {
    label: "Open Source",
    className: "bg-offer/10 text-offer",
    description:
      "The source code is publicly available, allowing community contributions and auditing.",
    icon: <Heart className="h-3 w-3" />,
  },
};

export const FILTER_TAGS: FilterableTag[] = [
  "combat",
  "farming",
  "utility",
  "movement",
  "building",
  "pvp",
  "survival",
  "minigame",
  "automation",
  "open-source",
];

export function getResourceBySlug(slug: string): Resource | undefined {
  return RESOURCES.find((resource) => resource.slug === slug);
}

export const RESOURCES: Resource[] = [
  {
    slug: "sf-plugin-example",
    name: "SoulFire Plugin Example",
    description:
      "Official template for creating SoulFire plugins. Demonstrates the plugin API, event handling, settings registration, and best practices.",
    author: "AlexProgrammerDE",
    url: "https://github.com/soulfiremc-com/SoulFirePluginExample/releases",
    category: "plugin",
    badges: ["plugin", "utility", "open-source"],
    sourceUrl: "https://github.com/soulfiremc-com/SoulFirePluginExample",
    startDate: "2024",
  },
];
