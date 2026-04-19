"use client";

import type { MacroSnapshot, MacroDataPoint } from "@/lib/tracker/types";

interface MacroCardsProps {
  macro: MacroSnapshot;
}

function Card({ title, points, interpretation }: { title: string; points: MacroDataPoint[]; interpretation: string }) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-main p-3">
      <h4 className="font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-wider uppercase text-text-muted mb-2">
        {title}
      </h4>
      <div className="space-y-1.5">
        {points.map((p) => (
          <div key={p.id} className="flex items-center justify-between">
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
        ))}
      </div>
      <p className="mt-2 text-[10px] text-text-muted leading-relaxed border-t border-border-main pt-1.5">
        {interpretation}
      </p>
    </div>
  );
}

function formatValue(v: number, unit: string): string {
  if (unit === "$M" || unit === "$B") {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}T`;
    if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}B`;
    return `$${v.toFixed(0)}M`;
  }
  if (unit === "%") return `${v.toFixed(2)}%`;
  if (unit === "bps") return `${v.toFixed(0)} bps`;
  if (unit === "index") return v.toFixed(1);
  if (unit.startsWith("$")) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${v.toFixed(2)} ${unit}`;
}

function ratesInterpretation(m: MacroSnapshot): string {
  const r = m.rates.realYield;
  if (r.status !== "LIVE") return "Yields data degraded. Cannot assess rate environment.";
  if (r.value < 0) return "Negative real yields — bullish for scarce assets like BTC.";
  if (r.value < 1) return "Low real yields — mildly supportive of risk assets.";
  return "Elevated real yields — headwind for crypto. Watch for dovish pivot.";
}

function fxInterpretation(m: MacroSnapshot): string {
  const dxy = m.fx.dxy;
  if (dxy.status !== "LIVE") return "DXY proxy active from FX rates.";
  if (dxy.value < 100) return "Weak dollar — tailwind for crypto and EM.";
  if (dxy.value < 105) return "Dollar neutral range.";
  return "Strong dollar — headwind for risk. Watch for reversal signals.";
}

function liquidityInterpretation(m: MacroSnapshot): string {
  const nl = m.liquidity.netLiquidity;
  if (nl.status !== "LIVE") return "Net liquidity data degraded. Add FRED_API_KEY for live data.";
  const delta = nl.change ?? 0;
  if (delta > 0) return "Net liquidity expanding — historically bullish for crypto.";
  if (delta < 0) return "Net liquidity contracting — risk assets face headwinds.";
  return "Net liquidity flat — neutral for risk.";
}

function creditInterpretation(m: MacroSnapshot): string {
  const hy = m.credit.hySpread;
  if (hy.status !== "LIVE") return "Credit spread data degraded. Add FRED_API_KEY.";
  if (hy.value < 350) return "Tight HY spreads — credit market calm, supportive.";
  if (hy.value < 500) return "HY spreads moderate — watching for widening.";
  return "HY spreads wide — stress signal. Caution on risk assets.";
}

export default function MacroCards({ macro }: MacroCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Card
        title="Rates"
        points={[macro.rates.us2y, macro.rates.us10y, macro.rates.realYield, macro.rates.fedFundsRate]}
        interpretation={ratesInterpretation(macro)}
      />
      <Card
        title="FX"
        points={[macro.fx.dxy, macro.fx.usdjpy, macro.fx.usdcnh, macro.fx.eurusd]}
        interpretation={fxInterpretation(macro)}
      />
      <Card
        title="Liquidity"
        points={[macro.liquidity.netLiquidity, macro.liquidity.fedBalanceSheet, macro.liquidity.rrp, macro.liquidity.tga]}
        interpretation={liquidityInterpretation(macro)}
      />
      <Card
        title="Credit"
        points={[macro.credit.hySpread, macro.credit.igSpread]}
        interpretation={creditInterpretation(macro)}
      />
      <Card
        title="Equities"
        points={[macro.equities.spx, macro.equities.vix, macro.equities.move]}
        interpretation="Equity/vol data requires paid source. Regime score uses VIX default (neutral)."
      />
      <Card
        title="Commodities"
        points={[macro.commodities.gold, macro.commodities.wti, macro.commodities.copper]}
        interpretation={macro.commodities.gold.status === "LIVE" ? "Gold as risk barometer — rising gold with rising BTC = liquidity trade." : "Commodity data partially degraded."}
      />
    </div>
  );
}
