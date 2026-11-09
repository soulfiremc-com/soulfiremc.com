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
  { value: "balanced", label: "Balanced", icon: Scale },
  { value: "build", label: "Building", icon: Blocks },
  { value: "battle", label: "Combat", icon: Swords },
] as const;

const traits = [
  { value: "aggression", label: "Aggression" },
  { value: "building", label: "Building preference" },
  { value: "caution", label: "Caution" },
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
            aria-label={t("Simulation settings")}
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
            <PopoverTitle>{t("Simulation settings")}</PopoverTitle>
          </PopoverHeader>
          <Field>
            <FieldLabel id={goalId}>{t("Reward")}</FieldLabel>
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
                ["gathered", "Gathered"],
                ["crafted", "Crafted"],
                ["built", "Built"],
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
            <p className="text-sm font-medium">{t("Inherited traits")}</p>
            <div className="voxel-trait-grid text-xs">
              <span />
              <span>{t("Cyan camp")}</span>
              <span>{t("Amber camp")}</span>
              {traits.map(({ value, label }) => (
                <div className="voxel-trait-row" key={value}>
                  <span>{t(label)}</span>
                  <meter
                    className="voxel-genome-meter"
                    min={0}
                    max={1}
                    value={summary.traits[0][value]}
                    aria-label={t("Cyan camp: {trait}", { trait: t(label) })}
                  >
                    {Math.round(summary.traits[0][value] * 100)}%
                  </meter>
                  <meter
                    className="voxel-genome-meter"
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
