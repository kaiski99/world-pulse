"use client";

import { useState } from "react";
import type { TokenStateRecord } from "@/lib/tracker/types";

interface WatchlistTableProps {
  tokens: TokenStateRecord[];
  regimeLevel: string;
}

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  QUIET: { bg: "bg-blue-500/10", text: "text-blue-400" },
  IMBALANCE_FORMING: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  IMBALANCE_CONFIRMED: { bg: "bg-green-500/10", text: "text-green-400" },
  EXTENDED: { bg: "bg-orange-500/10", text: "text-orange-400" },
  INVALID: { bg: "bg-zinc-500/10", text: "text-zinc-500" },
};

type SortKey = "symbol" | "state" | "quietScore" | "distanceTo30wMaPct" | "daysInState";

export default function WatchlistTable({ tokens, regimeLevel }: WatchlistTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("state");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);

  const stateOrder: Record<string, number> = {
    IMBALANCE_CONFIRMED: 0,
    IMBALANCE_FORMING: 1,
    QUIET: 2,
    EXTENDED: 3,
    INVALID: 4,
  };

  const sorted = [...tokens].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "symbol": cmp = a.symbol.localeCompare(b.symbol); break;
      case "state": cmp = (stateOrder[a.state] ?? 5) - (stateOrder[b.state] ?? 5); break;
      case "quietScore": cmp = b.quietScore.total - a.quietScore.total; break;
      case "distanceTo30wMaPct": cmp = a.distanceTo30wMaPct - b.distanceTo30wMaPct; break;
      case "daysInState": cmp = b.daysInState - a.daysInState; break;
    }
    return sortAsc ? -cmp : cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const eligible = regimeLevel === "RISK_ON" ? "all" : regimeLevel === "NEUTRAL" ? "majors only" : "none";

  return (
    <div className="rounded-lg bg-bg-surface border border-border-main overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-main">
        <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted">
          Watchlist
        </h3>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
          Eligible: {eligible} | {tokens.length} tokens
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-main">
              {[
                { key: "symbol" as SortKey, label: "Token" },
                { key: "state" as SortKey, label: "State" },
                { key: "quietScore" as SortKey, label: "Quiet" },
                { key: "distanceTo30wMaPct" as SortKey, label: "30W MA" },
                { key: "daysInState" as SortKey, label: "Days" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-secondary"
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? "\u2191" : "\u2193") : ""}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-muted">
                Disqual
              </th>
              <th className="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-text-muted">
                Stop / Size
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const colors = STATE_COLORS[t.state] ?? STATE_COLORS.INVALID;
              const expanded = expandedToken === t.tokenId;
              const disqualList: string[] = [];
              if (t.disqualifiers.extendedAboveMa) disqualList.push("extended");
              if (t.disqualifiers.socialSpike) disqualList.push("social");
              if (t.disqualifiers.alreadyPrinted) disqualList.push("printed");

              return (
                <tr
                  key={t.tokenId}
                  onClick={() => setExpandedToken(expanded ? null : t.tokenId)}
                  className="border-b border-border-main/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)] font-medium text-text-primary">
                    {t.symbol}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)] font-medium ${colors.bg} ${colors.text}`}>
                      {t.state.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)]">
                    <span className={t.quietScore.passing ? "text-green-400" : "text-text-muted"}>
                      {t.quietScore.total}
                    </span>
                    <span className="text-text-muted">/100</span>
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)]">
                    <span className={t.distanceTo30wMaPct > 0 ? "text-green-400" : "text-red-400"}>
                      {t.distanceTo30wMaPct > 0 ? "+" : ""}{t.distanceTo30wMaPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-text-muted">
                    {t.daysInState}
                  </td>
                  <td className="px-3 py-2">
                    {disqualList.length > 0 ? (
                      <div className="flex gap-1">
                        {disqualList.map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-[family-name:var(--font-mono)]">
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-muted text-[10px]">clear</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                    {t.suggestedStop != null ? (
                      <span className="text-text-muted">
                        ${t.suggestedStop.toFixed(2)} / {t.suggestedSizePct?.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
