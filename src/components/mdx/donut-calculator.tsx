"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

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

export function DonutCalculator() {
  const [botCount, setBotCount] = useState(5);
  const [pricePerMillion, setPricePerMillion] = useState(0.05);
  const [selectedMethod, setSelectedMethod] = useState(0);

  const method = METHODS[selectedMethod];
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
        <Field>
          <FieldLabel>Farming Method</FieldLabel>
          <NativeSelect
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(Number(e.target.value))}
            className="w-full min-w-full bg-fd-background"
          >
            {METHODS.map((m, i) => (
              <NativeSelectOption key={m.name} value={i}>
                {m.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>Number of Bots</FieldLabel>
          <Input
            type="number"
            min={1}
            max={1000}
            value={botCount}
            onChange={(e) => setBotCount(Math.max(1, Number(e.target.value)))}
            className="bg-fd-background"
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>USD per Million (current market rate)</FieldLabel>
          <Input
            type="number"
            min={0.001}
            max={1}
            step={0.005}
            value={pricePerMillion}
            onChange={(e) =>
              setPricePerMillion(Math.max(0.001, Number(e.target.value)))
            }
            className="bg-fd-background"
          />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily Money</div>
          <div className="text-lg font-bold">{formatNumber(dailyMoney)}</div>
        </div>
        <div className="rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily Shards</div>
          <div className="text-lg font-bold">{formatNumber(dailyShards)}</div>
        </div>
        <div className="rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Daily USD</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${dailyUsd.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md border bg-fd-background p-3">
          <div className="text-xs text-fd-muted-foreground">Monthly USD</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${monthlyUsd.toFixed(2)}
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
