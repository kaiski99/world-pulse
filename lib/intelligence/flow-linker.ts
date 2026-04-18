import type { FlowSnapshot, FlowDataPoint, FlowIndicator, SignalCluster } from '../types';

/**
 * Link flow data to signal clusters, enriching them with FlowIndicators
 * and boosting scores when signal + flow data converge.
 */
export function linkFlowsToClusters(
  clusters: SignalCluster[],
  flows: FlowSnapshot
): SignalCluster[] {
  // 1. Build mapping: entity names → FlowDataPoint
  const flowMap = new Map<string, FlowDataPoint>();

  // Chain names → chainTVL data
  for (const dp of flows.capital.chainTVL) {
    flowMap.set(dp.name.toLowerCase(), dp);
  }

  // Commodity names → commodity FlowDataPoint
  for (const dp of flows.macro.commodities) {
    flowMap.set(dp.name.toLowerCase(), dp);
  }

  // Energy data
  for (const dp of flows.macro.energy) {
    flowMap.set(dp.name.toLowerCase(), dp);
  }

  // "bitcoin" → market data (use first chainTVL entry or build from capital data)
  const btcData = flows.capital.chainTVL.find(
    (dp) => dp.name.toLowerCase() === 'bitcoin'
  );
  if (btcData) {
    flowMap.set('bitcoin', btcData);
  }

  // "ethereum" → ETH TVL data
  const ethData = flows.capital.chainTVL.find(
    (dp) => dp.name.toLowerCase() === 'ethereum'
  );
  if (ethData) {
    flowMap.set('ethereum', ethData);
  }

  const { fearGreedIndex, marketCapChange24h } = flows.capital;

  // 2-3. For each cluster, check entity names against map
  const enriched = clusters.map((cluster) => {
    const indicators: FlowIndicator[] = [...(cluster.flowIndicators ?? [])];
    let scoreBoost = 0;
    let hasSignalEntity = false;
    let hasFlowIndicator = false;

    for (const entity of cluster.entities) {
      const dp = flowMap.get(entity.name.toLowerCase());
      if (dp) {
        hasFlowIndicator = true;

        indicators.push({
          label: `${dp.name}: ${dp.changePct24h >= 0 ? '+' : ''}${dp.changePct24h.toFixed(1)}% (${dp.unit})`,
          category: dp.category,
          direction: dp.direction,
          magnitude: Math.abs(dp.changePct24h),
        });
      }

      // Any entity with 2+ sources counts as a "signal entity"
      if (entity.sources.length >= 2) {
        hasSignalEntity = true;
      }
    }

    // If cluster has BOTH signal entity AND flow indicator, boost +15
    if (hasSignalEntity && hasFlowIndicator) {
      scoreBoost += 15;
    }

    // 4. Market-wide indicators for defi clusters
    const isDefi = cluster.verticals.includes('defi');
    if (isDefi) {
      if (fearGreedIndex < 25) {
        indicators.push({
          label: 'Extreme Fear',
          category: 'capital',
          direction: 'down',
          magnitude: 25 - fearGreedIndex,
        });
      } else if (fearGreedIndex > 75) {
        indicators.push({
          label: 'Extreme Greed',
          category: 'capital',
          direction: 'up',
          magnitude: fearGreedIndex - 75,
        });
      }

      if (Math.abs(marketCapChange24h) > 5) {
        indicators.push({
          label: `Market ${marketCapChange24h > 0 ? 'Rally' : 'Decline'}: ${marketCapChange24h >= 0 ? '+' : ''}${marketCapChange24h.toFixed(1)}%`,
          category: 'capital',
          direction: marketCapChange24h > 0 ? 'up' : 'down',
          magnitude: Math.abs(marketCapChange24h),
        });
      }
    }

    // Recalculate strength if score changed
    const newScore = cluster.signalScore + scoreBoost;
    let signalStrength = cluster.signalStrength;
    if (scoreBoost > 0) {
      if (newScore >= 100) signalStrength = 'critical';
      else if (newScore >= 70) signalStrength = 'strong';
      else if (newScore >= 40) signalStrength = 'moderate';
      else signalStrength = 'weak';
    }

    return {
      ...cluster,
      flowIndicators: indicators.length > 0 ? indicators : undefined,
      signalScore: newScore,
      signalStrength,
    };
  });

  return enriched;
}
