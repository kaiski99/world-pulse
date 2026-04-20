import {
  MacroSnapshot,
  MacroDataPoint,
  MacroEvent,
  TokenData,
  CryptoFlows,
  OHLCV,
  DataStatus,
} from "./types";

// ─── OHLCV cache ──────────────────────────────────────────────────────
// In-memory cache (4h TTL). Survives across requests in dev; in Vercel
// serverless it survives within a warm lambda. Cold starts re-fetch.
const ohlcvCache = new Map<string, { data: OHLCV[]; fetchedAt: number }>();
const OHLCV_CACHE_TTL = 4 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────

function makePoint(
  id: string,
  name: string,
  value: number,
  unit: string,
  source: string,
  status: DataStatus = "LIVE",
  prev?: number
): MacroDataPoint {
  const change = prev != null ? value - prev : undefined;
  const changePct =
    prev != null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : undefined;
  return {
    id,
    name,
    value,
    previousValue: prev,
    change,
    changePct,
    unit,
    source,
    status,
    fetchedAt: new Date().toISOString(),
  };
}

function degraded(id: string, name: string, unit: string, source: string): MacroDataPoint {
  return makePoint(id, name, 0, unit, source, "DEGRADED");
}

async function fetchJSON(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// ─── FRED (St. Louis Fed) ─────────────────────────────────────────────
// Try native fetch first (works on Vercel), fall back to curl (works
// locally where Node's fetch has TLS issues with FRED).
async function fetchFRED(
  seriesId: string
): Promise<{ value: number; prev: number } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;

  function parse(data: any): { value: number; prev: number } | null {
    const obs = data?.observations;
    if (!obs || obs.length < 1) return null;
    const current = parseFloat(obs[0].value);
    const prev = obs.length > 1 ? parseFloat(obs[1].value) : current;
    if (isNaN(current)) return null;
    return { value: current, prev: isNaN(prev) ? current : prev };
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) return parse(await res.json());
  } catch {}

  try {
    const { execSync } = require("child_process");
    const result = execSync(`curl -s "${url}"`, { timeout: 15_000 });
    return parse(JSON.parse(result.toString()));
  } catch (e) {
    console.error(`[tracker/FRED] ${seriesId} failed:`, e);
    return null;
  }
}

// ─── Macro Data Fetcher (V2) ──────────────────────────────────────────

