import { useId, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseCalculatorNumber } from "./donut-calculator-format";

const FIELDS = {
  players: {
    label: "Players or bots in the AFK area",
    min: 1,
    max: 100_000,
    fallback: 1,
    initial: "50",
  },
  reward: {
    label: "Reward per minute",
    min: 0,
    max: 1_000_000_000,
    fallback: 0,
    initial: "1",
  },
  hours: {
    label: "Hours online per day",
    min: 0,
    max: 24,
    fallback: 0,
    initial: "8",
  },
  price: {
    label: "Price of a target item",
    min: 0,
    max: 1_000_000_000_000,
    fallback: 0,
    initial: "1500",
  },
} as const;

type FieldName = keyof typeof FIELDS;

const FIELD_NAMES: FieldName[] = ["players", "reward", "hours", "price"];

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

/**
 * Estimates how much currency an AFK reward creates, from values the server
 * operator enters. It has no built-in prices, because live economies change.
 */
export function DonutCalculator() {
  const id = useId();
  const [inputs, setInputs] = useState<Record<FieldName, string>>({
    players: FIELDS.players.initial,
    reward: FIELDS.reward.initial,
    hours: FIELDS.hours.initial,
    price: FIELDS.price.initial,
  });

  const value = (name: FieldName) => {
    const parsed = parseCalculatorNumber(inputs[name], FIELDS[name]);
    return name === "players" ? Math.round(parsed) : parsed;
  };
  const players = value("players");
  const perPlayerDaily = value("reward") * 60 * value("hours");
  const totalDaily = perPlayerDaily * players;
  const price = value("price");
  const daysToAfford =
    perPlayerDaily > 0 && price > 0
      ? numberFormat.format(price / perPlayerDaily)
      : "Never";

  return (
    <div className="not-prose my-6 flex flex-col gap-4 rounded-lg border bg-fd-card p-4 text-fd-card-foreground">
      <div className="text-lg font-semibold">AFK reward calculator</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELD_NAMES.map((name) => (
          <Field key={name}>
            <FieldLabel htmlFor={`${id}-${name}`}>
              {FIELDS[name].label}
            </FieldLabel>
            <Input
              id={`${id}-${name}`}
              type="number"
              inputMode="decimal"
              min={FIELDS[name].min}
              max={FIELDS[name].max}
              value={inputs[name]}
              onChange={(e) => {
                setInputs((current) => ({
                  ...current,
                  [name]: e.target.value,
                }));
              }}
              onBlur={() => {
                setInputs((current) => ({
                  ...current,
                  [name]: String(value(name)),
                }));
              }}
              className="bg-fd-background"
            />
          </Field>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">
            Currency created per day
          </div>
          <div className="text-lg font-bold tabular-nums">
            {numberFormat.format(totalDaily)}
          </div>
        </div>
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">
            Days for one player to afford the item
          </div>
          <div className="text-lg font-bold tabular-nums">{daysToAfford}</div>
        </div>
      </div>

      <div className="text-xs text-fd-muted-foreground">
        Compare the daily total with what your shops and fees remove from the
        economy each day.
      </div>
    </div>
  );
}
