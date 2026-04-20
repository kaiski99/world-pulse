// ─── Regime Tracker Types (V2) ───

export type RegimeLevel = "RISK_ON" | "NEUTRAL" | "RISK_OFF";

export type TokenState =
  | "QUIET"
  | "IMBALANCE_FORMING"
  | "IMBALANCE_CONFIRMED"
  | "TREND_RIDE"
  | "DIP_BUY"
  | "EXTENDED"
  | "INVALID";

export type DataStatus = "LIVE" | "DEGRADED" | "UNAVAILABLE";

// ─── Macro Data ───

export interface MacroDataPoint {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePct?: number;
  unit: string;
  source: string;
  status: DataStatus;
  fetchedAt: string;
}

/**
 * V2: 3 regime-scored data points + optional context-only fields.
 * Dropped: equities, commodities, IG spread, global M2, US 2Y, fed funds.
 */
export interface MacroSnapshot {
  fetchedAt: string;

  // Regime-scored (feed the 3-component score)
  dxy: MacroDataPoint;             // Frankfurter basket proxy
  netLiquidity: MacroDataPoint;    // FRED: WALCL - RRPONTSYD - WTREGEN
  stablecoinDelta: MacroDataPoint; // DeFiLlama 24h delta

  // Context-only (displayed, not scored)
  us10y?: MacroDataPoint;
  realYield?: MacroDataPoint;
  hySpread?: MacroDataPoint;
  btcDominance?: MacroDataPoint;

  // FRED sub-components for the net-liquidity breakdown
  fedBalanceSheet?: MacroDataPoint;
  rrp?: MacroDataPoint;
  tga?: MacroDataPoint;

  // FX context
  usdjpy?: MacroDataPoint;
  eurusd?: MacroDataPoint;
}

export interface MacroEvent {
  date: string;
  name: string;
  type: "CPI" | "NFP" | "FOMC" | "PCE" | "GDP" | "ECB" | "BOJ" | "PBOC" | "OTHER";
  importance: "high" | "medium" | "low";
  consensus?: string;
  previous?: string;
  actual?: string;
}

// ─── Regime (V2: 3 components) ───

export interface RegimeSnapshot {
  score: number;     // 0-100
  level: RegimeLevel;
  components: {
    dxyTrend: number;       // 0-33
    netLiquidity: number;   // 0-33
    stablecoinFlow: number; // 0-34
  };
  previousScore?: number;
  changedAt?: string;
  updatedAt: string;
}

// ─── Token / Crypto Layer (V2) ───

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  weeklyCandles: OHLCV[];
  dailyCandles: OHLCV[];
  sma30w?: number;
  sma50w?: number;        // V2: for DIP_BUY support zone
  atr14?: number;
  rangeCompression?: number;
  rsi14?: number;         // V2: for DIP_BUY oversold detection
  maSlope4w?: number;     // V2: for TREND_RIDE acceleration
  maSlopePrev?: number;   // V2: prior slope for acceleration check
  fundingRate?: number;
  status: DataStatus;
  fetchedAt: string;
}

// ─── State Machine (V2) ───

export interface TokenStateRecord {
  tokenId: string;
  symbol: string;
  state: TokenState;
  previousState?: TokenState;
  stateChangedAt: string;
  daysInState: number;

  quietScore: {
    rangeCompression: number;
    maFlatness: number;
    volPercentile: number;
    total: number;
    passing: boolean;
  };

  triggerConditions: {
    breakoutAboveRange: boolean;
    candleSizeAboveAvg: boolean;
    priceAbove30wMa: boolean;
    regimeNotRiskOff: boolean;
    allMet: boolean;
  };

  // V2 flags that drove state selection (for display)
  signals: {
    trendRide: boolean;  // >30% above MA + slope accelerating
    dipBuy: boolean;     // below MA but above 50W MA + oversold
    extended: boolean;   // >30% above MA + slope flattening
  };

  disqualifiers: {
    alreadyPrinted: boolean;
    any: boolean;
  };

  distanceTo30wMaPct: number;
  suggestedStop?: number;
  suggestedSizePct?: number;

  updatedAt: string;
}

// ─── Crypto Flows (V2: only stablecoin delta kept) ───

export interface CryptoFlows {
  stablecoinSupplyDelta?: MacroDataPoint;
  status: DataStatus;
  fetchedAt: string;
}

// ─── Event Log ───

export interface TrackerEvent {
  id: string;
  timestamp: string;
  type: "regime_flip" | "state_transition" | "macro_surprise" | "disqualifier_appeared";
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  tokenId?: string;
}

// ─── Master Tracker Snapshot ───

export interface TrackerSnapshot {
  id: string;
  fetchedAt: string;
  macro: MacroSnapshot;
  regime: RegimeSnapshot;
  tokens: TokenStateRecord[];
  cryptoFlows: CryptoFlows;
  events: TrackerEvent[];
  calendar: MacroEvent[];
  watchlist: string[];
}
