import { NextResponse } from "next/server";
import crypto from "crypto";

import { fetchGoogleTrends } from "@/lib/sources/google-trends";
import { fetchReddit } from "@/lib/sources/reddit";
import { fetchCoinGecko } from "@/lib/sources/coingecko";
import { fetchPolymarket } from "@/lib/sources/polymarket";
import { fetchGitHub } from "@/lib/sources/github";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchPapersWithCode } from "@/lib/sources/paperswithcode";
import { fetchDeFiLlama } from "@/lib/sources/defillama";
import { fetchCapitalFlows } from "@/lib/flows/capital";
import { fetchMacroFlows } from "@/lib/flows/macro";
import { tagItems } from "@/lib/tagger";
import { extractEntities } from "@/lib/intelligence/entities";
import { buildClusters } from "@/lib/intelligence/clustering";
import { scoreClusters } from "@/lib/intelligence/signals";
import { buildGraph } from "@/lib/intelligence/graph";
import { computeFlowStreams } from "@/lib/flows/streams";
import { computeHeatmap } from "@/lib/flows/heatmap";
import { linkFlowsToClusters } from "@/lib/intelligence/flow-linker";
import { generateActions } from "@/lib/intelligence/actions";
import { generateSummary } from "@/lib/ai/summarize";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/config/business-profile";

import type {
  SourceResult,
  FlowSnapshot,
  FlowDataPoint,
  PulseSnapshot,
  PriorityVertical,
  BusinessProfile,
} from "@/lib/types";

// Default empty capital object for error fallback
const EMPTY_CAPITAL = {
  totalCryptoMarketCap: 0,
  marketCapChange24h: 0,
  btcDominance: 0,
  btcDominanceChange: 0,
  totalStablecoinSupply: 0,
  stablecoinChange24h: 0,
  fearGreedIndex: 0,
  fearGreedLabel: "",
  stablecoinsByChain: [] as FlowDataPoint[],
  bridgeVolumes: [] as FlowDataPoint[],
  chainTVL: [] as FlowDataPoint[],
  defiYields: [] as FlowDataPoint[],
};

// Default empty macro object for error fallback
const EMPTY_MACRO = {
  commodities: [] as FlowDataPoint[],
  energy: [] as FlowDataPoint[],
  fx: [] as FlowDataPoint[],
};

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const shouldSummarize = url.searchParams.get("summarize") === "true";
  const shouldGenerateActions = url.searchParams.get("actions") === "true";

  // 1. Read profile from POST body if available, else use default
  let profile: BusinessProfile = DEFAULT_BUSINESS_PROFILE;
  if (request.method === "POST") {
    try {
      const body = await request.json();
      if (body.profile) {
        profile = body.profile;
      }
    } catch {
      // Use default profile if body parsing fails
    }
  }

  // 2. Fetch all 8 signal sources + 2 flow sources in parallel
  const [
    googleTrendsResult,
    redditResult,
    coinGeckoResult,
    polymarketResult,
    gitHubResult,
    hackerNewsResult,
    papersWithCodeResult,
    defiLlamaResult,
    capitalFlowsResult,
    macroFlowsResult,
  ] = await Promise.allSettled([
    fetchGoogleTrends(),
    fetchReddit(),
    fetchCoinGecko(),
    fetchPolymarket(),
    fetchGitHub(),
    fetchHackerNews(),
    fetchPapersWithCode(),
    fetchDeFiLlama(),
    fetchCapitalFlows(),
    fetchMacroFlows(),
  ]);

  // Extract signal source results
  const signalResults = [
    googleTrendsResult,
    redditResult,
    coinGeckoResult,
    polymarketResult,
    gitHubResult,
    hackerNewsResult,
    papersWithCodeResult,
    defiLlamaResult,
  ];

  const sources: SourceResult[] = signalResults.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          source: "unknown",
          label: "Unknown",
          icon: "?",
          fetchedAt: new Date().toISOString(),
          items: [],
          error: String((r as PromiseRejectedResult).reason),
        }
  );

  // 3. Tag all signal source items
  for (const source of sources) {
    source.items = tagItems(source.items);
  }

  // 4. Extract entities from all signal source items
  for (const source of sources) {
    source.items = extractEntities(source.items);
  }

  // 5. Build clusters
  let clusters = buildClusters(sources);

  // 6. Score clusters
  clusters = scoreClusters(clusters);

  // 7. Assemble FlowSnapshot from capital + macro results
  const capitalResult =
    capitalFlowsResult.status === "fulfilled"
      ? capitalFlowsResult.value
      : EMPTY_CAPITAL;

  const macroResult =
    macroFlowsResult.status === "fulfilled"
      ? macroFlowsResult.value
      : EMPTY_MACRO;

  // 8. Compute flow streams
  const streams = computeFlowStreams(capitalResult, macroResult);

  // 9. Compute heatmap data
  const heatmapData = computeHeatmap(capitalResult, macroResult);

  const flows: FlowSnapshot = {
    fetchedAt: new Date().toISOString(),
    capital: capitalResult,
    macro: macroResult,
    streams,
    heatmapData,
  };

  // 10. Link flows to clusters
  clusters = linkFlowsToClusters(clusters, flows);

  // 11. Build graph
  const graph = buildGraph(clusters);

  // 12. Calculate priority breakdown
  const priorityBreakdown: Record<PriorityVertical, number> = {
    ai: 0,
    defi: 0,
    payments: 0,
    merchant: 0,
    institutional: 0,
    general: 0,
  };

  for (const source of sources) {
    for (const item of source.items) {
      if (item.tags) {
        for (const tag of item.tags) {
          priorityBreakdown[tag]++;
        }
      }
    }
  }

  // 13. Assemble PulseSnapshot
  const snapshot: PulseSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    sources,
    clusters,
    graph,
    flows,
    priorityBreakdown,
  };

  // 14. Generate actions if requested
  if (shouldGenerateActions) {
    snapshot.actions = generateActions(snapshot, profile);
  }

  // 15. Generate summary if requested
  if (shouldSummarize) {
    snapshot.summary = await generateSummary(snapshot, profile);
  }

  // 16. Return snapshot
  return NextResponse.json(snapshot);
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
