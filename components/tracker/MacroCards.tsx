"use client";

import type { MacroSnapshot, MacroDataPoint } from "@/lib/tracker/types";

interface MacroCardsProps {
  macro: MacroSnapshot;
}

function formatValue(v: number, unit: string): string {
  if (unit === "$M" || unit === "$B") {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}T`;
    if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}B`;
    return `$${v.toFixed(0)}M`;
  }
  if (unit === "$") {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (unit === "%") return `${v.toFixed(2)}%`;
  if (unit === "index") return v.toFixed(1);
  if (unit === "JPY") return `¥${v.toFixed(2)}`;
  if (unit === "EUR") return `€${v.toFixed(4)}`;
  return `${v.toFixed(2)} ${unit}`;
}

function Row({ p }: { p: MacroDataPoint | undefined }) {
  if (!p) {
    return (
      <div className="flex items-center justify-between opacity-40">
        <span className="text-xs text-text-secondary">—</span>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted italic">no data</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{p.name}</span>
      <div className="flex items-center gap-2">
        {p.status === "DEGRADED" ? (
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted italic">degraded</span>
        ) : (
          <>
            <span className="text-xs font-[family-name:var(--font-mono)] text-text-primary font-medium">
              {formatValue(p.value, p.unit)}
            </span>
            {p.changePct != null && (
              <span className={`text-[10px] font-[family-name:var(--font-mono)] ${
                p.changePct > 0 ? "text-green-400" : p.changePct < 0 ? "text-red-400" : "text-text-muted"
              }`}>
                {p.changePct > 0 ? "+" : ""}{p.changePct.toFixed(2)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  points,
  interpretation,
}: {
  title: string;
  points: (MacroDataPoint | undefined)[];
  interpretation: string;
}) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-main p-3">
      <h4 className="font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-wider uppercase text-text-muted mb-2">
        {title}
      </h4>
      <div className="space-y-1.5">
        {points.map((p, i) => <Row key={p?.id ?? `x${i}`} p={p} />)}
      </div>
      <p className="mt-2 text-[10px] text-text-muted leading-relaxed border-t border-border-main pt-1.5">
        {interpretation}
      </p>
    </div>
  );
}

function dxyInterpretation(m: MacroSnapshot): string {
  if (m.dxy.status !== "LIVE") return "DXY unavailable — cannot score dollar regime.";
  if (m.dxy.value < 100) return "Weak dollar — tailwind for crypto and risk assets.";
  if (m.dxy.value < 105) return "Dollar neutral range.";
  return "Strong dollar — headwind for risk. Watch for reversal.";
}

function liquidityInterpretation(m: MacroSnapshot): string {
  if (m.netLiquidity.status !== "LIVE") return "Net liquidity degraded. Add FRED_API_KEY.";
  const delta = m.netLiquidity.changePct ?? 0;
  if (delta > 0.5) return "Net liquidity expanding — historically bullish for crypto.";
  if (delta < -0.5) return "Net liquidity contracting — risk assets face headwinds.";
  return "Net liquidity flat — neutral for risk.";
}

function flowInterpretation(m: MacroSnapshot): string {
  if (m.stablecoinDelta.status !== "LIVE") return "Stablecoin flow data unavailable.";
  const v = m.stablecoinDelta.value;
  if (v > 100_000_000) return "Stablecoins minting — capital flowing into crypto.";
  if (v < -100_000_000) return "Stablecoins burning — capital leaving crypto.";
  return "Stablecoin supply flat — neutral flow.";
}

function contextInterpretation(m: MacroSnapshot): string {
  if (m.realYield?.status === "LIVE") {
    const v = m.realYield.value;
    if (v < 0) return "Negative real yields — bullish for scarce assets like BTC.";
    if (v < 1) return "Low real yields — mildly supportive of risk.";
    return "Elevated real yields — headwind for crypto.";
  }
  return "Yields/spreads context — add FRED_API_KEY for live data.";
}

export default function MacroCards({ macro }: MacroCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Card
        title="Dollar (regime-scored)"
        points={[macro.dxy, macro.usdjpy, macro.eurusd]}
        interpretation={dxyInterpretation(macro)}
      />
      <Card
        title="Liquidity (regime-scored)"
        points={[macro.netLiquidity, macro.fedBalanceSheet, macro.rrp, macro.tga]}
        interpretation={liquidityInterpretation(macro)}
      />
      <Card
        title="Crypto Flow (regime-scored)"
        points={[macro.stablecoinDelta, macro.btcDominance]}
        interpretation={flowInterpretation(macro)}
      />
      <Card
        title="Rates Context"
        points={[macro.us10y, macro.realYield, macro.hySpread]}
        interpretation={contextInterpretation(macro)}
      />
    </div>
  );
}
