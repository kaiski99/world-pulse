import {
  MacroSnapshot,
  MacroDataPoint,
  MacroEvent,
  TokenData,
  CryptoFlows,
  OHLCV,
  DataStatus,
} from "./types";

const TIMEOUT = 25_000;

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

// ─── FRED (St. Louis Fed) — free API ───

async function fetchFRED(
  seriesId: string
): Promise<{ value: number; prev: number } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  try {
    const { execSync } = require("child_process");
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
    const result = execSync(`curl -s "${url}"`, { timeout: 15_000 });
    const data = JSON.parse(result.toString());
    const obs = data?.observations;
    if (!obs || obs.length < 1) return null;
    const current = parseFloat(obs[0].value);
    const prev = obs.length > 1 ? parseFloat(obs[1].value) : current;
    if (isNaN(current)) return null;
    return { value: current, prev: isNaN(prev) ? current : prev };
  } catch (e) {
    console.error(`[tracker/FRED] ${seriesId} failed:`, e);
    return null;
  }
}

// ─── Macro Data Fetcher ───

export async function fetchMacroData(): Promise<MacroSnapshot> {
  console.log("[tracker/data] Fetching macro data... FRED_API_KEY:", process.env.FRED_API_KEY ? "SET" : "NOT SET");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  const signal = controller.signal;

  const [
    fredUs2y,
    fredUs10y,
    fredRealYield,
    fredFedFunds,
    fredHySpread,
    fredBalSheet,
    fredRrp,
    fredTga,
    fxData,
    vixProxy,
    goldData,
  ] = await Promise.allSettled([
    fetchFRED("DGS2"),
    fetchFRED("DGS10"),
    fetchFRED("DFII10"),
    fetchFRED("FEDFUNDS"),
    fetchFRED("BAMLH0A0HYM2"),
    fetchFRED("WALCL"),
    fetchFRED("RRPONTSYD"),
    fetchFRED("WTREGEN"),
    fetchJSON("https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,CNY,GBP", signal).catch(() => null),
    fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=volatility-index-token&vs_currencies=usd&include_24hr_change=true", signal).catch(() => null),
    fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=paxos-gold&vs_currencies=usd&include_24hr_change=true", signal).catch(() => null),
  ]);

  clearTimeout(timeout);

  const fred = (r: PromiseSettledResult<{ value: number; prev: number } | null>) =>
    r.status === "fulfilled" ? r.value : null;

  const us2yData = fred(fredUs2y);
  const us10yData = fred(fredUs10y);
  const realYieldData = fred(fredRealYield);
  const fedFundsData = fred(fredFedFunds);
  const hyData = fred(fredHySpread);
  const balSheetData = fred(fredBalSheet);
  const rrpData = fred(fredRrp);
  const tgaData = fred(fredTga);

  const netLiqValue =
    balSheetData && rrpData && tgaData
      ? balSheetData.value - rrpData.value - tgaData.value
      : 0;
  const netLiqPrev =
    balSheetData && rrpData && tgaData
      ? balSheetData.prev - rrpData.prev - tgaData.prev
      : 0;

  // FX
  const fx = fxData.status === "fulfilled" ? fxData.value : null;
  const fxRates = fx?.rates ?? {};

  // DXY proxy: weighted basket (EUR 57.6%, JPY 13.6%, GBP 11.9%, CNY ~10%)
  let dxyValue = 100;
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
  }

  // Gold
  const goldResult = goldData.status === "fulfilled" ? goldData.value : null;
  const goldPrice = goldResult?.["paxos-gold"]?.usd ?? 0;

  const snapshot: MacroSnapshot = {
    fetchedAt: new Date().toISOString(),

    rates: {
      us2y: us2yData
        ? makePoint("rates-us2y", "US 2Y Yield", us2yData.value, "%", "FRED", "LIVE", us2yData.prev)
        : degraded("rates-us2y", "US 2Y Yield", "%", "FRED"),
      us10y: us10yData
        ? makePoint("rates-us10y", "US 10Y Yield", us10yData.value, "%", "FRED", "LIVE", us10yData.prev)
        : degraded("rates-us10y", "US 10Y Yield", "%", "FRED"),
      realYield: realYieldData
        ? makePoint("rates-real", "10Y Real Yield", realYieldData.value, "%", "FRED", "LIVE", realYieldData.prev)
        : degraded("rates-real", "10Y Real Yield", "%", "FRED"),
      fedFundsRate: fedFundsData
        ? makePoint("rates-fedfunds", "Fed Funds Rate", fedFundsData.value, "%", "FRED", "LIVE", fedFundsData.prev)
        : degraded("rates-fedfunds", "Fed Funds Rate", "%", "FRED"),
    },

    fx: {
      dxy: makePoint("fx-dxy", "DXY (proxy)", dxyValue, "index", "calculated", fxRates.EUR ? "LIVE" : "DEGRADED"),
      usdjpy: fxRates.JPY
        ? makePoint("fx-usdjpy", "USD/JPY", fxRates.JPY, "JPY", "frankfurter")
        : degraded("fx-usdjpy", "USD/JPY", "JPY", "frankfurter"),
      usdcnh: fxRates.CNY
        ? makePoint("fx-usdcnh", "USD/CNH", fxRates.CNY, "CNY", "frankfurter")
        : degraded("fx-usdcnh", "USD/CNH", "CNY", "frankfurter"),
      eurusd: fxRates.EUR
        ? makePoint("fx-eurusd", "EUR/USD", 1 / fxRates.EUR, "EUR", "frankfurter")
        : degraded("fx-eurusd", "EUR/USD", "EUR", "frankfurter"),
    },

    equities: {
      spx: degraded("eq-spx", "S&P 500", "index", "unavailable"),
      ndx: degraded("eq-ndx", "Nasdaq 100", "index", "unavailable"),
      vix: degraded("eq-vix", "VIX", "index", "unavailable"),
      move: degraded("eq-move", "MOVE", "index", "unavailable"),
    },

    commodities: {
      gold: goldPrice > 0
        ? makePoint("cmd-gold", "Gold", goldPrice, "$/oz", "coingecko-paxg")
        : degraded("cmd-gold", "Gold", "$/oz", "coingecko-paxg"),
      wti: degraded("cmd-wti", "WTI Crude", "$/bbl", "unavailable"),
      copper: degraded("cmd-copper", "Copper", "$/lb", "unavailable"),
    },

    credit: {
      hySpread: hyData
        ? makePoint("credit-hy", "HY Spread (OAS)", hyData.value, "bps", "FRED", "LIVE", hyData.prev)
        : degraded("credit-hy", "HY Spread (OAS)", "bps", "FRED"),
      igSpread: degraded("credit-ig", "IG Spread", "bps", "unavailable"),
    },

    liquidity: {
      fedBalanceSheet: balSheetData
        ? makePoint("liq-bs", "Fed Balance Sheet", balSheetData.value, "$M", "FRED", "LIVE", balSheetData.prev)
        : degraded("liq-bs", "Fed Balance Sheet", "$M", "FRED"),
      rrp: rrpData
        ? makePoint("liq-rrp", "Reverse Repo (RRP)", rrpData.value, "$M", "FRED", "LIVE", rrpData.prev)
        : degraded("liq-rrp", "Reverse Repo (RRP)", "$M", "FRED"),
      tga: tgaData
        ? makePoint("liq-tga", "Treasury General Account", tgaData.value, "$M", "FRED", "LIVE", tgaData.prev)
        : degraded("liq-tga", "Treasury General Account", "$M", "FRED"),
      netLiquidity:
        balSheetData && rrpData && tgaData
          ? makePoint("liq-net", "Net Liquidity", netLiqValue, "$M", "calculated", "LIVE", netLiqPrev)
          : degraded("liq-net", "Net Liquidity", "$M", "calculated"),
      globalM2: degraded("liq-m2", "Global M2", "$T", "unavailable"),
    },
  };

  console.log("[tracker/data] Macro data complete.");
  return snapshot;
}

