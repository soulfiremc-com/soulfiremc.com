import { useId, useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { itemAt } from "@/lib/item-at";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatUsd, parseCalculatorNumber } from "./donut-calculator-format";

const METHODS = [
  {
    name: "AFK Shard Farming",
    shardsPerDay: 1440,
    moneyPerDay: 0,
    setupCost: "None",
  },
  {
    name: "AFK Shards (Boosted 4x)",
    shardsPerDay: 5760,
    moneyPerDay: 0,
    setupCost: "Amethyst / shard booster",
  },
  {
    name: "Kelp Farm (Small)",
    shardsPerDay: 0,
    moneyPerDay: 50_000_000,
    setupCost: "~5M for materials",
  },
  {
    name: "Kelp Farm (Large)",
    shardsPerDay: 0,
    moneyPerDay: 89_000_000 * 24,
    setupCost: "~50M for materials",
  },
  {
    name: "Spawner Farm (100)",
    shardsPerDay: 0,
    moneyPerDay: 500_000_000,
    setupCost: "150K shards",
  },
  {
    name: "Spawner Farm (1728)",
    shardsPerDay: 0,
    moneyPerDay: 800_000_000 * 24,
    setupCost: "2.59M shards",
  },
  {
    name: "Sell Multiplier Arbitrage (3x)",
    shardsPerDay: 0,
    moneyPerDay: 300_000_000,
    setupCost: "Max sell multiplier",
  },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const MIN_BOTS = 1;
const MAX_BOTS = 1000;
const MAX_PRICE = 1;

export function DonutCalculator() {
  const id = useId();
  const [botInput, setBotInput] = useState("5");
  const [priceInput, setPriceInput] = useState("0.05");
  const [selectedMethod, setSelectedMethod] = useState(0);

  const botCount = Math.round(
    parseCalculatorNumber(botInput, {
      min: MIN_BOTS,
      max: MAX_BOTS,
      fallback: MIN_BOTS,
    }),
  );
  const pricePerMillion = parseCalculatorNumber(priceInput, {
    min: 0,
    max: MAX_PRICE,
    fallback: 0,
  });

  const method = itemAt(METHODS, selectedMethod);
  const dailyMoney = method.moneyPerDay * botCount;
  const dailyShards = method.shardsPerDay * botCount;
  const dailyUsd = (dailyMoney / 1_000_000) * pricePerMillion;
  const monthlyUsd = dailyUsd * 30;

  return (
    <div className="not-prose my-6 rounded-lg border bg-fd-card p-4 text-fd-card-foreground">
      <div className="mb-4 text-lg font-semibold">
        DonutSMP Earnings Calculator
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="*:data-[slot=native-select-wrapper]:w-full">
          <FieldLabel htmlFor={`${id}-method`}>Farming Method</FieldLabel>
          <NativeSelect
            id={`${id}-method`}
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(Number(e.target.value));
            }}
            className="bg-fd-background"
          >
            {METHODS.map((m, i) => (
              <NativeSelectOption key={m.name} value={i}>
                {m.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-bots`}>Number of Bots</FieldLabel>
          <Input
            id={`${id}-bots`}
            type="number"
            inputMode="numeric"
            min={MIN_BOTS}
            max={MAX_BOTS}
            step={1}
            value={botInput}
            onChange={(e) => {
              setBotInput(e.target.value);
            }}
            onBlur={() => {
              setBotInput(String(botCount));
            }}
            className="bg-fd-background"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`${id}-price`}>
            USD per Million (current market rate)
          </FieldLabel>
          <Input
            id={`${id}-price`}
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_PRICE}
            step={0.01}
            value={priceInput}
            onChange={(e) => {
              setPriceInput(e.target.value);
            }}
            onBlur={() => {
              setPriceInput(String(pricePerMillion));
            }}
            className="bg-fd-background"
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily Money</div>
          <div className="text-lg font-bold tabular-nums">
            {formatNumber(dailyMoney)}
          </div>
        </div>
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily Shards</div>
          <div className="text-lg font-bold tabular-nums">
            {formatNumber(dailyShards)}
          </div>
        </div>
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily USD</div>
          <div className="text-lg font-bold wrap-break-word text-success tabular-nums">
            {formatUsd(dailyUsd)}
          </div>
        </div>
        <div className="min-w-0 rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Monthly USD</div>
          <div className="text-lg font-bold wrap-break-word text-success tabular-nums">
            {formatUsd(monthlyUsd)}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-fd-muted-foreground">
        Setup cost per bot: {method.setupCost}. These presets are rough sanity
        checks, not live profitability models.
      </div>
    </div>
  );
}
