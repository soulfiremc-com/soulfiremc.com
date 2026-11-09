import { Blocks, Scale, Settings2, Swords } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/lib/i18n-react";
import type {
  SelectionPressure,
  SimulationSummary,
} from "./voxel-simulation-types";

export const selectionOptions = [
  { value: "balanced", label: "simulation.balanced", icon: Scale },
  { value: "build", label: "simulation.building", icon: Blocks },
  { value: "battle", label: "simulation.combat", icon: Swords },
] as const;

const traits = [
  { value: "aggression", label: "simulation.aggression" },
  { value: "building", label: "simulation.buildingPreference" },
  { value: "caution", label: "simulation.caution" },
] as const;

export function VoxelSettings({
  pressure,
  onPressureChange,
  summary,
  disabled,
}: {
  pressure: SelectionPressure;
  onPressureChange: (value: SelectionPressure) => void;
  summary: SimulationSummary;
  disabled: boolean;
}) {
  const t = useT();
  const goalId = useId();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("simulation.simulationSettings")}
          />
        }
      >
        <Settings2 />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="max-h-[var(--available-height)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <div className="flex flex-col gap-5">
          <PopoverHeader>
            <PopoverTitle>{t("simulation.simulationSettings")}</PopoverTitle>
          </PopoverHeader>
          <Field>
            <FieldLabel id={goalId}>{t("simulation.reward")}</FieldLabel>
            <ToggleGroup
              className="flex-wrap"
              value={[pressure]}
              onValueChange={([value]) => {
                const next = selectionOptions.find(
                  (option) => option.value === value,
                );
                if (next) onPressureChange(next.value);
              }}
              variant="outline"
              size="sm"
              aria-labelledby={goalId}
              disabled={disabled}
            >
              {selectionOptions.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value}>
                  <Icon aria-hidden="true" />
                  {t(label)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            {(
              [
                ["gathered", "simulation.gathered"],
                ["crafted", "simulation.crafted"],
                ["built", "simulation.built"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-muted-foreground">{t(label)}</dt>
                <dd className="font-medium tabular-nums">
                  {summary.metrics[key]}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="text-sm font-medium">
              {t("simulation.inheritedTraits")}
            </p>
            <div className="voxel-trait-grid text-xs">
              <span />
              <span>{t("simulation.cyanCamp2")}</span>
              <span>{t("simulation.amberCamp2")}</span>
              {traits.map(({ value, label }) => (
                <div className="voxel-trait-row" key={value}>
                  <span>{t(label)}</span>
                  <meter
                    className="voxel-genome-meter"
                    min={0}
                    max={1}
                    value={summary.traits[0][value]}
                    aria-label={t("simulation.cyanCamp3", { trait: t(label) })}
                  >
                    {Math.round(summary.traits[0][value] * 100)}%
                  </meter>
                  <meter
                    className="voxel-genome-meter"
                    min={0}
                    max={1}
                    value={summary.traits[1][value]}
                    aria-label={t("simulation.amberCamp3", { trait: t(label) })}
                  >
                    {Math.round(summary.traits[1][value] * 100)}%
                  </meter>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
