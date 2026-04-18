import { FlowDataPoint, FlowStream, FlowCategory } from "../types";

type CapitalData = {
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
};

type MacroData = {
  commodities: FlowDataPoint[];
  energy: FlowDataPoint[];
  fx: FlowDataPoint[];
};

function stream(
  from: string,
  to: string,
  value: number,
  label: string,
  category: FlowCategory,
  direction: "inflow" | "outflow",
  changePct: number
): FlowStream {
  return { from, to, value: Math.abs(value), label, category, direction, changePct };
}

export function computeFlowStreams(capital: CapitalData, macro: MacroData): FlowStream[] {
  const streams: FlowStream[] = [];

  // 1. TradFi <-> Crypto based on marketCapChange24h
  if (capital.marketCapChange24h !== 0) {
    const direction = capital.marketCapChange24h > 0 ? "inflow" : "outflow";
    streams.push(
      stream(
        direction === "inflow" ? "TradFi" : "Crypto",
        direction === "inflow" ? "Crypto" : "TradFi",
        capital.totalCryptoMarketCap * Math.abs(capital.marketCapChange24h) / 100,
        `Market cap ${capital.marketCapChange24h > 0 ? "+" : ""}${capital.marketCapChange24h.toFixed(2)}%`,
        "capital",
        direction,
        capital.marketCapChange24h
      )
    );
  }

  // 2. Stablecoin Supply -> each chain with positive/negative change
  for (const chain of capital.stablecoinsByChain) {
    if (chain.changePct24h === 0) continue;
    const dir = chain.changePct24h > 0 ? "inflow" : "outflow";
    streams.push(
      stream(
        dir === "inflow" ? "Stablecoin Supply" : chain.name,
        dir === "inflow" ? chain.name : "Stablecoin Supply",
        Math.abs(chain.change24h),
        `${chain.name} stablecoin ${dir}`,
        "capital",
        dir,
        chain.changePct24h
      )
    );
  }

  // 3. Cross-Chain -> bridge name for each bridge volume
  for (const bridge of capital.bridgeVolumes) {
    streams.push(
      stream(
        "Cross-Chain",
        bridge.name,
        bridge.value,
        `Bridge volume: ${bridge.name}`,
        "capital",
        "inflow",
        bridge.changePct24h
      )
    );
  }

  // 4. Capital -> DeFi Yields if TVL growing
  const totalYieldTVL = capital.defiYields.reduce(
    (sum, y) => sum + (y.metadata?.tvl ?? 0),
    0
  );
  if (totalYieldTVL > 0) {
    streams.push(
      stream(
        "Capital",
        "DeFi Yields",
        totalYieldTVL,
        `Capital flowing to DeFi yield pools`,
        "capital",
        "inflow",
        0
      )
    );
  }

  // 5. USD <-> Gold based on gold price direction
  const gold = macro.commodities.find(
    (c) => c.name.toLowerCase().includes("gold") && !c.metadata?.placeholder
  ) ?? macro.commodities.find((c) => c.name.toLowerCase().includes("gold"));
  if (gold) {
    const dir = gold.direction === "up" ? "inflow" : gold.direction === "down" ? "outflow" : "inflow";
    streams.push(
      stream(
        dir === "inflow" ? "USD" : "Gold",
        dir === "inflow" ? "Gold" : "USD",
        gold.value,
        `Gold ${gold.direction}: ${gold.changePct24h >= 0 ? "+" : ""}${gold.changePct24h.toFixed(2)}%`,
        "commodity",
        dir,
        gold.changePct24h
      )
    );
  }

  // 6. USD <-> Oil based on oil price direction
  const oil = macro.energy.find((c) =>
    c.name.toLowerCase().includes("wti") || c.name.toLowerCase().includes("crude")
  );
  if (oil) {
    const dir = oil.direction === "up" ? "inflow" : oil.direction === "down" ? "outflow" : "inflow";
    streams.push(
      stream(
        dir === "inflow" ? "USD" : "Oil",
        dir === "inflow" ? "Oil" : "USD",
        oil.value,
        `Oil ${oil.direction}: ${oil.changePct24h >= 0 ? "+" : ""}${oil.changePct24h.toFixed(2)}%`,
        "energy",
        dir,
        oil.changePct24h
      )
    );
  }

  // 7. USD strength: Foreign Currencies <-> USD based on avg FX change
  if (macro.fx.length > 0) {
    const avgChange =
      macro.fx.reduce((sum, f) => sum + f.changePct24h, 0) / macro.fx.length;
    // Positive avg change for non-inverted pairs (USD/X) means USD strengthening
    // For inverted pairs (X/USD), positive means USD weakening — mix is approximate
    const usdStrengthening = avgChange > 0;
    streams.push(
      stream(
        usdStrengthening ? "Foreign Currencies" : "USD",
        usdStrengthening ? "USD" : "Foreign Currencies",
        Math.abs(avgChange),
        `USD ${usdStrengthening ? "strengthening" : "weakening"} (avg ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(3)}%)`,
        "fx",
        usdStrengthening ? "inflow" : "outflow",
        avgChange
      )
    );
  }

  // 8. Crypto <-> Gold correlation label
  if (gold && capital.marketCapChange24h !== 0) {
    const sameDirection =
      (capital.marketCapChange24h > 0 && gold.direction === "up") ||
      (capital.marketCapChange24h < 0 && gold.direction === "down");
    streams.push(
      stream(
        "Crypto",
        "Gold",
        0,
        sameDirection
          ? "Crypto-Gold positively correlated"
          : "Crypto-Gold negatively correlated (diverging)",
        "commodity",
        sameDirection ? "inflow" : "outflow",
        0
      )
    );
  }

  return streams;
}
