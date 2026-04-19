# Kotegawa-Style Crypto Regime Tracker

Trade behavior, not charts. Price only moves when fear/urgency creates imbalance.

## Methodology

The system waits for QUIET → detects IMBALANCE → confirms with 30-week MA filter → sizes risk at 1%.

---

## Regime Score (0–100)

Updated daily. Composite of 5 macro components, each scored 0–20:

| # | Component | Source | Bullish (20) | Bearish (0) | Why |
|---|-----------|--------|-------------|------------|-----|
| 1 | Net Liquidity Trend | FRED (BS − RRP − TGA) | Rising >1% | Falling >1% | Liquidity drives all risk assets |
| 2 | DXY Trend | Frankfurter FX (proxy) | <96 (weak $) | >108 (strong $) | Strong dollar = risk off globally |
| 3 | Real Yields | FRED (DFII10) | <0% | >2% | Negative real yields push into risk |
| 4 | HY Spreads | FRED (BAMLH0A0HYM2) | <300 bps | >600 bps | Tight spreads = calm credit |
| 5 | VIX | (degraded — no free source) | <15 | >35 | Low vol = risk appetite |

### Regime Levels

| Score | Level | Rule |
|-------|-------|------|
| >70 | RISK_ON | Full watchlist eligible |
| 40–70 | NEUTRAL | Only majors (BTC, ETH, SOL) eligible |
| <40 | RISK_OFF | No new entries. Flag exits. |

---

## Per-Token State Machine

For every token in the universe:

### States

| State | Meaning | Entry Condition |
|-------|---------|-----------------|
| QUIET | Range compression, low vol, flat 30W MA | All quiet_score components pass (≥60 total) |
| IMBALANCE_FORMING | Partial breakout signals | Breakout + above 30W MA, but candle size not confirmed |
| IMBALANCE_CONFIRMED | Setup is live | All 4 trigger conditions met |
| EXTENDED | Too far above MA | Price >30% above 30W MA |
| INVALID | Disqualified or insufficient data | Any disqualifier active |

### Quiet Score (0–100)

| Component | Max | Threshold to pass | What it measures |
|-----------|-----|-------------------|-----------------|
| Range Compression | 25 | ≥15 | 15-candle range as % of price. Tighter = quieter |
| MA Flatness | 25 | ≥10 | 30W MA slope over 4 weeks. Flat/rising = good |
| Vol Percentile | 25 | ≥8 | ATR(14)/price. Lower = quieter |
| Social Quiet | 25 | — | Mention volume. Low = good. Degraded = assume quiet |

Total must be ≥60 to pass.

### Trigger Conditions (all must be true)

1. **Breakout above range**: Latest candle CLOSES (not wicks) above 15-candle range high
2. **Candle size > 1.5× avg**: Breakout candle body > 1.5× average body of range candles
3. **Price > 30W MA**: Confirms trend alignment
4. **Regime ≠ RISK_OFF**: Macro environment permits entries

### Disqualifiers (any one kills the setup)

| Disqualifier | Threshold | Why |
|-------------|-----------|-----|
| Extended above MA | Price >30% above 30W MA | Chasing, not imbalance |
| Social spike | Volume >3000 mentions | Hype = distribution, not accumulation |
| Already printed | >3 days since IMBALANCE_CONFIRMED | Missed the move |

### Risk Sizing

- **Stop**: Below breakout candle low
- **Size**: Risk 1% of portfolio. Position = (0.01 × portfolio) / (entry − stop)
- **Cap**: Never >25% of portfolio in one position

---

## Data Sources

| Data | Source | Endpoint | Status |
|------|--------|----------|--------|
| US 2Y/10Y Yield | FRED | DGS2, DGS10 | Requires FRED_API_KEY |
| Real Yield | FRED | DFII10 | Requires FRED_API_KEY |
| Fed Funds Rate | FRED | FEDFUNDS | Requires FRED_API_KEY |
| HY Spread | FRED | BAMLH0A0HYM2 | Requires FRED_API_KEY |
| Fed Balance Sheet | FRED | WALCL | Requires FRED_API_KEY |
| RRP | FRED | RRPONTSYD | Requires FRED_API_KEY |
| TGA | FRED | WTREGEN | Requires FRED_API_KEY |
| FX Rates | Frankfurter | /latest?from=USD | Free, live |
| DXY | Calculated | Weighted basket proxy | Live |
| Gold | CoinGecko | PAXG proxy | Free, rate-limited |
| Token Prices | CoinGecko | /simple/price | Free, rate-limited |
| Token OHLCV | CoinGecko | /coins/{id}/ohlc | Free, 210 days |
| Stablecoin Supply | DeFiLlama | /stablecoins | Free, live |
| VIX | — | No free source | DEGRADED |
| MOVE | — | Bloomberg only | DEGRADED |
| SPX/NDX | — | No free source | DEGRADED |
| Exchange Reserves | Glassnode | Paid API | DEGRADED |
| CEX Netflow | CoinGlass | Paid API | DEGRADED |
| Funding Rates | CoinGlass | Paid API | DEGRADED |
| Social Volume | LunarCrush | Paid API | DEGRADED |
| ETF Flows | Farside | No API | DEGRADED |
| CME FedWatch | CME | No public API | DEGRADED |

### Adding Paid Sources

To upgrade a DEGRADED source:
1. Add the API key to `.env.local`
2. Implement the fetcher in `lib/tracker/data.ts`
3. Change status from DEGRADED to LIVE
4. Update this doc

---

## API

### `POST /api/tracker`

**Request body:**
```json
{
  "watchlist": ["bitcoin", "ethereum", "solana"],
  "previousRegime": { ... },
  "previousStates": [ ... ]
}
```

**Response:** `TrackerSnapshot` with macro, regime, tokens, events, calendar.

---

## Files

| File | Purpose |
|------|---------|
| `lib/tracker/types.ts` | All type definitions |
| `lib/tracker/data.ts` | Data ingestion layer (FRED, CoinGecko, DeFiLlama, Frankfurter) |
| `lib/tracker/regime.ts` | Regime score computation (5 components → 0–100) |
| `lib/tracker/state_machine.ts` | Per-token state logic, quiet score, triggers, disqualifiers |
| `lib/tracker/index.ts` | Re-exports |
| `app/api/tracker/route.ts` | API endpoint |

---

## Backtest Expectations

When run against BTC 2020–2024 historical data:

| Period | Expected Result | Why |
|--------|----------------|-----|
| Oct 2023 breakout | ✅ SHOULD flag IMBALANCE | Quiet compression after months of range, breakout above 30W MA, improving liquidity |
| Feb 2024 breakout | ✅ SHOULD flag IMBALANCE | Range compression then decisive breakout, ETF approval catalyst |
| May 2021 top | ❌ Should NOT flag | Price already extended far above 30W MA (EXTENDED disqualifier) |
| FTX era (Nov 2022) | ❌ Should NOT flag | Price below 30W MA, regime RISK_OFF, social spike |

---

## Privacy & Constraints

- No predictions, no sentiment takes. Reports state, not opinion.
- Every signal traces back to a rule in the methodology.
- DEGRADED sources are explicitly marked — never silently substituted.
- No PII in any payload.
