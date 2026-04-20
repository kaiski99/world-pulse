import {
  TokenData,
  TokenState,
  TokenStateRecord,
  RegimeSnapshot,
  TrackerEvent,
} from "./types";

// ─── Thresholds (V2) ──────────────────────────────────────────────────

const RANGE_CANDLES = 15;
const CANDLE_SIZE_MULT = 1.5;
const EXTENDED_MA_PCT = 30;          // >30% above 30W MA triggers TREND_RIDE/EXTENDED branch
const TREND_RIDE_MIN_SLOPE = 3;      // 4w slope must be >3% for TREND_RIDE
const DIP_BUY_MAX_DROP_PCT = 10;     // price within 10% below 30W MA
const DIP_BUY_RSI_MAX = 35;
const PRINTED_EXPIRY_DAYS = 3;

// ─── Quiet Score (V2: 3 sub-scores, max 75) ───────────────────────────

function rangeCompressionScore(token: TokenData): number {
  const rc = token.rangeCompression ?? 100;
  if (rc <= 5) return 25;
  if (rc <= 8) return 20;
  if (rc <= 15) return 15;
  if (rc <= 20) return 8;
  return 0;
}

function maFlatnessScore(token: TokenData): number {
  if (token.maSlope4w == null) return 12;
  const slope = token.maSlope4w;
  if (slope > -2 && slope < 5) return 25;
  if (slope >= 5) return 20;
  if (slope > -5) return 10;
  return 0;
}

function volPercentileScore(token: TokenData): number {
  if (!token.atr14 || token.price <= 0) return 12;
  const atrPct = (token.atr14 / token.price) * 100;
  if (atrPct < 2) return 25;
  if (atrPct < 3) return 20;
  if (atrPct < 5) return 15;
  if (atrPct < 8) return 8;
  return 0;
}

function computeQuietScore(token: TokenData) {
  const rc = rangeCompressionScore(token);
  const mf = maFlatnessScore(token);
  const vp = volPercentileScore(token);
  const total = rc + mf + vp;
  // Passing threshold: 45/75 (60% of 3 subscores) with no single zero
  return {
    rangeCompression: rc,
    maFlatness: mf,
    volPercentile: vp,
    total,
    passing: rc >= 15 && mf >= 10 && vp >= 8 && total >= 45,
  };
}

// ─── Kotegawa Triggers ────────────────────────────────────────────────

function checkTriggerConditions(token: TokenData, regime: RegimeSnapshot) {
  const candles = token.dailyCandles;
  if (candles.length < RANGE_CANDLES + 1) {
    return {
      breakoutAboveRange: false,
      candleSizeAboveAvg: false,
      priceAbove30wMa: false,
      regimeNotRiskOff: regime.level !== "RISK_OFF",
      allMet: false,
    };
  }

  const rangeCandles = candles.slice(-(RANGE_CANDLES + 1), -1);
  const latest = candles[candles.length - 1];
  const rangeHigh = Math.max(...rangeCandles.map((c) => c.high));
  const avgCandleSize =
    rangeCandles.reduce((s, c) => s + Math.abs(c.close - c.open), 0) /
    rangeCandles.length;
  const latestCandleSize = Math.abs(latest.close - latest.open);

  const breakoutAboveRange = latest.close > rangeHigh;
  const candleSizeAboveAvg = latestCandleSize > avgCandleSize * CANDLE_SIZE_MULT;
  const priceAbove30wMa = token.sma30w ? token.price > token.sma30w : false;
  const regimeNotRiskOff = regime.level !== "RISK_OFF";

  return {
    breakoutAboveRange,
    candleSizeAboveAvg,
    priceAbove30wMa,
    regimeNotRiskOff,
    allMet:
      breakoutAboveRange && candleSizeAboveAvg && priceAbove30wMa && regimeNotRiskOff,
  };
}

// ─── V2 Signal Flags ──────────────────────────────────────────────────

function computeDistanceToMA(token: TokenData): number {
  if (!token.sma30w || token.sma30w === 0) return 0;
  return ((token.price - token.sma30w) / token.sma30w) * 100;
}

function isTrendRide(token: TokenData, regime: RegimeSnapshot): boolean {
  const dist = computeDistanceToMA(token);
  if (dist <= EXTENDED_MA_PCT) return false;
  if (regime.level === "RISK_OFF") return false;
  if (token.maSlope4w == null || token.maSlopePrev == null) return false;
  // Slope positive and still accelerating
  return token.maSlope4w > TREND_RIDE_MIN_SLOPE && token.maSlope4w >= token.maSlopePrev;
}

