import Anthropic from "@anthropic-ai/sdk";
import { PulseSnapshot, BusinessProfile } from "../types";

function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const SYSTEM_PROMPT = `You are a strategic intelligence advisor to a Web3 venture studio founder. You have three inputs:
1. SIGNAL CLUSTERS — cross-source intelligence on what the world is talking about, building, and betting on
2. FLOW DATA — real-time capital, commodity, energy, and FX flows showing where money and resources are moving
3. BUSINESS PROFILE — the founder's companies, competitive edge, goals, and risk tolerance

Your job is NOT just to report what's happening. Your job is to tell the founder WHAT TO DO about it.

FORMAT:

STRATEGIC DIRECTIVE (1 sentence): Based on the market regime and top signals, what should the founder's overall posture be right now?

PULSE (2 sentences): The single most important convergence of signal + flow + business opportunity.

FLOW STATE:
- Capital: direction + what it means for the portfolio
- Macro: commodities + FX + what it means
- Regime: name the regime and its implication

TOP SIGNALS → ACTIONS:
For the top 3-5 signal clusters, tell the founder:
- Why it matters to THEIR business specifically
- What the specific play is (yield, trade, build, or partner)
- How confident you are and why

OPPORTUNITIES RADAR:
- Best yield right now (specific pool, APY, risk)
- Best trade setup (specific token/market, rationale)
- Best build opportunity (what to build, why now, who for)
- Best BD lead (who to reach out to, why)

CONTRARIAN WATCH: Where is consensus wrong? What is everyone missing?

Write like a chief strategy officer. Be specific. Name numbers. Name companies. Name actions.`;

