import { MacroSnapshot, RegimeSnapshot, RegimeLevel } from "./types";

// ─── V2 3-Component Regime Score ──────────────────────────────────────
// Dropped VIX, Real Yields, HY Spread — all were permanently degraded on
// free tier. New model: DXY (33) + Net Liquidity (33) + Stablecoin Flow (34).
// >66 = RISK_ON | 33-66 = NEUTRAL | <33 = RISK_OFF

function scoreDxy(value: number, status: string): number {
  if (status !== "LIVE" || value <= 0) return 17;
  if (value < 96) return 33;
  if (value < 100) return 26;
  if (value < 103) return 20;
  if (value < 106) return 13;
  if (value < 108) return 7;
  return 0;
}

function scoreNetLiquidity(changePct: number | undefined, status: string): number {
  if (status !== "LIVE" || changePct == null) return 17;
  if (changePct > 1) return 33;
  if (changePct > 0.5) return 26;
  if (changePct > -0.25) return 17;
  if (changePct > -1) return 7;
  return 0;
}

function scoreStablecoinFlow(delta: number, status: string): number {
  if (status !== "LIVE") return 17;
  if (delta > 500_000_000) return 34;
  if (delta > 100_000_000) return 27;
  if (delta > -100_000_000) return 17;
  if (delta > -500_000_000) return 7;
  return 0;
}

function scoreToLevel(score: number): RegimeLevel {
  if (score > 66) return "RISK_ON";
  if (score >= 33) return "NEUTRAL";
  return "RISK_OFF";
}

export function computeRegime(
  macro: MacroSnapshot,
  previous?: RegimeSnapshot
): RegimeSnapshot {
  const dxyComp = scoreDxy(macro.dxy.value, macro.dxy.status);
  const netLiqComp = scoreNetLiquidity(
    macro.netLiquidity.changePct,
    macro.netLiquidity.status
  );
  const stableComp = scoreStablecoinFlow(
    macro.stablecoinDelta.value,
    macro.stablecoinDelta.status
  );

  const score = dxyComp + netLiqComp + stableComp;
  const level = scoreToLevel(score);

  const now = new Date().toISOString();
  return {
    score,
    level,
    components: {
      dxyTrend: dxyComp,
      netLiquidity: netLiqComp,
      stablecoinFlow: stableComp,
    },
    previousScore: previous?.score,
    changedAt: previous && previous.level !== level ? now : previous?.changedAt,
    updatedAt: now,
  };
}
