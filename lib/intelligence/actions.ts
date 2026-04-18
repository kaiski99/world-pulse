import type {
  PulseSnapshot,
  BusinessProfile,
  Action,
  ActionsSnapshot,
  ActionType,
  ActionUrgency,
  ActionConfidence,
  PriorityVertical,
  FlowDataPoint,
} from '../types';

// ─── Helpers ───

const URGENCY_ORDER: Record<ActionUrgency, number> = {
  now: 0,
  'this-week': 1,
  watch: 2,
  'long-term': 3,
};

const CONFIDENCE_ORDER: Record<ActionConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const CONFIDENCE_WEIGHT: Record<ActionConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const ATTENTION_SOURCES = ['google-trends', 'reddit', 'hackernews'];
const BUILDER_SOURCES = ['github', 'paperswithcode'];

function matchesPortfolioKeywords(
  text: string,
  profile: BusinessProfile
): string | undefined {
  const lower = text.toLowerCase();
  for (const company of profile.portfolio) {
    for (const kw of company.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return company.name;
      }
    }
  }
  return undefined;
}

// ─── Market Regime ───

interface MarketRegime {
  label: string;
  directive: string;
}

function computeMarketRegime(snapshot: PulseSnapshot): MarketRegime {
  const { flows } = snapshot;

  // Crypto direction
  const cryptoUp = flows.capital.marketCapChange24h > 0;

  // Gold direction — look for gold in commodities
  const gold = flows.macro.commodities.find(
    (c) => c.name.toLowerCase().includes('gold') || c.id.toLowerCase().includes('gold')
  );
  const goldUp = gold ? gold.direction === 'up' : false;

  // USD direction — average FX change (positive = dollar strengthening)
  const fxPoints = flows.macro.fx;
  const avgFx =
    fxPoints.length > 0
      ? fxPoints.reduce((sum, f) => sum + f.changePct24h, 0) / fxPoints.length
      : 0;
  const dollarUp = avgFx > 0;

  if (cryptoUp && goldUp && !dollarUp) {
    return {
      label: 'Liquidity Expansion 🟢',
      directive: 'Deploy aggressively into growth positions and building.',
    };
  }
  if (cryptoUp && !goldUp) {
    return {
      label: 'Risk-On 🔵',
      directive: 'Favor crypto exposure, DeFi yields, and trading setups.',
    };
  }
  if (!cryptoUp && goldUp) {
    return {
      label: 'Flight to Safety 🟡',
      directive: 'Focus on stablecoin yields, reduce trading, prioritize building.',
    };
  }
  if (!cryptoUp && !goldUp && dollarUp) {
    return {
      label: 'Liquidity Contraction 🔴',
      directive: 'Park in stables, harvest yields, focus on BD and building.',
    };
  }
  return {
    label: 'Mixed Regime ⚪',
    directive: 'Be selective. Prioritize high-conviction signals only.',
  };
}

// ─── Yield Actions ───

function generateYieldActions(
  snapshot: PulseSnapshot,
  profile: BusinessProfile
): Action[] {
  const yields = snapshot.flows.capital.defiYields;
  const chainTVL = snapshot.flows.capital.chainTVL;

  const actions: Action[] = [];

  for (const y of yields) {
    const apy = y.value;
    if (apy <= 5) continue;

    const tvl = y.metadata?.tvl ?? 0;
    const chain = y.metadata?.chain ?? y.name;
    const chainData = chainTVL.find(
      (c) => c.name.toLowerCase() === chain.toLowerCase()
    );
    const chainGrowing = chainData ? chainData.direction === 'up' : false;

    // Urgency
    let urgency: ActionUrgency = 'watch';
    if (apy > 15) urgency = 'now';
    else if (apy > 10) urgency = 'this-week';

    // Confidence
    let confidence: ActionConfidence = 'low';
    if (tvl > 10_000_000 && chainGrowing) confidence = 'high';
    else if (tvl > 5_000_000) confidence = 'medium';

    const relevantCompany = matchesPortfolioKeywords(
      `${y.name} ${chain}`,
      profile
    );

    const tvlNote = chainGrowing ? ` Chain TVL is growing.` : '';

    actions.push({
      id: crypto.randomUUID(),
      type: 'yield',
      title: `Farm ${apy.toFixed(1)}% on ${y.name}`,
      rationale: `${y.name} is offering ${apy.toFixed(1)}% APY.${tvlNote}`,
      specificPlay: `Deposit into ${y.name}. APY: ${apy.toFixed(1)}%.`,
      urgency,
      confidence,
      potentialUpside: `${apy.toFixed(1)}% annualized`,
      risk: 'Smart contract risk, APY may decrease',
      relatedFlows: [y.id],
      relevantCompany,
      sourceEvidence: [`defiYield:${y.id}`],
      tags: ['defi'] as PriorityVertical[],
    });
  }

  // Sort by APY * confidence weight descending
  actions.sort((a, b) => {
    const yieldA = yields.find((y) => y.id === a.relatedFlows?.[0]);
    const yieldB = yields.find((y) => y.id === b.relatedFlows?.[0]);
    const scoreA = (yieldA?.value ?? 0) * CONFIDENCE_WEIGHT[a.confidence];
    const scoreB = (yieldB?.value ?? 0) * CONFIDENCE_WEIGHT[b.confidence];
    return scoreB - scoreA;
  });

  return actions.slice(0, 8);
}

