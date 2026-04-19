import {
  TokenData,
  TokenState,
  TokenStateRecord,
  RegimeSnapshot,
  TrackerEvent,
} from "./types";

// ─── Thresholds (methodology-derived) ───

const RANGE_CANDLES = 15;
const CANDLE_SIZE_MULT = 1.5;
const EXTENDED_MA_PCT = 30;
const SOCIAL_SPIKE_MULT = 3.0;
const PRINTED_EXPIRY_DAYS = 3;
const QUIET_RANGE_MAX_PCT = 15;

// ─── Quiet Score Components ───

function rangeCompressionScore(token: TokenData): number {
  // 0–25: lower range = more compressed = higher score
  const rc = token.rangeCompression ?? 100;
  if (rc <= 5) return 25;
  if (rc <= 8) return 20;
  if (rc <= QUIET_RANGE_MAX_PCT) return 15;
  if (rc <= 20) return 8;
  return 0;
}

function maFlatnessScore(token: TokenData): number {
  // 30W MA not falling: slope near zero or positive = score 25
  if (!token.sma30w || token.weeklyCandles.length < 4) return 12;

  const recent4 = token.weeklyCandles.slice(-4);
  const smaValues = recent4.map((c) => c.close);
  const first = smaValues[0];
  const last = smaValues[smaValues.length - 1];
  const slopePct = first > 0 ? ((last - first) / first) * 100 : 0;

  if (slopePct > -2 && slopePct < 5) return 25; // flat to gently rising
  if (slopePct >= 5) return 20; // rising (OK but already trending)
  if (slopePct > -5) return 10; // slightly falling
  return 0; // clearly falling — disqualified from QUIET
}

function volPercentileScore(token: TokenData): number {
  // Low ATR relative to price = quiet. ATR/price < 2% = max score.
  if (!token.atr14 || token.price <= 0) return 12;
  const atrPct = (token.atr14 / token.price) * 100;
  if (atrPct < 2) return 25;
  if (atrPct < 3) return 20;
  if (atrPct < 5) return 15;
  if (atrPct < 8) return 8;
  return 0;
}

function socialQuietScore(token: TokenData): number {
  // No social data = neutral. Low social = quiet. High = noisy.
  if (token.socialVolume == null) return 15; // degraded — assume quiet
  if (token.socialVolume < 100) return 25;
  if (token.socialVolume < 500) return 20;
  if (token.socialVolume < 1000) return 15;
  if (token.socialVolume < 3000) return 8;
  return 0;
}

function computeQuietScore(token: TokenData) {
  const rc = rangeCompressionScore(token);
  const mf = maFlatnessScore(token);
  const vp = volPercentileScore(token);
  const sq = socialQuietScore(token);
  const total = rc + mf + vp + sq;
  return {
    rangeCompression: rc,
    maFlatness: mf,
    volPercentile: vp,
    socialQuiet: sq,
    total,
    passing: rc >= 15 && mf >= 10 && vp >= 8 && total >= 60,
  };
}

// ─── Trigger Conditions ───

function checkTriggerConditions(
  token: TokenData,
  regime: RegimeSnapshot
) {
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
  const latestCandle = candles[candles.length - 1];

  const rangeHigh = Math.max(...rangeCandles.map((c) => c.high));
  const avgCandleSize =
    rangeCandles.reduce((s, c) => s + Math.abs(c.close - c.open), 0) /
    rangeCandles.length;
  const latestCandleSize = Math.abs(latestCandle.close - latestCandle.open);

  // CLOSE above range (not wicks)
  const breakoutAboveRange = latestCandle.close > rangeHigh;
  const candleSizeAboveAvg = latestCandleSize > avgCandleSize * CANDLE_SIZE_MULT;
  const priceAbove30wMa = token.sma30w ? token.price > token.sma30w : false;
  const regimeNotRiskOff = regime.level !== "RISK_OFF";

  return {
    breakoutAboveRange,
    candleSizeAboveAvg,
    priceAbove30wMa,
    regimeNotRiskOff,
    allMet:
      breakoutAboveRange &&
      candleSizeAboveAvg &&
      priceAbove30wMa &&
      regimeNotRiskOff,
  };
}

// ─── Disqualifiers ───

function checkDisqualifiers(
  token: TokenData,
  currentState: TokenStateRecord | undefined
) {
  const extendedAboveMa =
    token.sma30w != null && token.price > 0
      ? ((token.price - token.sma30w) / token.sma30w) * 100 > EXTENDED_MA_PCT
      : false;

  const socialSpike =
    token.socialVolume != null && token.socialVolume > 3000;

  const alreadyPrinted =
    currentState?.state === "IMBALANCE_CONFIRMED" &&
    currentState.daysInState > PRINTED_EXPIRY_DAYS;

  return {
    extendedAboveMa,
    socialSpike,
    alreadyPrinted: !!alreadyPrinted,
    any: extendedAboveMa || socialSpike || !!alreadyPrinted,
  };
}

