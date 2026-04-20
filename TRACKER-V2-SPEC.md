# Regime Tracker V2 — Upgrade Spec

> Informed by backtesting against a verified 52x BTC trader (2020-2026, 190k executions).
> Goal: align the state machine with how real money actually moves, drop dead-weight data.

---

## What Changed and Why

The V1 backtest revealed a critical gap: **the state machine only covers ~29% of a legendary trader's actual entry behavior.** The Kotegawa QUIET→IMBALANCE model works for catching breakouts, but the trader also:

- **42% of buys** occur when price is >30% above 30W MA (V1 disqualifies this as "EXTENDED")
- **29% of buys** occur below the 30W MA (mean-reversion entries V1 calls "INVALID")
- Only **29%** of buys fall in the 0-30% above MA sweet spot the V1 state machine covers

The V1 regime score also runs on 5 macro components, but 3 of them (VIX, Real Yields, HY Spread) are permanently degraded on the free tier, producing a useless neutral-by-default score.

---

## Architecture: What to Keep, Add, and Kill

### KEEP (core money-makers)

1. **Kotegawa State Machine** — QUIET → IMBALANCE_FORMING → IMBALANCE_CONFIRMED pipeline. This is valid for breakout detection. Keep the quiet score (range compression + MA flatness + vol percentile). Keep the trigger conditions (breakout above range, candle size, above MA).

2. **30W MA as trend anchor** — The 210-day SMA is the single most important indicator. Every state references it. Keep.

3. **DXY (proxy from Frankfurter)** — Free, live, and the most reliable regime component. Weak dollar = risk on for crypto. This was the only regime component returning live data in V1.

4. **Macro Calendar** — The static event calendar (FOMC, CPI, NFP, PCE) is lightweight and high-value. Knowing when to avoid entries is as important as knowing when to enter.

5. **Stablecoin Supply Delta (DeFiLlama)** — Free, live, measures capital flowing into crypto. Keep in flows.

6. **Event Log + Alert System** — State transitions and regime flips. Keep.

### ADD (new states + data to fill the 71% gap)

7. **TREND_RIDE state** — New state for when price is >30% above 30W MA but the trend is still accelerating. Instead of disqualifying as EXTENDED, evaluate:
   - MA slope still positive and steepening → TREND_RIDE (allow entry with tighter stop)
   - MA slope flattening or turning → EXTENDED (warn, no new entries)
   - This alone covers the 42% of the trader's buys the V1 missed

8. **DIP_BUY state** — New state for mean-reversion entries below the 30W MA:
   - Price < 30W MA but > 50W MA (200-day) → potential dip buy zone
   - RSI(14) < 35 or price touching lower Bollinger → DIP_BUY eligible
   - Regime must NOT be RISK_OFF
   - This covers the 29% of below-MA buys

9. **Simplified 3-component regime score** — Drop the 5-component model. New model:
   - **DXY Trend (0-33):** Already live from Frankfurter. <100 = full score.
   - **Net Liquidity Trend (0-33):** Fed Balance Sheet - RRP - TGA. Requires FRED_API_KEY.
   - **Stablecoin Flow (0-34):** DeFiLlama stablecoin supply delta. Positive = capital inflow.
   - Score >66 = RISK_ON, 33-66 = NEUTRAL, <33 = RISK_OFF
   - Rationale: these 3 are the only components that can actually return live data on free tier APIs. VIX, Real Yields, HY Spread were always degraded — remove them.

10. **BTC Dominance** — Add BTC.D from CoinGecko global endpoint (`/global`). Rising BTC.D = flight to quality within crypto, bearish for alts. This helps filter the watchlist: when BTC.D rising, only BTC is eligible; when falling, alts unlock.

11. **Funding Rate + Open Interest** — If available from free APIs (e.g., CoinGlass free tier or Binance public endpoints), add funding rate and OI delta. Extreme positive funding = overheated longs. Negative funding = potential long squeeze setup.

### KILL (dead weight — always degraded, no free source, or irrelevant)

