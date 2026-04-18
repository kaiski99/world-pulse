import type { SignalCluster } from '../types';

/**
 * Score and rank signal clusters by composite signal score.
 */
export function scoreClusters(clusters: SignalCluster[]): SignalCluster[] {
  return clusters
    .map((cluster) => {
      const { sourceCount, verticals, totalEngagement, items } = cluster;

      // Base score components
      let signalScore =
        sourceCount * 30 +
        verticals.length * 20 +
        Math.log10(totalEngagement + 1) * 10;

      // Bonus: +25 if any item from polymarket
      if (items.some((ci) => ci.source === 'polymarket')) {
        signalScore += 25;
      }

      // Bonus: +20 if items from both search/social AND builder source
      const searchSocialSources = new Set(['google-trends', 'reddit', 'hackernews']);
      const builderSources = new Set(['github', 'paperswithcode']);
      const itemSources = new Set(items.map((ci) => ci.source));
      const hasSearchSocial = [...itemSources].some((s) => searchSocialSources.has(s));
      const hasBuilder = [...itemSources].some((s) => builderSources.has(s));
      if (hasSearchSocial && hasBuilder) {
        signalScore += 20;
      }

      // Bonus: +15 if 3+ verticals
      if (verticals.length >= 3) {
        signalScore += 15;
      }

      // Bonus: +10 if any defillama item with |change_1d| > 10%
      if (
        items.some(
          (ci) =>
            ci.source === 'defillama' &&
            Math.abs(ci.item.metadata?.change_1d ?? 0) > 10
        )
      ) {
        signalScore += 10;
      }

      signalScore = Math.round(signalScore * 100) / 100;

      // Determine signal strength
      let signalStrength: SignalCluster['signalStrength'];
      if (signalScore >= 100) signalStrength = 'critical';
      else if (signalScore >= 70) signalStrength = 'strong';
      else if (signalScore >= 40) signalStrength = 'moderate';
      else signalStrength = 'weak';

      // Build narrative
      const topEntity = cluster.name;
      const sourceList = [...new Set(items.map((ci) => ci.sourceLabel))].join(', ');
      const verticalList = verticals.join(', ');
      const topItem = items[0]?.item?.title ?? '';
      const narrative = `${topEntity} detected across ${sourceCount} source${sourceCount !== 1 ? 's' : ''} (${sourceList}), spanning ${verticalList}. Top signal: "${topItem}"`;

      return {
        ...cluster,
        signalScore,
        signalStrength,
        narrative,
      };
    })
    .sort((a, b) => b.signalScore - a.signalScore);
}
