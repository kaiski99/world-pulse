# World Pulse — Cross-Source Intelligence & Flow Dashboard

Track signals across 10 sources, monitor capital/commodity/energy/FX flows, generate actionable CTAs, and see how they connect — prioritized for AI, DeFi, payments, merchant, and institutional verticals.

## Architecture

```
Fetch → Tag → Extract Entities → Cluster → Score → Link Flows → Graph → Actions → AI Summary
```

**Three dashboard views:**
- **Signals** — Entity clusters across sources, scored by signal strength, with flow indicators
- **Flows** — Capital flows (stablecoins, bridges, TVL, yields, Fear & Greed), macro (commodities, energy, FX), Sankey diagram, heatmap
- **Sources** — Raw feeds from each data source

**Plus:**
- **Actions Panel** — AI-generated CTAs: yields, trades, build opportunities, BD leads
- **Settings** — Editable business profile that personalizes recommendations

## Data Sources

### Signal Sources (8)
| Source | API |
|--------|-----|
| Google Trends | RSS Feed (US + SG) |
| Reddit | Multi-subreddit (ML, DeFi, Crypto, etc.) |
| CoinGecko | Trending coins + NFTs |
| DeFi Llama | Top TVL movers + DEX volumes |
| Polymarket | Top prediction markets by volume |
| GitHub | AI + crypto + general trending repos |
| Hacker News | Top 25 stories |
| AI Research | Hugging Face Daily Papers |

### Flow Sources (2 groups)
| Group | APIs |
|-------|------|
| Capital | CoinGecko Global, DeFi Llama (stablecoins, chains, bridges, yields), Fear & Greed |
| Macro | Frankfurter/ER-API (FX), CoinGecko gold proxies, commodity fallbacks |

## Setup

```bash
cd world-pulse
npm install
```

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Start dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click REFRESH.

## Deployment (Vercel)

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add `ANTHROPIC_API_KEY` as an environment variable
4. Deploy

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| R | Refresh all sources |
| Tab | Cycle views (Signals → Flows → Sources) |
| 1-5 | Filter by vertical (AI, DeFi, Pay, Merch, Insti) |
| 0 | Clear filter |
| S | Toggle AI summary |
| A | Toggle actions panel |
| / | Focus search |
| P | Open settings |
| Escape | Clear search + filters |