// ─── Trade Actions ───

function generateTradeActions(
  snapshot: PulseSnapshot,
  _profile: BusinessProfile
): Action[] {
  const actions: Action[] = [];

  // a) CoinGecko trending items with cluster convergence
  const coingeckoSources = snapshot.sources.filter(
    (s) => s.source === 'coingecko'
  );
  for (const src of coingeckoSources) {
    for (const item of src.items) {
      const matchedCluster = snapshot.clusters.find(
        (c) =>
          (c.signalStrength === 'strong' || c.signalStrength === 'critical') &&
          c.items.some(
            (ci) =>
              ci.item.title.toLowerCase().includes(item.title.toLowerCase()) ||
              item.title.toLowerCase().includes(ci.item.title.toLowerCase())
          )
      );

      if (matchedCluster) {
        const urgency: ActionUrgency =
          matchedCluster.signalStrength === 'critical' ? 'now' : 'this-week';

        actions.push({
          id: crypto.randomUUID(),
          type: 'trade',
          title: `Watch ${item.title}: trending + signal convergence`,
          rationale: `${item.title} is trending on CoinGecko and appears in the "${matchedCluster.name}" cluster (${matchedCluster.signalStrength}).`,
          specificPlay: `Monitor ${item.title} for entry. Cluster signal strength: ${matchedCluster.signalStrength}.`,
          urgency,
          confidence: matchedCluster.signalStrength === 'critical' ? 'high' : 'medium',
          potentialUpside: 'Momentum-driven price action',
          risk: 'Trending coins can reverse quickly',
          relatedCluster: matchedCluster.id,
          sourceEvidence: [`coingecko:${item.id}`, `cluster:${matchedCluster.id}`],
          tags: matchedCluster.verticals.length > 0 ? matchedCluster.verticals : ['general'],
        });
      }
    }
  }

  // b) Polymarket items with probability 60-85%
  const polymarketSources = snapshot.sources.filter(
    (s) => s.source === 'polymarket'
  );
  for (const src of polymarketSources) {
    for (const item of src.items) {
      const probability = item.score ?? item.metadata?.probability;
      if (probability != null && probability >= 60 && probability <= 85) {
        actions.push({
          id: crypto.randomUUID(),
          type: 'trade',
          title: `Polymarket: ${item.title} — ${probability}%`,
          rationale: `Prediction market shows ${probability}% probability. Edge may exist if mispriced.`,
          specificPlay: `Current odds: ${probability}%`,
          urgency: 'this-week',
          confidence: probability >= 75 ? 'medium' : 'low',
          potentialUpside: `${(100 / probability * 100 - 100).toFixed(0)}% return if resolved at 100%`,
          risk: 'Prediction market resolution risk',
          sourceEvidence: [`polymarket:${item.id}`],
          tags: ['general'],
        });
      }
    }
  }

  // c) Macro regime trade
  const regime = computeMarketRegime(snapshot);
  const regimeLabel = regime.label;

  let regimeAction: Action | null = null;

  if (regimeLabel.includes('Expansion') || regimeLabel.includes('Risk-On')) {
    regimeAction = {
      id: crypto.randomUUID(),
      type: 'trade',
      title: `Macro regime: ${regimeLabel} — favor long positions`,
      rationale: `Current macro regime is ${regimeLabel}. Conditions favor risk-on positioning.`,
      specificPlay: 'Increase crypto exposure. Consider leveraged positions on high-conviction assets.',
      urgency: 'this-week',
      confidence: 'medium',
      potentialUpside: 'Regime-aligned positioning',
      risk: 'Regime can shift quickly on macro data',
      sourceEvidence: ['macro:regime'],
      tags: ['general'],
    };
  } else if (regimeLabel.includes('Safety') || regimeLabel.includes('Contraction')) {
    regimeAction = {
      id: crypto.randomUUID(),
      type: 'trade',
      title: `Macro regime: ${regimeLabel} — reduce risk exposure`,
      rationale: `Current macro regime is ${regimeLabel}. Conditions favor defensive positioning.`,
      specificPlay: 'Rotate into stablecoins and reduce leveraged positions.',
      urgency: 'now',
      confidence: 'medium',
      potentialUpside: 'Capital preservation during downturn',
      risk: 'May miss reversal if regime shifts',
      sourceEvidence: ['macro:regime'],
      tags: ['general'],
    };
  } else {
    regimeAction = {
      id: crypto.randomUUID(),
      type: 'trade',
      title: `Macro regime: ${regimeLabel} — stay selective`,
      rationale: `Mixed signals across macro indicators. No clear directional bias.`,
      specificPlay: 'Only take high-conviction setups. Reduce position sizes.',
      urgency: 'watch',
      confidence: 'low',
      potentialUpside: 'Selective alpha in mixed environment',
      risk: 'Whipsaw risk in directionless markets',
      sourceEvidence: ['macro:regime'],
      tags: ['general'],
    };
  }

  if (regimeAction) actions.push(regimeAction);

  return actions.slice(0, 6);
}

