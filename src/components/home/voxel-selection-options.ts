import { Blocks, Scale, Swords } from "lucide-react";

export const selectionOptions = [
  { value: "balanced", label: "simulation.balanced", icon: Scale },
  { value: "build", label: "simulation.building", icon: Blocks },
  { value: "battle", label: "simulation.combat", icon: Swords },
] as const;