export async function fetchMacroData(): Promise<MacroSnapshot> {
  console.log("[tracker/data] Fetching macro (V2)...");

  const [
    fredUs10y,
    fredRealYield,
    fredHySpread,
    fredBalSheet,
    fredRrp,
    fredTga,
    fxData,
    stablecoinData,
    btcDominance,
  ] = await Promise.allSettled([
    fetchFRED("DGS10"),
    fetchFRED("DFII10"),
    fetchFRED("BAMLH0A0HYM2"),
    fetchFRED("WALCL"),
    fetchFRED("RRPONTSYD"),
    fetchFRED("WTREGEN"),
    fetchJSON("https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,GBP,CNY").catch(() => null),
    fetchStablecoinDelta(),
    fetchBtcDominance(),
  ]);

  const unwrap = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

  const us10yData = unwrap(fredUs10y);
  const realYieldData = unwrap(fredRealYield);
  const hyData = unwrap(fredHySpread);
  const balSheetData = unwrap(fredBalSheet);
  const rrpData = unwrap(fredRrp);
  const tgaData = unwrap(fredTga);
  const fx = unwrap(fxData);
  const stableDelta = unwrap(stablecoinData);
  const btcDom = unwrap(btcDominance);

  // DXY proxy from Frankfurter basket
  const fxRates = (fx as any)?.rates ?? {};
  let dxyValue = 0;
  let dxyStatus: DataStatus = "DEGRADED";
  if (fxRates.EUR && fxRates.JPY && fxRates.GBP) {
    const eurUsd = 1 / fxRates.EUR;
    const usdJpy = fxRates.JPY;
    const gbpUsd = 1 / fxRates.GBP;
    dxyValue =
      50.14348112 *
      Math.pow(eurUsd, -0.576) *
      Math.pow(usdJpy, 0.136) *
      Math.pow(gbpUsd, -0.119) *
      Math.pow(1 / (fxRates.CNY || 7.2), -0.1);
    dxyStatus = "LIVE";
  }

  // Net liquidity
  const netLiqValue =
    balSheetData && rrpData && tgaData
      ? balSheetData.value - rrpData.value - tgaData.value
      : 0;
  const netLiqPrev =
    balSheetData && rrpData && tgaData
      ? balSheetData.prev - rrpData.prev - tgaData.prev
      : 0;
  const netLiqStatus: DataStatus =
    balSheetData && rrpData && tgaData ? "LIVE" : "DEGRADED";

  const snapshot: MacroSnapshot = {
    fetchedAt: new Date().toISOString(),

    // Regime-scored
    dxy: makePoint("dxy", "DXY (proxy)", dxyValue, "index", "frankfurter", dxyStatus),
    netLiquidity:
      netLiqStatus === "LIVE"
        ? makePoint("net-liq", "Net Liquidity", netLiqValue, "$M", "FRED (WALCL-RRP-TGA)", "LIVE", netLiqPrev)
        : degraded("net-liq", "Net Liquidity", "$M", "FRED"),
    stablecoinDelta:
      stableDelta != null
        ? makePoint(
            "stable-delta",
            "Stablecoin 24h Δ",
            stableDelta.delta,
            "$",
            "defillama",
            "LIVE",
            0
          )
        : degraded("stable-delta", "Stablecoin 24h Δ", "$", "defillama"),

    // Context-only
    us10y: us10yData
      ? makePoint("us10y", "US 10Y Yield", us10yData.value, "%", "FRED", "LIVE", us10yData.prev)
      : undefined,
    realYield: realYieldData
      ? makePoint("real-yld", "10Y Real Yield", realYieldData.value, "%", "FRED", "LIVE", realYieldData.prev)
      : undefined,
    hySpread: hyData
      ? makePoint("hy-spread", "HY Spread (OAS)", hyData.value, "%", "FRED", "LIVE", hyData.prev)
      : undefined,
    btcDominance:
      btcDom != null
        ? makePoint("btc-d", "BTC Dominance", btcDom.value, "%", "coingecko", "LIVE", btcDom.prev)
        : undefined,

    fedBalanceSheet: balSheetData
      ? makePoint("fed-bs", "Fed Balance Sheet", balSheetData.value, "$M", "FRED", "LIVE", balSheetData.prev)
      : undefined,
    rrp: rrpData
      ? makePoint("rrp", "Reverse Repo", rrpData.value, "$M", "FRED", "LIVE", rrpData.prev)
      : undefined,
    tga: tgaData
      ? makePoint("tga", "Treasury General Acct", tgaData.value, "$M", "FRED", "LIVE", tgaData.prev)
      : undefined,

    usdjpy: fxRates.JPY
      ? makePoint("usdjpy", "USD/JPY", fxRates.JPY, "JPY", "frankfurter", "LIVE")
      : undefined,
    eurusd: fxRates.EUR
      ? makePoint("eurusd", "EUR/USD", 1 / fxRates.EUR, "EUR", "frankfurter", "LIVE")
      : undefined,
  };

  console.log("[tracker/data] Macro V2 complete.");
  return snapshot;
}

// ─── Stablecoin supply delta (DeFiLlama) ──────────────────────────────

async function fetchStablecoinDelta(): Promise<{ delta: number } | null> {
  try {
    const data = await fetchJSON(
      "https://stablecoins.llama.fi/stablecoins?includePrices=true",
      AbortSignal.timeout(12_000)
    );
    const assets = data?.peggedAssets ?? [];
    let totalCurrent = 0;
    let totalPrev = 0;
    for (const coin of assets) {
      totalCurrent += coin.circulating?.peggedUSD ?? 0;
      totalPrev += coin.circulatingPrevDay?.peggedUSD ?? coin.circulating?.peggedUSD ?? 0;
    }
    if (totalCurrent === 0) return null;
    return { delta: totalCurrent - totalPrev };
  } catch {
    return null;
  }
}

// ─── BTC Dominance (CoinGecko /global) ────────────────────────────────

async function fetchBtcDominance(): Promise<{ value: number; prev: number } | null> {
  try {
    const data = await fetchJSON(
      "https://api.coingecko.com/api/v3/global",
      AbortSignal.timeout(10_000)
    );
    const btcD = data?.data?.market_cap_percentage?.btc;
    if (typeof btcD !== "number") return null;
    return { value: btcD, prev: btcD }; // no delta available free tier
  } catch {
    return null;
  }
}

