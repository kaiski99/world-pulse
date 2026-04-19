"use client";

import type { RegimeSnapshot, MacroEvent } from "@/lib/tracker/types";

interface RegimeStripProps {
  regime: RegimeSnapshot;
  nextEvent?: MacroEvent;
  btcDominance?: number;
  netLiquidityDelta?: number;
  dxyValue?: number;
}

const LEVEL_COLORS = {
  RISK_ON: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", dot: "bg-green-400" },
  NEUTRAL: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-400" },
  RISK_OFF: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
};

function formatCountdown(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "passed";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function RegimeStrip({
  regime,
  nextEvent,
  btcDominance,
  netLiquidityDelta,
  dxyValue,
}: RegimeStripProps) {
  const colors = LEVEL_COLORS[regime.level];

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${colors.bg} ${colors.border} flex-wrap`}>
      {/* Regime badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
        <span className={`font-[family-name:var(--font-mono)] text-sm font-bold tracking-wider ${colors.text}`}>
          {regime.level.replace("_", " ")}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-lg font-bold text-text-primary">
          {regime.score}
        </span>
        {regime.previousScore != null && (
          <span className={`text-xs font-[family-name:var(--font-mono)] ${
            regime.score > regime.previousScore ? "text-green-400" : regime.score < regime.previousScore ? "text-red-400" : "text-text-muted"
          }`}>
            {regime.score > regime.previousScore ? "+" : ""}{regime.score - regime.previousScore}
          </span>
        )}
      </div>

      <span className="w-px h-6 bg-border-main" />

      {/* Net liquidity delta */}
      {netLiquidityDelta != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)] uppercase">Net Liq</span>
          <span className={`text-xs font-[family-name:var(--font-mono)] font-medium ${
            netLiquidityDelta > 0 ? "text-green-400" : netLiquidityDelta < 0 ? "text-red-400" : "text-text-muted"
          }`}>
            {netLiquidityDelta > 0 ? "+" : ""}{(netLiquidityDelta / 1e6).toFixed(0)}M
          </span>
        </div>
      )}

      {/* DXY */}
      {dxyValue != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)] uppercase">DXY</span>
          <span className="text-xs font-[family-name:var(--font-mono)] font-medium text-text-primary">
            {dxyValue.toFixed(1)}
          </span>
        </div>
      )}

      {/* BTC Dominance */}
      {btcDominance != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)] uppercase">BTC.D</span>
          <span className="text-xs font-[family-name:var(--font-mono)] font-medium text-text-primary">
            {btcDominance.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Next macro event */}
      {nextEvent && (
        <>
          <span className="w-px h-6 bg-border-main" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)] uppercase">Next</span>
            <span className="text-xs font-[family-name:var(--font-mono)] font-medium text-accent-orange">
              {nextEvent.name}
            </span>
            <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
              {formatCountdown(nextEvent.date)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
