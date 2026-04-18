import { FlowDataPoint } from "../types";

export async function fetchCapitalFlows() {
  console.log("[capital] Starting capital flow fetches...");

  const result: {
    totalCryptoMarketCap: number;
    marketCapChange24h: number;
    btcDominance: number;
    btcDominanceChange: number;
    totalStablecoinSupply: number;
    stablecoinChange24h: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    stablecoinsByChain: FlowDataPoint[];
    bridgeVolumes: FlowDataPoint[];
    chainTVL: FlowDataPoint[];
    defiYields: FlowDataPoint[];
  } = {
    totalCryptoMarketCap: 0,
    marketCapChange24h: 0,
    btcDominance: 0,
    btcDominanceChange: 0,
    totalStablecoinSupply: 0,
    stablecoinChange24h: 0,
    fearGreedIndex: 0,
    fearGreedLabel: "",
    stablecoinsByChain: [],
    bridgeVolumes: [],
    chainTVL: [],
    defiYields: [],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const signal = controller.signal;

  const fetchJSON = async (url: string) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };

  const [
    globalRes,
    stablecoinsRes,
    chainsRes,
    bridgesRes,
    fngRes,
    yieldsRes,
  ] = await Promise.allSettled([
    // a) CoinGecko Global
    fetchJSON("https://api.coingecko.com/api/v3/global"),
    // b) DeFi Llama Stablecoins
    fetchJSON("https://stablecoins.llama.fi/stablecoins?includePrices=true"),
    // c) DeFi Llama Chains
    fetchJSON("https://api.llama.fi/v2/chains"),
    // d) DeFi Llama Bridges
    fetchJSON("https://bridges.llama.fi/bridges?includeChains=true"),
    // e) Fear & Greed
    fetchJSON("https://api.alternative.me/fng/?limit=2"),
    // f) DeFi Llama Yields
    fetchJSON("https://yields.llama.fi/pools"),
  ]);

  clearTimeout(timeout);

  // a) CoinGecko Global
  if (globalRes.status === "fulfilled") {
    try {
      const data = globalRes.value?.data;
      if (data) {
        result.totalCryptoMarketCap = data.total_market_cap?.usd ?? 0;
        result.marketCapChange24h = data.market_cap_change_percentage_24h_usd ?? 0;
        result.btcDominance = data.market_cap_percentage?.btc ?? 0;
        result.btcDominanceChange = (data.market_cap_percentage?.btc ?? 50) - 50;
      }
    } catch (e) {
      console.log("[capital] Error processing CoinGecko global data:", e);
    }
  } else {
    console.log("[capital] CoinGecko global fetch failed:", globalRes.reason);
  }

  // b) DeFi Llama Stablecoins
  if (stablecoinsRes.status === "fulfilled") {
    try {
      const stablecoins: any[] = stablecoinsRes.value?.peggedAssets ?? [];
      let totalSupply = 0;
      let totalPrevDay = 0;
      const chainMap: Record<string, { current: number; prev: number }> = {};

      for (const coin of stablecoins) {
        const circulating = coin.circulating?.peggedUSD ?? coin.peggedUSD ?? 0;
        const prevDay = coin.circulatingPrevDay?.peggedUSD ?? circulating;
        totalSupply += circulating;
        totalPrevDay += prevDay;

        const chainCirculating = coin.chainCirculating ?? {};
        for (const [chain, data] of Object.entries<any>(chainCirculating)) {
          const chainCurrent = data?.current?.peggedUSD ?? data?.peggedUSD ?? 0;
          const chainPrev = data?.circulatingPrevDay?.peggedUSD ?? chainCurrent;
          if (!chainMap[chain]) chainMap[chain] = { current: 0, prev: 0 };
          chainMap[chain].current += chainCurrent;
          chainMap[chain].prev += chainPrev;
        }
      }

      result.totalStablecoinSupply = totalSupply;
      result.stablecoinChange24h = totalPrevDay > 0
        ? ((totalSupply - totalPrevDay) / totalPrevDay) * 100
        : 0;

      const sortedChains = Object.entries(chainMap)
        .sort((a, b) => b[1].current - a[1].current)
        .slice(0, 10);

      result.stablecoinsByChain = sortedChains.map(([chain, val], i) => {
        const changePct = val.prev > 0
          ? ((val.current - val.prev) / val.prev) * 100
          : 0;
        return {
          id: `stablecoin-chain-${chain.toLowerCase().replace(/\s+/g, "-")}`,
          category: "capital" as const,
          name: chain,
          value: val.current,
          unit: "$",
          change24h: val.current - val.prev,
          changePct24h: changePct,
          direction: changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "flat",
        };
      });
    } catch (e) {
      console.log("[capital] Error processing stablecoin data:", e);
    }
  } else {
    console.log("[capital] Stablecoin fetch failed:", stablecoinsRes.reason);
  }

  // c) DeFi Llama Chains
  if (chainsRes.status === "fulfilled") {
    try {
      const chains: any[] = chainsRes.value ?? [];
      const topChains = chains
        .filter((c: any) => typeof c.tvl === "number")
        .sort((a: any, b: any) => b.tvl - a.tvl)
        .slice(0, 15);

      result.chainTVL = topChains.map((c: any) => ({
        id: `chain-tvl-${(c.name ?? c.gecko_id ?? "unknown").toLowerCase().replace(/\s+/g, "-")}`,
        category: "capital" as const,
        name: c.name ?? c.gecko_id ?? "Unknown",
        value: c.tvl ?? 0,
        unit: "$",
        change24h: 0,
        changePct24h: 0,
        direction: "flat" as const,
        metadata: { gecko_id: c.gecko_id, tokenSymbol: c.tokenSymbol },
      }));
    } catch (e) {
      console.log("[capital] Error processing chain TVL data:", e);
    }
  } else {
    console.log("[capital] Chains fetch failed:", chainsRes.reason);
  }

  // d) DeFi Llama Bridges
  if (bridgesRes.status === "fulfilled") {
    try {
      const bridges: any[] = bridgesRes.value?.bridges ?? [];
      const topBridges = bridges
        .filter((b: any) => typeof b.lastDailyVolume === "number")
        .sort((a: any, b: any) => (b.lastDailyVolume ?? 0) - (a.lastDailyVolume ?? 0))
        .slice(0, 10);

      result.bridgeVolumes = topBridges.map((b: any) => ({
        id: `bridge-${(b.displayName ?? b.name ?? "unknown").toLowerCase().replace(/\s+/g, "-")}`,
        category: "capital" as const,
        name: b.displayName ?? b.name ?? "Unknown",
        value: b.lastDailyVolume ?? 0,
        unit: "$",
        change24h: 0,
        changePct24h: 0,
        direction: "flat" as const,
        metadata: { chains: b.chains },
      }));
    } catch (e) {
      console.log("[capital] Error processing bridge data:", e);
    }
  } else {
    console.log("[capital] Bridges fetch failed:", bridgesRes.reason);
  }

  // e) Fear & Greed Index
  if (fngRes.status === "fulfilled") {
    try {
      const fngData = fngRes.value?.data;
      if (Array.isArray(fngData) && fngData.length >= 1) {
        result.fearGreedIndex = Number(fngData[0].value) || 0;
        result.fearGreedLabel = fngData[0].value_classification ?? "";

        if (fngData.length >= 2) {
          const current = Number(fngData[0].value) || 0;
          const previous = Number(fngData[1].value) || 0;
          const diff = current - previous;
          // Store direction info in the label if needed
          if (diff > 0) {
            result.fearGreedLabel += " (rising)";
          } else if (diff < 0) {
            result.fearGreedLabel += " (falling)";
          }
        }
      }
    } catch (e) {
      console.log("[capital] Error processing Fear & Greed data:", e);
    }
  } else {
    console.log("[capital] Fear & Greed fetch failed:", fngRes.reason);
  }

  // f) DeFi Llama Yields
  if (yieldsRes.status === "fulfilled") {
    try {
      const pools: any[] = yieldsRes.value?.data ?? [];
      const filtered = pools
        .filter(
          (p: any) =>
            p.stablecoin === true && typeof p.tvlUsd === "number" && p.tvlUsd > 1_000_000
        )
        .sort((a: any, b: any) => (b.apy ?? 0) - (a.apy ?? 0))
        .slice(0, 10);

      result.defiYields = filtered.map((p: any) => ({
        id: `yield-${(p.pool ?? p.symbol ?? "unknown").toLowerCase().replace(/\s+/g, "-")}`,
        category: "capital" as const,
        name: `${p.symbol ?? "?"} on ${p.project ?? "?"} (${p.chain ?? "?"})`,
        value: p.apy ?? 0,
        unit: "%",
        change24h: 0,
        changePct24h: 0,
        direction: (p.apy ?? 0) > 5 ? "up" : "flat" as "up" | "down" | "flat",
        metadata: {
          tvl: p.tvlUsd,
          project: p.project,
          chain: p.chain,
          pool: p.pool,
        },
      }));
    } catch (e) {
      console.log("[capital] Error processing yield data:", e);
    }
  } else {
    console.log("[capital] Yields fetch failed:", yieldsRes.reason);
  }

  console.log("[capital] Capital flow fetches complete.");
  return result;
}
