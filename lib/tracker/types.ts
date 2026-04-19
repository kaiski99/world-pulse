// ─── Regime Tracker Types ───

export type RegimeLevel = "RISK_ON" | "NEUTRAL" | "RISK_OFF";

export type TokenState =
  | "QUIET"
  | "IMBALANCE_FORMING"
  | "IMBALANCE_CONFIRMED"
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

export interface MacroSnapshot {
  fetchedAt: string;

  rates: {
    us2y: MacroDataPoint;
    us10y: MacroDataPoint;
    realYield: MacroDataPoint;
    fedFundsRate: MacroDataPoint;
  };

  fx: {
    dxy: MacroDataPoint;
    usdjpy: MacroDataPoint;
    usdcnh: MacroDataPoint;
    eurusd: MacroDataPoint;
  };

  equities: {
    spx: MacroDataPoint;
    ndx: MacroDataPoint;
    vix: MacroDataPoint;
    move: MacroDataPoint;
  };

  commodities: {
    gold: MacroDataPoint;
    wti: MacroDataPoint;
    copper: MacroDataPoint;
  };

  credit: {
    hySpread: MacroDataPoint;
    igSpread: MacroDataPoint;
  };

  liquidity: {
    fedBalanceSheet: MacroDataPoint;
    rrp: MacroDataPoint;
    tga: MacroDataPoint;
    netLiquidity: MacroDataPoint;
    globalM2: MacroDataPoint;
  };
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

// ─── Regime ───

export interface RegimeSnapshot {
  score: number;
  level: RegimeLevel;
  components: {
    netLiquidityTrend: number;
    dxyTrend: number;
    realYields: number;
    hySpread: number;
    vix: number;
  };
  previousScore?: number;
  changedAt?: string;
  updatedAt: string;
}

// ─── Token / Crypto Layer ───

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
  atr14?: number;
  rangeCompression?: number;
  socialVolume?: number;
  socialSentiment?: number;
  fundingRate?: number;
  openInterest?: number;
  longShortRatio?: number;
  exchangeNetflow?: number;
  status: DataStatus;
  fetchedAt: string;
}

// ─── State Machine ───

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
    socialQuiet: number;
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

  disqualifiers: {
    extendedAboveMa: boolean;
    socialSpike: boolean;
    alreadyPrinted: boolean;
    any: boolean;
  };

  distanceTo30wMaPct: number;
  suggestedStop?: number;
  suggestedSizePct?: number;

  updatedAt: string;
}

// ─── Crypto Flows ───

export interface CryptoFlows {
  spotCexNetflow?: MacroDataPoint;
  stablecoinSupplyDelta?: MacroDataPoint;
  btcEtfFlow?: MacroDataPoint;
  ethEtfFlow?: MacroDataPoint;
  exchangeReserves?: MacroDataPoint;
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