function isExtended(token: TokenData): boolean {
  const dist = computeDistanceToMA(token);
  if (dist <= EXTENDED_MA_PCT) return false;
  if (token.maSlope4w == null) return true; // no slope data, default to EXTENDED
  // Slope flattening or negative
  if (token.maSlope4w < TREND_RIDE_MIN_SLOPE) return true;
  if (token.maSlopePrev != null && token.maSlope4w < token.maSlopePrev) return true;
  return false;
}

function isDipBuy(token: TokenData, regime: RegimeSnapshot): boolean {
  if (regime.level === "RISK_OFF") return false;
  if (!token.sma30w) return false;
  const dist = computeDistanceToMA(token);
  if (dist >= 0) return false; // must be below 30W MA
  if (dist < -DIP_BUY_MAX_DROP_PCT) {
    // More than 10% below 30W MA — check if still above 50W MA (longer-term support)
    if (!token.sma50w || token.price < token.sma50w) return false;
  }
  // Oversold signal: RSI < 35 OR recent candle rejection (close near high of the day)
  if (token.rsi14 != null && token.rsi14 < DIP_BUY_RSI_MAX) return true;
  const candles = token.dailyCandles;
  if (candles.length >= 2) {
    const c = candles[candles.length - 1];
    const wickBottom = c.low;
    const body = Math.abs(c.close - c.open);
    const lowerWick = Math.min(c.open, c.close) - wickBottom;
    // Rejection wick: lower wick > 2x body and close in upper half of range
    if (lowerWick > body * 2 && c.close > (c.high + c.low) / 2) return true;
  }
  return false;
}

// ─── Position Sizing ──────────────────────────────────────────────────

function computeStopAndSize(
  token: TokenData,
  state: TokenState,
  portfolioValue = 100_000
): { stop?: number; sizePct?: number } {
  const candles = token.dailyCandles;
  if (candles.length < 2 || token.price <= 0) return {};

  let stop: number;
  let riskPct: number;

  if (state === "TREND_RIDE") {
    // Tighter: 20-day low or last 5-day low whichever is closer
    const last20 = candles.slice(-20);
    stop = Math.min(...last20.map((c) => c.low));
    riskPct = 0.005; // 0.5% risk
  } else if (state === "DIP_BUY") {
    // Stop below recent swing low (last 10 candles)
    const last10 = candles.slice(-10);
    stop = Math.min(...last10.map((c) => c.low));
    riskPct = 0.01;
  } else if (state === "IMBALANCE_CONFIRMED" || state === "IMBALANCE_FORMING") {
    const breakoutCandle = candles[candles.length - 1];
    stop = breakoutCandle.low;
    riskPct = 0.01;
  } else {
    return {};
  }

  const riskPerUnit = token.price - stop;
  if (riskPerUnit <= 0) return { stop, sizePct: 0 };
  const riskAmount = portfolioValue * riskPct;
  const units = riskAmount / riskPerUnit;
  const positionValue = units * token.price;
  const sizePct = (positionValue / portfolioValue) * 100;
  return { stop, sizePct: Math.min(sizePct, 25) };
}

// ─── State Selection (V2 priority order) ──────────────────────────────

function determineState(
  token: TokenData,
  regime: RegimeSnapshot,
  prev: TokenStateRecord | undefined,
  triggers: ReturnType<typeof checkTriggerConditions>,
  quietScore: ReturnType<typeof computeQuietScore>,
  signals: { trendRide: boolean; dipBuy: boolean; extended: boolean },
  alreadyPrinted: boolean
): TokenState {
  if (token.dailyCandles.length < RANGE_CANDLES + 1) return "INVALID";
  if (alreadyPrinted) return "INVALID";

  // TREND_RIDE takes priority when price is extended but trend accelerating
  if (signals.trendRide) return "TREND_RIDE";
  if (signals.extended) return "EXTENDED";

  // Breakout setups (above MA)
  if (triggers.allMet) return "IMBALANCE_CONFIRMED";
  if (
    triggers.breakoutAboveRange &&
    triggers.priceAbove30wMa &&
    triggers.regimeNotRiskOff
  ) {
    return "IMBALANCE_FORMING";
  }

  // Mean-reversion setups (below MA)
  if (signals.dipBuy) return "DIP_BUY";

  // Quiet range compression
  if (quietScore.passing) return "QUIET";

  return "INVALID";
}

