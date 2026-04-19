import { MacroSnapshot, RegimeSnapshot, RegimeLevel } from "./types";

// Regime score: 0–100 composite from 5 components.
// Each component maps a macro indicator to a 0–20 sub-score.
// >70 = RISK_ON, 40–70 = NEUTRAL, <40 = RISK_OFF.

interface ComponentScorer {
  (macro: MacroSnapshot): number;
}

// 1. Net Liquidity Trend (0–20)
// Rising net liquidity = bullish for risk assets.
// Change > +1% = 20, flat = 10, falling > -1% = 0.
function scoreNetLiquidity(macro: MacroSnapshot): number {
  const nl = macro.liquidity.netLiquidity;
  if (nl.status !== "LIVE" || nl.previousValue == null) return 10;
  const changePct = nl.changePct ?? 0;
  if (changePct > 1) return 20;
  if (changePct > 0.5) return 17;
  if (changePct > 0) return 13;
  if (changePct > -0.5) return 8;
  if (changePct > -1) return 4;
  return 0;
}

// 2. DXY Trend (0–20)
// Falling DXY = bullish for crypto. Inverted: strong dollar = risk off.
function scoreDxy(macro: MacroSnapshot): number {
  const dxy = macro.fx.dxy;
  if (dxy.status !== "LIVE") return 10;
  const val = dxy.value;
  // DXY < 96 = very weak dollar (risk on), > 108 = strong (risk off)
  if (val < 96) return 20;
  if (val < 100) return 16;
  if (val < 103) return 12;
  if (val < 106) return 8;
  if (val < 108) return 4;
  return 0;
}

// 3. Real Yields (0–20)
// Lower/negative real yields = bullish for crypto.
function scoreRealYields(macro: MacroSnapshot): number {
  const ry = macro.rates.realYield;
  if (ry.status !== "LIVE") return 10;
  const val = ry.value;
  if (val < 0) return 20;
  if (val < 0.5) return 16;
  if (val < 1.0) return 12;
  if (val < 1.5) return 8;
  if (val < 2.0) return 4;
  return 0;
}

// 4. HY Spreads (0–20)
// Tight spreads = risk on. Wide spreads = stress.
function scoreHySpread(macro: MacroSnapshot): number {
  const hy = macro.credit.hySpread;
  if (hy.status !== "LIVE") return 10;
  const val = hy.value;
  // OAS in bps: < 300 = tight, > 600 = stress
  if (val < 300) return 20;
  if (val < 350) return 16;
  if (val < 400) return 12;
  if (val < 500) return 8;
  if (val < 600) return 4;
  return 0;
}

// 5. VIX (0–20)
// Low VIX = calm = risk on. VIX > 30 = panic.
function scoreVix(macro: MacroSnapshot): number {
  const vix = macro.equities.vix;
  if (vix.status !== "LIVE") return 10;
  const val = vix.value;
  if (val < 15) return 20;
  if (val < 18) return 16;
  if (val < 22) return 12;
  if (val < 28) return 8;
  if (val < 35) return 4;
  return 0;
}

const SCORERS: ComponentScorer[] = [
  scoreNetLiquidity,
  scoreDxy,
  scoreRealYields,
  scoreHySpread,
  scoreVix,
];

function regimeLevel(score: number): RegimeLevel {
  if (score > 70) return "RISK_ON";
  if (score >= 40) return "NEUTRAL";
  return "RISK_OFF";
}

export function computeRegime(
  macro: MacroSnapshot,
  previousRegime?: RegimeSnapshot
): RegimeSnapshot {
  const components = {
    netLiquidityTrend: scoreNetLiquidity(macro),
    dxyTrend: scoreDxy(macro),
    realYields: scoreRealYields(macro),
    hySpread: scoreHySpread(macro),
    vix: scoreVix(macro),
  };

  const score = Object.values(components).reduce((a, b) => a + b, 0);
  const level = regimeLevel(score);

  const now = new Date().toISOString();
  const changedAt =
    previousRegime && previousRegime.level !== level
      ? now
      : previousRegime?.changedAt;

  return {
    score,
    level,
    components,
    previousScore: previousRegime?.score,
    changedAt,
    updatedAt: now,
  };
}