// ─── Build Actions ───

function generateBuildActions(
  snapshot: PulseSnapshot,
  profile: BusinessProfile
): Action[] {
  const actions: Action[] = [];

  // a) High attention, low builder activity clusters
  for (const cluster of snapshot.clusters) {
    if (cluster.signalStrength !== 'strong' && cluster.signalStrength !== 'critical') {
      continue;
    }

    const attentionCount = cluster.items.filter((ci) =>
      ATTENTION_SOURCES.includes(ci.source)
    ).length;

    const builderCount = cluster.items.filter((ci) =>
      BUILDER_SOURCES.includes(ci.source)
    ).length;

    if (attentionCount >= 3 && builderCount <= 1) {
      const relevantCompany = matchesPortfolioKeywords(
        cluster.name + ' ' + cluster.entities.map((e) => e.name).join(' '),
        profile
      );

      actions.push({
        id: crypto.randomUUID(),
        type: 'build',
        title: `Build opportunity: ${cluster.name} — high attention, low builder activity`,
        rationale: `${cluster.name} has ${attentionCount} attention signals but only ${builderCount} builder signals. Gap indicates unmet demand.`,
        specificPlay: `Explore building in the ${cluster.name} space. Attention is high but few are shipping.`,
        urgency: 'this-week',
        confidence: cluster.signalStrength === 'critical' ? 'high' : 'medium',
        potentialUpside: 'First-mover advantage in high-attention space',
        risk: 'Attention may be fleeting',
        relatedCluster: cluster.id,
        relevantCompany,
        sourceEvidence: cluster.items.map((ci) => `${ci.source}:${ci.item.id}`),
        tags: cluster.verticals.length > 0 ? cluster.verticals : ['general'],
      });
    }
  }

  // b) Chain TVL surging
  for (const chain of snapshot.flows.capital.chainTVL) {
    if (chain.changePct24h > 5) {
      const relevantCompany = matchesPortfolioKeywords(chain.name, profile);

      actions.push({
        id: crypto.randomUUID(),
        type: 'build',
        title: `Build on ${chain.name}: TVL surging`,
        rationale: `${chain.name} TVL is up ${chain.changePct24h.toFixed(1)}% in 24h. Growing ecosystem signals opportunity.`,
        specificPlay: `Evaluate deploying or expanding on ${chain.name}. TVL momentum attracts users and liquidity.`,
        urgency: 'this-week',
        confidence: chain.changePct24h > 10 ? 'high' : 'medium',
        potentialUpside: 'Ecosystem growth tailwinds',
        risk: 'TVL growth may be temporary or incentive-driven',
        relatedFlows: [chain.id],
        relevantCompany,
        sourceEvidence: [`chainTVL:${chain.id}`],
        tags: ['defi'],
      });
    }
  }

  return actions.slice(0, 6);
}

