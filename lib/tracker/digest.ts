import type { TrackerSnapshot, TokenStateRecord, MacroEvent } from "./types";

export interface WeeklyDigest {
  generatedAt: string;
  regimeRecap: string;
  setupSummary: {
    triggered: string[];
    failed: string[];
    watching: string[];
    hitRate: string;
  };
  weekAhead: MacroEvent[];
  keyTakeaways: string[];
}

export function generateDigest(
  currentSnapshot: TrackerSnapshot,
  weekEvents: TrackerSnapshot["events"]
): WeeklyDigest {
  const now = new Date().toISOString();

  // Regime recap
  const regime = currentSnapshot.regime;
  const regimeFlips = weekEvents.filter((e) => e.type === "regime_flip");
  let regimeRecap = `Current regime: ${regime.level} (score ${regime.score}/100). `;
  if (regimeFlips.length > 0) {
    regimeRecap += `${regimeFlips.length} regime flip(s) this week: ${regimeFlips.map((e) => e.title).join("; ")}. `;
  } else {
    regimeRecap += "No regime changes this week. ";
  }
  regimeRecap += `Components: DXY ${regime.components.dxyTrend}/33, Net Liquidity ${regime.components.netLiquidity}/33, Stablecoin Flow ${regime.components.stablecoinFlow}/34.`;

  // Setup summary
  const stateTransitions = weekEvents.filter((e) => e.type === "state_transition");
  const triggered = stateTransitions
    .filter((e) => e.title.includes("IMBALANCE_CONFIRMED"))
    .map((e) => e.tokenId ?? "unknown");
  const failed = stateTransitions
    .filter(
      (e) =>
        e.title.includes("INVALID") &&
        (e.detail.includes("disqualified") || e.detail.includes("printed"))
    )
    .map((e) => e.tokenId ?? "unknown");
  const watching = currentSnapshot.tokens
    .filter((t) => t.state === "QUIET" || t.state === "IMBALANCE_FORMING")
    .map((t) => t.symbol);

  const total = triggered.length + failed.length;
  const hitRate = total > 0 ? `${((triggered.length / total) * 100).toFixed(0)}%` : "N/A";

  // Week ahead
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const weekAhead = currentSnapshot.calendar.filter(
    (e) => new Date(e.date) <= nextWeek
  );

  // Key takeaways
  const takeaways: string[] = [];

  if (regime.level === "RISK_OFF") {
    takeaways.push("Regime is RISK_OFF — no new entries. Review open positions for exits.");
  } else if (regime.level === "RISK_ON") {
    takeaways.push("Regime is RISK_ON — full watchlist eligible for setups.");
  }

  const quietTokens = currentSnapshot.tokens.filter((t) => t.state === "QUIET");
  if (quietTokens.length > 0) {
    takeaways.push(
      `${quietTokens.length} token(s) in QUIET compression: ${quietTokens.map((t) => t.symbol).slice(0, 5).join(", ")}. Watch for breakout.`
    );
  }

  const confirmedTokens = currentSnapshot.tokens.filter((t) => t.state === "IMBALANCE_CONFIRMED");
  if (confirmedTokens.length > 0) {
    takeaways.push(
      `ACTIVE SETUPS: ${confirmedTokens.map((t) => t.symbol).join(", ")}. Check stops and position sizing.`
    );
  }

  const highImportanceEvents = weekAhead.filter((e) => e.importance === "high");
  if (highImportanceEvents.length > 0) {
    takeaways.push(
      `${highImportanceEvents.length} high-importance event(s) this week: ${highImportanceEvents.map((e) => e.name).join(", ")}. Reduce risk ahead of FOMC/CPI.`
    );
  }

  const macro: any = currentSnapshot.macro;
  const degradedCount = [
    macro.dxy,
    macro.netLiquidity,
    macro.stablecoinDelta,
    macro.us10y,
    macro.realYield,
    macro.hySpread,
    macro.btcDominance,
  ].filter((v: any) => v?.status === "DEGRADED").length;
  if (degradedCount > 1) {
    takeaways.push(
      `${degradedCount} data sources degraded. Add FRED_API_KEY and paid API keys for full coverage.`
    );
  }

  return {
    generatedAt: now,
    regimeRecap,
    setupSummary: {
      triggered,
      failed,
      watching,
      hitRate,
    },
    weekAhead,
    keyTakeaways: takeaways,
  };
}

export function formatDigestText(digest: WeeklyDigest): string {
  let text = `# Weekly Regime Digest\n`;
  text += `Generated: ${new Date(digest.generatedAt).toLocaleDateString()}\n\n`;

  text += `## Regime Recap\n${digest.regimeRecap}\n\n`;

  text += `## Setup Summary\n`;
  text += `- Triggered: ${digest.setupSummary.triggered.length > 0 ? digest.setupSummary.triggered.join(", ") : "none"}\n`;
  text += `- Failed: ${digest.setupSummary.failed.length > 0 ? digest.setupSummary.failed.join(", ") : "none"}\n`;
  text += `- Watching: ${digest.setupSummary.watching.length > 0 ? digest.setupSummary.watching.join(", ") : "none"}\n`;
  text += `- Hit Rate: ${digest.setupSummary.hitRate}\n\n`;

  text += `## Week Ahead\n`;
  for (const evt of digest.weekAhead) {
    text += `- ${evt.date} — ${evt.name} (${evt.importance})\n`;
  }

  text += `\n## Key Takeaways\n`;
  for (const t of digest.keyTakeaways) {
    text += `- ${t}\n`;
  }

  return text;
}