// ─── Macro Calendar (static + known dates) ───

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

// ─── Token / Crypto Data ───

export async function fetchTokenData(
  tokenIds: string[]
): Promise<TokenData[]> {
  console.log(`[tracker/data] Fetching ${tokenIds.length} tokens...`);

  if (tokenIds.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  const signal = controller.signal;

  const tokens: TokenData[] = [];

  try {
    const ids = tokenIds.join(",");
    const priceData = await fetchJSON(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      signal
    );

    for (const id of tokenIds) {
      const d = priceData?.[id];
      if (!d) {
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
        continue;
      }

      tokens.push({
        id,
        symbol: id.toUpperCase(),
        name: id,
        price: d.usd ?? 0,
        marketCap: d.usd_market_cap ?? 0,
        volume24h: d.usd_24h_vol ?? 0,
        weeklyCandles: [],
        dailyCandles: [],
        status: "LIVE",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("[tracker/data] Token price fetch error:", e);
  }

  clearTimeout(timeout);

  // Fetch OHLCV for each token (30 days daily, weekly derived)
  const ohlcvPromises = tokens
    .filter((t) => t.status === "LIVE")
    .map(async (token) => {
      try {
        const data = await fetchJSON(
          `https://api.coingecko.com/api/v3/coins/${token.id}/ohlc?vs_currency=usd&days=210`,
          controller.signal
        );
        if (!Array.isArray(data)) return;

        const candles: OHLCV[] = data.map((d: number[]) => ({
          timestamp: new Date(d[0]).toISOString(),
          open: d[1],
          high: d[2],
          low: d[3],
          close: d[4],
          volume: 0,
        }));

        token.dailyCandles = candles.slice(-30);

        // Build weekly candles from daily (group by week)
        const weeks: OHLCV[][] = [];
        let currentWeek: OHLCV[] = [];
        for (const c of candles) {
          const day = new Date(c.timestamp).getUTCDay();
          if (day === 1 && currentWeek.length > 0) {
            weeks.push(currentWeek);
            currentWeek = [];
          }
          currentWeek.push(c);
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);

        token.weeklyCandles = weeks.map((w) => ({
          timestamp: w[0].timestamp,
          open: w[0].open,
          high: Math.max(...w.map((c) => c.high)),
          low: Math.min(...w.map((c) => c.low)),
          close: w[w.length - 1].close,
          volume: w.reduce((s, c) => s + c.volume, 0),
        }));

        // 30-week SMA
        if (token.weeklyCandles.length >= 30) {
          const last30 = token.weeklyCandles.slice(-30);
          token.sma30w = last30.reduce((s, c) => s + c.close, 0) / 30;
        } else if (token.weeklyCandles.length > 0) {
          token.sma30w =
            token.weeklyCandles.reduce((s, c) => s + c.close, 0) /
            token.weeklyCandles.length;
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

        // Range compression: last 15 candles range / price
        if (token.dailyCandles.length >= 15) {
          const last15 = token.dailyCandles.slice(-15);
          const rangeHigh = Math.max(...last15.map((c) => c.high));
          const rangeLow = Math.min(...last15.map((c) => c.low));
          const mid = (rangeHigh + rangeLow) / 2;
          token.rangeCompression = mid > 0 ? ((rangeHigh - rangeLow) / mid) * 100 : 0;
        }
      } catch {
        // OHLCV fetch failed, keep basic price data
      }
    });

  await Promise.allSettled(ohlcvPromises);

  console.log(`[tracker/data] Token data complete: ${tokens.length} tokens.`);
  return tokens;
}

// ─── Crypto Flows ───

export async function fetchCryptoFlows(): Promise<CryptoFlows> {
  console.log("[tracker/data] Fetching crypto flows...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  const signal = controller.signal;

  const result: CryptoFlows = {
    status: "DEGRADED",
    fetchedAt: new Date().toISOString(),
  };

  try {
    // Stablecoin supply delta from DeFiLlama
    const stableData = await fetchJSON(
      "https://stablecoins.llama.fi/stablecoins?includePrices=true",
      signal
    );
    const assets = stableData?.peggedAssets ?? [];

    let totalCurrent = 0;
    let totalPrev = 0;
    for (const coin of assets) {
      const current = coin.circulating?.peggedUSD ?? 0;
      const prev = coin.circulatingPrevDay?.peggedUSD ?? current;
      totalCurrent += current;
      totalPrev += prev;
    }

    if (totalCurrent > 0) {
      result.stablecoinSupplyDelta = makePoint(
        "flow-stablecoin-delta",
        "Stablecoin Supply Delta",
        totalCurrent - totalPrev,
        "$",
        "defillama",
        "LIVE",
        0
      );
      result.status = "LIVE";
    }
  } catch {
    console.log("[tracker/data] Stablecoin flow fetch failed");
  }

  clearTimeout(timeout);

  // Exchange reserves, CEX netflow, funding rates — require paid APIs (Glassnode/CoinGlass)
  result.spotCexNetflow = degraded("flow-cex-netflow", "Spot CEX Netflow", "$", "coinglass");
  result.exchangeReserves = degraded("flow-exchange-reserves", "Exchange Reserves", "BTC", "glassnode");
  result.btcEtfFlow = degraded("flow-btc-etf", "BTC ETF Flow", "$", "farside");
  result.ethEtfFlow = degraded("flow-eth-etf", "ETH ETF Flow", "$", "farside");

  console.log("[tracker/data] Crypto flows complete.");
  return result;
}

// ─── Default Watchlist ───

export const DEFAULT_WATCHLIST = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
  "avalanche-2",
  "polkadot",
  "chainlink",
  "near",
  "sui",
  "aptos",
  "arbitrum",
  "optimism",
  "celestia",
  "injective-protocol",
  "render-token",
  "fetch-ai",
  "jupiter-exchange-solana",
  "ondo-finance",
];