12. **Remove from MacroSnapshot:**
    - `equities.spx` — no free live source, irrelevant for crypto entries
    - `equities.ndx` — same
    - `equities.vix` — no free source, was always neutral default
    - `equities.move` — bond vol, no free source
    - `commodities.wti` — crude oil has no bearing on crypto entries
    - `commodities.copper` — same
    - `commodities.gold` — CoinGecko PAXG was flaky. If gold matters, it's through DXY
    - `credit.igSpread` — redundant with HY, always degraded
    - `liquidity.globalM2` — no free live source
    - `rates.us2y` — nice-to-have context but not a regime component
    - `rates.fedFundsRate` — changes 8x/year, not useful for daily regime

    **Keep from rates:** `us10y` and `realYield` as display-only context (not regime-scored), only if FRED_API_KEY is present.

13. **Remove from CryptoFlows:**
    - `exchangeReserves` — always degraded (Glassnode paid)
    - `btcEtfFlow` / `ethEtfFlow` — always degraded (Farside paid)
    - `spotCexNetflow` via Nansen CLI — always degraded (paid + requires CLI)
    - **Keep only:** `stablecoinSupplyDelta` from DeFiLlama (free, live)

---

## New State Machine: 7 States

```
QUIET                → Range compression detected, waiting for breakout
IMBALANCE_FORMING    → Partial trigger conditions met (breakout + above MA)
IMBALANCE_CONFIRMED  → All triggers met, setup is live (1% risk entry)
TREND_RIDE           → Price >30% above MA but trend accelerating (tight stop entry)
DIP_BUY              → Price below MA in support zone (mean-reversion entry)
EXTENDED             → Trend exhaustion, no new entries
INVALID              → Disqualified or insufficient data
```

### State Transition Logic (priority order):

```
1. Check hard disqualifiers:
   - Social spike >3000 mentions → INVALID
   - IMBALANCE_CONFIRMED > 3 days old → INVALID

2. Check TREND_RIDE (new):
   - Price >30% above 30W MA
   - MA slope (4-week) > +3% AND accelerating (slope > prev slope)
   - Regime ≠ RISK_OFF
   → TREND_RIDE (stop = 20-day low, size = 0.5% risk instead of 1%)

3. Check EXTENDED:
   - Price >30% above 30W MA
   - MA slope flattening or negative
   → EXTENDED (no entry)

4. Check DIP_BUY (new):
   - Price < 30W MA
   - Price > 50W MA (or within 10% of 30W MA from below)
   - Regime ≠ RISK_OFF
   - Candle shows rejection wick or RSI < 35
   → DIP_BUY (stop = recent swing low, size = 1% risk)

5. Check IMBALANCE_CONFIRMED:
   - All 4 triggers met (breakout, candle size, above MA, regime OK)
   - No disqualifiers
   → IMBALANCE_CONFIRMED

6. Check IMBALANCE_FORMING:
   - Breakout + above MA + regime OK (missing candle size)
   → IMBALANCE_FORMING

7. Check QUIET:
   - Quiet score ≥ 60, all sub-thresholds pass
   → QUIET

8. Default → INVALID
```

---

## New Regime Score: 3 Components (0-100)

```typescript
// 1. DXY Trend (0-33) — Frankfurter API, free, always live
//    <96 = 33, <100 = 26, <103 = 20, <106 = 13, <108 = 7, ≥108 = 0

// 2. Net Liquidity Trend (0-33) — FRED API (free key)
//    Fed Balance Sheet - RRP - TGA
//    Rising >1% = 33, >0.5% = 26, flat = 17, falling = 7, <-1% = 0
//    Degraded (no FRED key) = 17 (neutral)

// 3. Stablecoin Flow (0-34) — DeFiLlama, free, always live
//    24h supply delta: >$500M inflow = 34, >$100M = 27, flat = 17,
//    outflow >$100M = 7, >$500M = 0

// RISK_ON > 66 | NEUTRAL 33-66 | RISK_OFF < 33
```

---

## Data Pipeline Fix: Kill the Timeout

The V1 API times out because it fetches OHLCV for 10 tokens sequentially with 7s delays (70+ seconds). Fix:

1. **Reduce default watchlist to 5 tokens:** BTC, ETH, SOL, BNB, XRP. The trader is ~99% BTC anyway. Keep it tight.