// ─── Partnership / BD Actions ───

function generatePartnershipActions(
  snapshot: PulseSnapshot,
  profile: BusinessProfile
): Action[] {
  const actions: Action[] = [];

  // a) Clusters matching portfolio company keywords — external entities as BD leads
  for (const company of profile.portfolio) {
    for (const cluster of snapshot.clusters) {
      const clusterText =
        cluster.name +
        ' ' +
        cluster.entities.map((e) => e.name).join(' ');

      const matches = company.keywords.some((kw) =>
        clusterText.toLowerCase().includes(kw.toLowerCase())
      );

      if (!matches) continue;

      // External entities in the same cluster that are not the company itself
      const externalEntities = cluster.entities.filter(
        (e) =>
          e.name.toLowerCase() !== company.name.toLowerCase() &&
          (e.type === 'company' || e.type === 'protocol' || e.type === 'chain')
      );

      for (const entity of externalEntities) {
        actions.push({
          id: crypto.randomUUID(),
          type: 'partnership',
          title: `BD lead for ${company.name}: ${entity.displayName} in same cluster`,
          rationale: `${entity.displayName} appears in the "${cluster.name}" cluster alongside signals relevant to ${company.name}.`,
          specificPlay: `Reach out to ${entity.displayName} for potential partnership with ${company.name}.`,
          urgency: cluster.signalStrength === 'critical' ? 'this-week' : 'watch',
          confidence:
            entity.mentions >= 3 ? 'high' : entity.mentions >= 2 ? 'medium' : 'low',
          potentialUpside: 'Strategic partnership or integration',
          risk: 'Partnership may not materialize',
          relatedCluster: cluster.id,
          relevantCompany: company.name,
          sourceEvidence: entity.sources.map((s) => `${s}:${entity.name}`),
          tags: cluster.verticals.length > 0 ? cluster.verticals : ['general'],
        });
      }
    }
  }

  // b) GitHub trending repos matching portfolio focus
  const githubSources = snapshot.sources.filter((s) => s.source === 'github');
  for (const src of githubSources) {
    for (const item of src.items) {
      for (const company of profile.portfolio) {
        const itemText = `${item.title} ${item.description ?? ''}`.toLowerCase();
        const matches = company.keywords.some((kw) =>
          itemText.includes(kw.toLowerCase())
        );

        if (matches) {
          actions.push({
            id: crypto.randomUUID(),
            type: 'partnership',
            title: `Integration opportunity: ${item.title} for ${company.name}`,
            rationale: `${item.title} is trending on GitHub and aligns with ${company.name}'s focus (${company.focus}).`,
            specificPlay: `Evaluate integrating or forking ${item.title} for ${company.name}.`,
            urgency: 'watch',
            confidence: (item.score ?? 0) > 100 ? 'medium' : 'low',
            potentialUpside: 'Technical integration or collaboration',
            risk: 'Repo may be early-stage or unmaintained',
            relevantCompany: company.name,
            sourceEvidence: [`github:${item.id}`],
            tags: company.category
              ? ([company.category] as PriorityVertical[])
              : ['general'],
          });
        }
      }
    }
  }

  return actions.slice(0, 6);
}

// ─── Main Export ───

export function generateActions(
  snapshot: PulseSnapshot,
  profile: BusinessProfile
): ActionsSnapshot {
  const regime = computeMarketRegime(snapshot);

  const yieldActions = generateYieldActions(snapshot, profile);
  const tradeActions = generateTradeActions(snapshot, profile);
  const buildActions = generateBuildActions(snapshot, profile);
  const partnershipActions = generatePartnershipActions(snapshot, profile);

  const allActions = [
    ...yieldActions,
    ...tradeActions,
    ...buildActions,
    ...partnershipActions,
  ];

  // Sort by urgency then confidence
  allActions.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
  });

  return {
    generatedAt: new Date().toISOString(),
    actions: allActions,
    marketRegime: regime.label,
    strategicDirective: regime.directive,
  };
}