// ─── Main: Evaluate All Tokens ────────────────────────────────────────

export function evaluateTokens(
  tokens: TokenData[],
  regime: RegimeSnapshot,
  previousStates?: Map<string, TokenStateRecord>
): { states: TokenStateRecord[]; events: TrackerEvent[] } {
  const states: TokenStateRecord[] = [];
  const events: TrackerEvent[] = [];
  const now = new Date().toISOString();

  for (const token of tokens) {
    const prev = previousStates?.get(token.id);

    const quietScore = computeQuietScore(token);
    const triggers = checkTriggerConditions(token, regime);
    const trendRide = isTrendRide(token, regime);
    const extended = !trendRide && isExtended(token);
    const dipBuy = !trendRide && !extended && isDipBuy(token, regime);

    const alreadyPrinted =
      !!prev &&
      prev.state === "IMBALANCE_CONFIRMED" &&
      prev.daysInState > PRINTED_EXPIRY_DAYS;

    const signals = { trendRide, dipBuy, extended };
    const newState = determineState(
      token,
      regime,
      prev,
      triggers,
      quietScore,
      signals,
      alreadyPrinted
    );

    const { stop, sizePct } = computeStopAndSize(token, newState);
    const daysInState = prev && prev.state === newState ? prev.daysInState + 1 : 0;

    const record: TokenStateRecord = {
      tokenId: token.id,
      symbol: token.symbol,
      state: newState,
      previousState: prev?.state,
      stateChangedAt:
        prev && prev.state === newState ? prev.stateChangedAt : now,
      daysInState,
      quietScore,
      triggerConditions: triggers,
      signals,
      disqualifiers: { alreadyPrinted, any: alreadyPrinted },
      distanceTo30wMaPct: computeDistanceToMA(token),
      suggestedStop: stop,
      suggestedSizePct: sizePct,
      updatedAt: now,
    };

    states.push(record);

    if (prev && prev.state !== newState) {
      const severity: "critical" | "warning" | "info" =
        newState === "IMBALANCE_CONFIRMED" || newState === "TREND_RIDE"
          ? "critical"
          : newState === "DIP_BUY"
            ? "warning"
            : "info";

      events.push({
        id: `evt-${token.id}-${Date.now()}`,
        timestamp: now,
        type: "state_transition",
        title: `${token.symbol}: ${prev.state} → ${newState}`,
        detail: buildTransitionDetail(token, prev.state, newState),
        severity,
        tokenId: token.id,
      });
    }
  }

  return { states, events };
}

function buildTransitionDetail(token: TokenData, from: TokenState, to: TokenState): string {
  const price = token.price.toFixed(2);
  const ma = token.sma30w?.toFixed(2) ?? "N/A";
  switch (to) {
    case "IMBALANCE_CONFIRMED":
      return `${token.symbol} breakout confirmed at $${price} (30W MA $${ma}). Setup live.`;
    case "TREND_RIDE":
      return `${token.symbol} trend accelerating above MA ($${price}, slope ${token.maSlope4w?.toFixed(1)}%). Tight-stop entry.`;
    case "DIP_BUY":
      return `${token.symbol} dip-buy zone at $${price} (RSI ${token.rsi14?.toFixed(0)}). Mean-reversion setup.`;
    case "EXTENDED":
      return `${token.symbol} extended above MA with slope flattening. No new entries.`;
    case "QUIET":
      return `${token.symbol} entering quiet range compression. Watching for breakout.`;
    case "INVALID":
      return `${token.symbol} transitioned from ${from} to INVALID.`;
    default:
      return `${token.symbol} transitioned from ${from} to ${to}.`;
  }
}

// ─── Regime Flip Event ────────────────────────────────────────────────

export function checkRegimeFlip(
  current: RegimeSnapshot,
  previous?: RegimeSnapshot
): TrackerEvent | null {
  if (!previous || previous.level === current.level) return null;
  return {
    id: `evt-regime-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "regime_flip",
    title: `Regime: ${previous.level} → ${current.level}`,
    detail: `Score changed ${previous.score} → ${current.score}. ${
      current.level === "RISK_OFF"
        ? "No new entries. Flag exits on open positions."
        : current.level === "RISK_ON"
          ? "Full watchlist eligible."
          : "Only majors eligible."
    }`,
    severity: current.level === "RISK_OFF" ? "critical" : "warning",
  };
}
