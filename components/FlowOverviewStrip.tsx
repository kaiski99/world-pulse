"use client";

import { FlowSnapshot } from "@/lib/types";

interface FlowOverviewStripProps {
  flows: FlowSnapshot | null;
}

function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function changeColor(value: number): string {
  if (value > 0) return "text-accent-green";
  if (value < 0) return "text-red-500";
  return "text-text-muted";
}

function fearGreedColor(index: number): string {
  if (index < 25) return "text-red-500";
  if (index < 45) return "text-accent-orange";
  if (index < 55) return "text-text-muted";
  if (index < 75) return "text-accent-green";
  return "text-emerald-400";
}

interface StatBoxProps {
  label: string;
  value: string;
  change?: string;
  changeValue?: number;
  borderColor?: string;
  valueColor?: string;
}

function StatBox({
  label,
  value,
  change,
  changeValue = 0,
  borderColor = "border-l-cyan-500",
  valueColor,
}: StatBoxProps) {
  return (
    <div
      className={`flex-shrink-0 px-3 py-2 rounded bg-bg-surface border border-border-main min-w-[140px] border-l-2 ${borderColor}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-[family-name:var(--font-mono)] font-semibold ${valueColor || "text-text-primary"}`}
      >
        {value}
      </div>
      {change && (
        <div
          className={`text-xs font-[family-name:var(--font-mono)] ${changeColor(changeValue)}`}
        >
          {change}
        </div>
      )}
    </div>
  );
}

export default function FlowOverviewStrip({ flows }: FlowOverviewStripProps) {
  if (!flows) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 px-3 py-2 rounded bg-bg-surface border border-border-main min-w-[140px] h-[72px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const { capital, macro } = flows;

  // Find Gold
  const gold = macro.commodities.find((c) =>
    c.name.toLowerCase().includes("gold")
  );

  // Find Oil
  const oil = macro.commodities.find(
    (c) =>
      c.name.toLowerCase().includes("oil") ||
      c.name.toLowerCase().includes("wti") ||
      c.name.toLowerCase().includes("crude")
  );

  // USD Strength: average of FX changePct24h, inverted
  const fxChanges = macro.fx.map((f) => f.changePct24h);
  const avgFxChange =
    fxChanges.length > 0
      ? fxChanges.reduce((a, b) => a + b, 0) / fxChanges.length
      : 0;
  const usdStrength = -avgFxChange; // positive avg means USD weakening

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <StatBox
        label="Crypto Market Cap"
        value={formatLargeNumber(capital.totalCryptoMarketCap)}
        change={formatChange(capital.marketCapChange24h)}
        changeValue={capital.marketCapChange24h}
        borderColor="border-l-cyan-500"
      />
      <StatBox
        label="BTC Dominance"
        value={`${capital.btcDominance.toFixed(1)}%`}
        borderColor="border-l-amber-500"
      />
      <StatBox
        label="Stablecoin Supply"
        value={formatLargeNumber(capital.totalStablecoinSupply)}
        change={formatChange(capital.stablecoinChange24h)}
        changeValue={capital.stablecoinChange24h}
        borderColor="border-l-emerald-500"
      />
      <StatBox
        label="Fear & Greed"
        value={`${capital.fearGreedIndex}`}
        change={capital.fearGreedLabel}
        changeValue={0}
        borderColor="border-l-violet-500"
        valueColor={fearGreedColor(capital.fearGreedIndex)}
      />
      {gold && (
        <StatBox
          label="Gold"
          value={`$${gold.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          change={formatChange(gold.changePct24h)}
          changeValue={gold.changePct24h}
          borderColor="border-l-yellow-500"
        />
      )}
      {oil && (
        <StatBox
          label="Oil"
          value={`$${oil.value.toFixed(2)}`}
          change={formatChange(oil.changePct24h)}
          changeValue={oil.changePct24h}
          borderColor="border-l-orange-500"
        />
      )}
      <StatBox
        label="USD Strength"
        value={formatChange(usdStrength)}
        changeValue={usdStrength}
        borderColor="border-l-purple-500"
        valueColor={changeColor(usdStrength)}
      />
    </div>
  );
}