export async function generateSummary(
  snapshot: PulseSnapshot,
  profile?: BusinessProfile
): Promise<string | undefined> {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 180_000,
    });

    // ── Build Flow State section ──
    const { capital, macro, streams } = snapshot.flows;

    const flowLines = [
      "## FLOW STATE DATA",
      "",
      `- Total Crypto Market Cap: ${formatNumber(capital.totalCryptoMarketCap)} (${formatPct(capital.marketCapChange24h)} 24h)`,
      `- BTC Dominance: ${capital.btcDominance.toFixed(1)}% (${formatPct(capital.btcDominanceChange)} 24h)`,
      `- Total Stablecoin Supply: ${formatNumber(capital.totalStablecoinSupply)} (${formatPct(capital.stablecoinChange24h)} 24h)`,
      `- Fear & Greed Index: ${capital.fearGreedIndex} (${capital.fearGreedLabel})`,
      "",
    ];

    // Chain TVL top 10
    if (capital.chainTVL.length > 0) {
      flowLines.push("### Chain TVL (Top 10)");
      capital.chainTVL.slice(0, 10).forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${formatNumber(d.value)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Stablecoins by chain
    if (capital.stablecoinsByChain.length > 0) {
      flowLines.push("### Stablecoins by Chain");
      capital.stablecoinsByChain.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${formatNumber(d.value)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Bridge volumes
    if (capital.bridgeVolumes.length > 0) {
      flowLines.push("### Bridge Volumes");
      capital.bridgeVolumes.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${formatNumber(d.value)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Top yields
    if (capital.defiYields.length > 0) {
      flowLines.push("### Top DeFi Yields");
      capital.defiYields.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${d.value.toFixed(2)}% APY (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Commodities
    if (macro.commodities.length > 0) {
      flowLines.push("### Commodities");
      macro.commodities.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${formatNumber(d.value)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Energy
    if (macro.energy.length > 0) {
      flowLines.push("### Energy");
      macro.energy.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${formatNumber(d.value)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // FX
    if (macro.fx.length > 0) {
      flowLines.push("### FX");
      macro.fx.forEach((d) => {
        flowLines.push(
          `- ${d.name}: ${d.value.toFixed(4)} (${formatPct(d.changePct24h)} 24h)`
        );
      });
      flowLines.push("");
    }

    // Flow streams
    if (streams.length > 0) {
      flowLines.push("### Flow Streams");
      streams.forEach((s) => {
        flowLines.push(
          `- ${s.from} → ${s.to}: ${formatNumber(s.value)} ${s.label} (${s.direction}, ${formatPct(s.changePct)})`
        );
      });
      flowLines.push("");
    }

    // ── Build Signal Clusters section ──
    const clusterLines = ["## SIGNAL CLUSTERS (Top 10)", ""];
    snapshot.clusters.slice(0, 10).forEach((cluster, i) => {
      clusterLines.push(`### ${i + 1}. ${cluster.name}`);
      clusterLines.push(`- Signal Score: ${cluster.signalScore}`);
      clusterLines.push(`- Strength: ${cluster.signalStrength}`);
      clusterLines.push(`- Sources: ${cluster.sourceCount}`);
      clusterLines.push(`- Verticals: ${cluster.verticals.join(", ")}`);
      if (cluster.flowIndicators && cluster.flowIndicators.length > 0) {
        const indicators = cluster.flowIndicators
          .map((fi) => `${fi.label} (${fi.category}, ${fi.direction}, magnitude: ${fi.magnitude})`)
          .join("; ");
        clusterLines.push(`- Flow Indicators: ${indicators}`);
      }
      if (cluster.items.length > 0) {
        clusterLines.push("- Key items:");
        cluster.items.slice(0, 3).forEach((ci) => {
          let line = `  - [${ci.sourceLabel}] ${ci.item.title}`;
          if (ci.item.score !== undefined) line += ` (score: ${ci.item.score})`;
          if (ci.item.description) line += ` — ${ci.item.description}`;
          clusterLines.push(line);
        });
      }
      clusterLines.push("");
    });

    // ── Priority Breakdown ──
    const priorityLines = ["## PRIORITY BREAKDOWN", ""];
    for (const [vertical, count] of Object.entries(snapshot.priorityBreakdown)) {
      priorityLines.push(`- ${vertical}: ${count}`);
    }
    priorityLines.push("");

    // ── Business Profile section ──
    const profileLines: string[] = [];
    if (profile) {
      profileLines.push("## BUSINESS PROFILE", "");
      profileLines.push(`- Organization: ${profile.orgName}`);
      profileLines.push(`- Description: ${profile.description}`);
      profileLines.push(`- Edge: ${profile.edge}`);
      profileLines.push(`- Risk Tolerance: ${profile.riskTolerance}`);
      profileLines.push(`- Regions: ${profile.regions.join(", ")}`);
      profileLines.push("");

      if (profile.portfolio.length > 0) {
        profileLines.push("### Portfolio Companies");
        profile.portfolio.forEach((co) => {
          profileLines.push(`- **${co.name}** (${co.category}, ${co.stage})`);
          profileLines.push(`  Focus: ${co.focus}`);
          profileLines.push(`  Keywords: ${co.keywords.join(", ")}`);
        });
        profileLines.push("");
      }

      if (profile.goals.length > 0) {
        profileLines.push(`### Goals`);
        profile.goals.forEach((g) => profileLines.push(`- ${g}`));
        profileLines.push("");
      }

      if (profile.interests.length > 0) {
        profileLines.push(`### Interests`);
        profile.interests.forEach((i) => profileLines.push(`- ${i}`));
        profileLines.push("");
      }
    }

    // ── Actions section ──
    const actionLines: string[] = [];
    if (snapshot.actions) {
      actionLines.push("## CURRENT ACTIONS (Top 10)", "");
      snapshot.actions.actions.slice(0, 10).forEach((action, i) => {
        actionLines.push(`${i + 1}. [${action.type.toUpperCase()}] ${action.title}`);
        actionLines.push(`   Urgency: ${action.urgency} | Confidence: ${action.confidence}`);
        actionLines.push(`   Play: ${action.specificPlay}`);
        actionLines.push(`   Rationale: ${action.rationale}`);
        actionLines.push("");
      });
    }

    // ── Assemble user message ──
    const userMessage = [
      `Data snapshot from ${snapshot.createdAt}:`,
      "",
      flowLines.join("\n"),
      clusterLines.join("\n"),
      priorityLines.join("\n"),
      ...profileLines.length > 0 ? [profileLines.join("\n")] : [],
      ...actionLines.length > 0 ? [actionLines.join("\n")] : [],
      "",
      "Synthesize this into a strategic intelligence briefing following the format in your instructions.",
    ].join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text || "No summary generated.";
  } catch (err: any) {
    console.error("AI Briefing error:", err.message || String(err));
    if (err.status) console.error("AI Briefing status:", err.status);
    if (err.error) console.error("AI Briefing details:", JSON.stringify(err.error));
    return undefined;
  }
}