// ─── Macro Calendar ───────────────────────────────────────────────────

export function getMacroCalendar(): MacroEvent[] {
  const now = new Date();
  const events: MacroEvent[] = [
    { date: "2026-05-02", name: "NFP (April)", type: "NFP", importance: "high" },
    { date: "2026-05-06", name: "FOMC Decision", type: "FOMC", importance: "high" },
    { date: "2026-05-13", name: "CPI (April)", type: "CPI", importance: "high" },
    { date: "2026-05-29", name: "PCE (April)", type: "PCE", importance: "high" },
    { date: "2026-05-29", name: "GDP (Q1 2nd est.)", type: "GDP", importance: "medium" },
    { date: "2026-06-04", name: "ECB Decision", type: "ECB", importance: "medium" },
    { date: "2026-06-17", name: "FOMC Decision", type: "FOMC", importance: "high" },
    { date: "2026-06-19", name: "BoJ Decision", type: "BOJ", importance: "medium" },
  ];
  return events.filter((e) => new Date(e.date) >= now);
}

// ─── Token OHLCV utilities ────────────────────────────────────────────

function computeRSI(candles: OHLCV[], period = 14): number | undefined {
  if (candles.length < period + 1) return undefined;
  const closes = candles.slice(-(period + 1)).map((c) => c.close);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function buildWeeklyCandles(daily: OHLCV[]): OHLCV[] {
  const weeks: OHLCV[][] = [];
  let current: OHLCV[] = [];
  for (const c of daily) {
    const day = new Date(c.timestamp).getUTCDay();
    if (day === 1 && current.length > 0) {
      weeks.push(current);
      current = [];
    }
    current.push(c);
  }
  if (current.length > 0) weeks.push(current);
  return weeks.map((w) => ({
    timestamp: w[0].timestamp,
    open: w[0].open,
    high: Math.max(...w.map((c) => c.high)),
    low: Math.min(...w.map((c) => c.low)),
    close: w[w.length - 1].close,
    volume: w.reduce((s, c) => s + c.volume, 0),
  }));
}

function computeDerivedIndicators(token: TokenData, raw: OHLCV[]) {
  // Keep full daily history for 50W MA (up to 180 days provided by CoinGecko)
  token.dailyCandles = raw.slice(-30);
  token.weeklyCandles = buildWeeklyCandles(raw);

  // 30W SMA
  if (token.weeklyCandles.length >= 30) {
    const last30 = token.weeklyCandles.slice(-30);
    token.sma30w = last30.reduce((s, c) => s + c.close, 0) / 30;
  } else if (token.weeklyCandles.length > 0) {
    token.sma30w =
      token.weeklyCandles.reduce((s, c) => s + c.close, 0) /
      token.weeklyCandles.length;
  }

  // 50W SMA (uses whatever we have; CoinGecko free only gives 180 days ≈ 25 weeks)
  if (token.weeklyCandles.length > 0) {
    const lastN = token.weeklyCandles.slice(-Math.min(50, token.weeklyCandles.length));
    token.sma50w = lastN.reduce((s, c) => s + c.close, 0) / lastN.length;
  }

  // 4-week MA slope (current and prior) for acceleration check
  if (token.weeklyCandles.length >= 8) {
    const recent = token.weeklyCandles.slice(-4);
    const prior = token.weeklyCandles.slice(-8, -4);
    const pct = (arr: OHLCV[]) => {
      const a = arr[0].close;
      const b = arr[arr.length - 1].close;
      return a > 0 ? ((b - a) / a) * 100 : 0;
    };
    token.maSlope4w = pct(recent);
    token.maSlopePrev = pct(prior);
  }

  // ATR(14) on daily
  if (token.dailyCandles.length >= 15) {
    const last15 = token.dailyCandles.slice(-15);
    let atrSum = 0;
    for (let i = 1; i < last15.length; i++) {
      const tr = Math.max(
        last15[i].high - last15[i].low,
        Math.abs(last15[i].high - last15[i - 1].close),
        Math.abs(last15[i].low - last15[i - 1].close)
      );
      atrSum += tr;
    }
    token.atr14 = atrSum / 14;
  }

  // Range compression on last 15 daily
  if (token.dailyCandles.length >= 15) {
    const last15 = token.dailyCandles.slice(-15);
    const h = Math.max(...last15.map((c) => c.high));
    const l = Math.min(...last15.map((c) => c.low));
    const mid = (h + l) / 2;
    token.rangeCompression = mid > 0 ? ((h - l) / mid) * 100 : 0;
  }

  // RSI(14) on daily
  token.rsi14 = computeRSI(token.dailyCandles);
}

// ─── Token Data Fetcher (V2) ──────────────────────────────────────────

export async function fetchTokenData(tokenIds: string[]): Promise<TokenData[]> {
  console.log(`[tracker/data] Fetching ${tokenIds.length} tokens...`);
  if (tokenIds.length === 0) return [];

  const tokens: TokenData[] = [];

  // Batch price fetch
  try {
    const priceData = await fetchJSON(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds.join(",")}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      AbortSignal.timeout(15_000)
    );
    for (const id of tokenIds) {
      const d = priceData?.[id];
      tokens.push({
        id,
        symbol: id.toUpperCase(),
        name: id,
        price: d?.usd ?? 0,
        marketCap: d?.usd_market_cap ?? 0,
        volume24h: d?.usd_24h_vol ?? 0,
        weeklyCandles: [],
        dailyCandles: [],
        status: d ? "LIVE" : "UNAVAILABLE",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("[tracker/data] Token price fetch failed:", e);
    for (const id of tokenIds) {
      tokens.push({
        id,
        symbol: id.toUpperCase(),
        name: id,
        price: 0,
        marketCap: 0,
        volume24h: 0,
        weeklyCandles: [],
        dailyCandles: [],
        status: "UNAVAILABLE",
        fetchedAt: new Date().toISOString(),
      });
    }
  }

  // OHLCV — parallel pairs with 6s delay between batches
  const liveTokens = tokens.filter((t) => t.status === "LIVE");
  const BATCH_SIZE = 2;
  const BATCH_DELAY_MS = 6_000;

  for (let i = 0; i < liveTokens.length; i += BATCH_SIZE) {
    const batch = liveTokens.slice(i, i + BATCH_SIZE);

    if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    await Promise.all(
      batch.map(async (token) => {
        const cached = ohlcvCache.get(token.id);
        let raw: OHLCV[] | null = null;

        if (cached && Date.now() - cached.fetchedAt < OHLCV_CACHE_TTL) {
          raw = cached.data;
          console.log(`[tracker/data] OHLCV ${token.id} (cached)`);
        } else {
          try {
            const data = await fetchJSON(
              `https://api.coingecko.com/api/v3/coins/${token.id}/ohlc?vs_currency=usd&days=180`,
              AbortSignal.timeout(12_000)
            );
            if (Array.isArray(data)) {
              raw = data.map((d: number[]) => ({
                timestamp: new Date(d[0]).toISOString(),
                open: d[1],
                high: d[2],
                low: d[3],
                close: d[4],
                volume: 0,
              }));
              ohlcvCache.set(token.id, { data: raw, fetchedAt: Date.now() });
              console.log(`[tracker/data] OHLCV ${token.id} OK`);
            }
          } catch {
            console.log(`[tracker/data] OHLCV ${token.id} failed`);
          }
        }

        if (raw) computeDerivedIndicators(token, raw);
      })
    );
  }

  console.log(`[tracker/data] Token data complete: ${tokens.length} tokens.`);
  return tokens;
}

// ─── Crypto Flows (V2: only stablecoin delta) ─────────────────────────

export async function fetchCryptoFlows(): Promise<CryptoFlows> {
  const result: CryptoFlows = { status: "DEGRADED", fetchedAt: new Date().toISOString() };
  const delta = await fetchStablecoinDelta();
  if (delta != null) {
    result.stablecoinSupplyDelta = makePoint(
      "flow-stable-delta",
      "Stablecoin Supply Delta",
      delta.delta,
      "$",
      "defillama",
      "LIVE",
      0
    );
    result.status = "LIVE";
  }
  return result;
}

// ─── Default Watchlist (V2: trimmed to 5) ─────────────────────────────

export const DEFAULT_WATCHLIST = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
];