// ─── Distance to 30W MA ───

function distanceTo30wMa(token: TokenData): number {
  if (!token.sma30w || token.sma30w === 0) return 0;
  return ((token.price - token.sma30w) / token.sma30w) * 100;
}

// ─── Stop & Size ───

function computeStopAndSize(
  token: TokenData,
  portfolioValue: number = 100_000
) {
  const candles = token.dailyCandles;
  if (candles.length < 2 || token.price <= 0) {
    return { stop: undefined, sizePct: undefined };
  }

  const breakoutCandle = candles[candles.length - 1];
  const stop = breakoutCandle.low;
  const riskPerUnit = token.price - stop;

  if (riskPerUnit <= 0) return { stop, sizePct: 0 };

  const riskAmount = portfolioValue * 0.01; // 1% risk
  const units = riskAmount / riskPerUnit;
  const positionValue = units * token.price;
  const sizePct = (positionValue / portfolioValue) * 100;

  return { stop, sizePct: Math.min(sizePct, 25) }; // cap at 25% of portfolio
}

// ─── State Transition Logic ───

function determineState(
  token: TokenData,
  regime: RegimeSnapshot,
  prev?: TokenStateRecord
): TokenState {
  const quietScore = computeQuietScore(token);
  const triggers = checkTriggerConditions(token, regime);
  const disqual = checkDisqualifiers(token, prev);

  if (disqual.any) return "INVALID";

  if (triggers.allMet) return "IMBALANCE_CONFIRMED";

  // Partial trigger conditions met
  if (
    triggers.breakoutAboveRange &&
    triggers.priceAbove30wMa &&
    triggers.regimeNotRiskOff
  ) {
    return "IMBALANCE_FORMING";
  }

  // Check if extended
  if (token.sma30w && ((token.price - token.sma30w) / token.sma30w) * 100 > EXTENDED_MA_PCT) {
    return "EXTENDED";
  }

  if (quietScore.passing) return "QUIET";

  return "INVALID";
}

// ─── Main: Evaluate All Tokens ───

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
    const newState = determineState(token, regime, prev);

    const quietScore = computeQuietScore(token);
    const triggers = checkTriggerConditions(token, regime);
    const disqual = checkDisqualifiers(token, prev);
    const { stop, sizePct } = computeStopAndSize(token);

    const daysInState =
      prev && prev.state === newState
        ? prev.daysInState + 1
        : 0;

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
      disqualifiers: disqual,
      distanceTo30wMaPct: distanceTo30wMa(token),
      suggestedStop: stop,
      suggestedSizePct: sizePct,
      updatedAt: now,
    };

    states.push(record);

    // Generate events on state transitions
    if (prev && prev.state !== newState) {
      const severity =
        newState === "IMBALANCE_CONFIRMED"
          ? "critical"
          : newState === "INVALID" && prev.state === "IMBALANCE_CONFIRMED"
            ? "warning"
            : "info";

      events.push({
        id: `evt-${token.id}-${Date.now()}`,
        timestamp: now,
        type: "state_transition",
        title: `${token.symbol}: ${prev.state} → ${newState}`,
        detail: buildTransitionDetail(token, prev.state, newState, disqual),
        severity,
        tokenId: token.id,
      });
    }
  }

  return { states, events };
}

function buildTransitionDetail(
  token: TokenData,
  from: TokenState,
  to: TokenState,
  disqual: ReturnType<typeof checkDisqualifiers>
): string {
  if (to === "IMBALANCE_CONFIRMED") {
    return `${token.symbol} breakout confirmed at $${token.price.toFixed(2)}. Price above 30W MA ($${token.sma30w?.toFixed(2) ?? "N/A"}). Setup is live.`;
  }
  if (to === "INVALID" && disqual.socialSpike) {
    return `${token.symbol} disqualified: social media spike detected.`;
  }
  if (to === "INVALID" && disqual.extendedAboveMa) {
    return `${token.symbol} disqualified: price extended >${EXTENDED_MA_PCT}% above 30W MA.`;
  }
  if (to === "INVALID" && disqual.alreadyPrinted) {
    return `${token.symbol} disqualified: setup already printed >${PRINTED_EXPIRY_DAYS} days ago.`;
  }
  if (to === "QUIET") {
    return `${token.symbol} entering quiet range compression. Watching for breakout.`;
  }
  return `${token.symbol} transitioned from ${from} to ${to}.`;
}

// ─── Regime Flip Event ───

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
    detail: `Score changed from ${previous.score} to ${current.score}. ${
      current.level === "RISK_OFF"
        ? "No new entries. Flag exits on open positions."
        : current.level === "RISK_ON"
          ? "Full watchlist eligible."
          : "Only majors eligible."
    }`,
    severity: current.level === "RISK_OFF" ? "critical" : "warning",
  };
}