2. **Cache OHLCV aggressively:** 4-hour TTL is fine, but also persist to Vercel KV or a JSON file in `/tmp` so cold starts don't re-fetch everything.

3. **Fetch OHLCV in parallel batches of 2** with 6s delay between batches instead of sequential. 5 tokens = 3 batches = 12s instead of 28s.

4. **Add a `/api/tracker/quick` endpoint** that only returns regime + calendar + flows (no token OHLCV). Loads in <3 seconds. The full scan with tokens uses `/api/tracker` (POST).

5. **Vercel timeout:** Keep `maxDuration = 60`. If on free tier (10s limit), the quick endpoint is the default, full scan is a manual action.

---

## Simplified MacroSnapshot (V2)

```typescript
interface MacroSnapshotV2 {
  fetchedAt: string;

  // Regime-scored (these actually feed the score)
  dxy: MacroDataPoint;            // Frankfurter (free, live)
  netLiquidity: MacroDataPoint;   // FRED: WALCL - RRPONTSYD - WTREGEN
  stablecoinDelta: MacroDataPoint; // DeFiLlama (free, live)

  // Context-only (display, not scored)
  us10y?: MacroDataPoint;          // FRED, if available
  realYield?: MacroDataPoint;      // FRED, if available
  hySpread?: MacroDataPoint;       // FRED, if available
  btcDominance?: MacroDataPoint;   // CoinGecko /global (free)
  fundingRate?: MacroDataPoint;    // Binance/CoinGlass if available

  // FRED sub-components (for net liquidity breakdown display)
  fedBalanceSheet?: MacroDataPoint;
  rrp?: MacroDataPoint;
  tga?: MacroDataPoint;
}
```

---

## Simplified TokenData (V2)

```typescript
interface TokenDataV2 {
  id: string;
  symbol: string;
  price: number;
  volume24h: number;
  weeklyCandles: OHLCV[];   // For 30W MA + MA slope
  dailyCandles: OHLCV[];    // For range compression, breakout, ATR
  sma30w?: number;
  sma50w?: number;           // NEW: for DIP_BUY support zone
  atr14?: number;
  rangeCompression?: number;
  rsi14?: number;            // NEW: for DIP_BUY oversold detection
  maSlope4w?: number;        // NEW: for TREND_RIDE acceleration
  maSlopePrev?: number;      // NEW: for slope acceleration check
  fundingRate?: number;      // NEW: if available
  status: DataStatus;
  fetchedAt: string;
}
```

---

## UI Changes

1. **Remove Macro Cards for killed categories.** No more Equities, Commodities, IG Spread cards.

2. **Regime Gauge: 3 bars instead of 5.** DXY | Net Liquidity | Stablecoin Flow. Cleaner, all live.

3. **Watchlist table: add new state badges.** TREND_RIDE (purple) and DIP_BUY (cyan) alongside existing colors.

4. **Add "Quick Scan" button** that loads regime + calendar instantly. "Full Scan" for tokens.

5. **BTC Dominance indicator** in the regime strip — small badge showing BTC.D % and direction arrow.

---

## Summary: Before vs After

| Aspect | V1 | V2 |
|--------|----|----|
| Regime components | 5 (3 always degraded) | 3 (all live on free tier) |
| State machine states | 5 | 7 (+TREND_RIDE, +DIP_BUY) |
| Trader alignment | 46.8% | Target: >75% |
| Macro data points | 21 | 8 core + 5 optional |
| Default watchlist | 10 tokens | 5 tokens |
| API timeout risk | High (70s+ sequential) | Low (<15s batched) |
| Dead data sources | 12 permanently degraded | 0 (all removed or optional) |

---

## Implementation Order

1. Strip dead data sources from `types.ts`, `data.ts`, `regime.ts`
2. Implement new 3-component regime score
3. Add TREND_RIDE and DIP_BUY states to `state_machine.ts`
4. Add RSI-14, 50W MA, MA slope acceleration to `data.ts`
5. Add `/api/tracker/quick` endpoint
6. Batch OHLCV fetches (parallel pairs with delay)
7. Update UI components (gauge, cards, watchlist badges)
8. Re-run backtest to verify improved alignment
