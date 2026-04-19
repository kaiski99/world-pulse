@AGENTS.md

# World Pulse — Intelligence Dashboard

## What This Is
World Pulse is Kai's real-time intelligence dashboard that aggregates signals from 8 data sources (PapersWithCode, HackerNews, GitHub, Reddit, CoinGecko, DeFiLlama, Polymarket, Google Trends), clusters them into actionable signals, and generates AI briefings using Claude Haiku 4.5.

## Architecture
- **Stack**: Next.js 16 + TypeScript + Tailwind CSS + Anthropic API
- **Live**: https://world-pulse-iota.vercel.app
- **Repo**: https://github.com/kaiski99/world-pulse
- **Data Pipeline**: Parallel fetch → tag → extract entities → cluster → score → link flows → build graph → AI summarize
- **Views**: Signals (interactive world map + cluster cards), Flows (capital/macro data), Sources (raw feeds)

## Key Interfaces
- `PulseSnapshot`: Master data object containing sources, clusters, graph, flows, actions
- `SignalCluster`: Grouped signals with strength scoring (critical/strong/moderate/weak)
- `WorldMap`: Interactive SVG map — sources as locations, clusters as floating overlays

## Shared Memory — Connected Projects
World Pulse provides intelligence context to Kai's other projects:

### CLTR (Cut the Rope - Remastered)
- Game development project
- World Pulse feeds: gaming/entertainment trends, AI in gaming signals, relevant tech innovations
- Two-way: CLTR deadlines and milestones inform which signals are prioritized

### Sole AT
- Another pinned project
- World Pulse feeds: relevant market signals and trend data
- Two-way: Project context informs signal filtering

## How to Contribute
- Intelligence pipeline lives in `lib/intelligence/`
- Data sources in `lib/sources/`
- Components in `components/`
- Always run `npm run build` before pushing — Vercel auto-deploys from main

## Kai's Preferences
- Dark theme, cyberpunk aesthetic
- Hybrid style: dark background + colorful illustrated nodes
- Interactive, game-like UI inspired by world maps (Angry Birds, Cut the Rope)
- Monospace fonts (JetBrains Mono) for data, Inter for body text
- Values: actionable intelligence over raw data
