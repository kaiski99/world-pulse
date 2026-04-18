import type { SignalCluster, GraphData, GraphNode, GraphEdge, PriorityVertical } from '../types';

const VERTICAL_COLORS: Record<PriorityVertical, string> = {
  ai: '#a78bfa',
  defi: '#22d3ee',
  payments: '#34d399',
  merchant: '#fbbf24',
  institutional: '#60a5fa',
  general: '#71717a',
};

const MAX_NODES = 60;
const MAX_EDGES = 150;

/**
 * Build a graph from signal clusters: one node per entity,
 * edges from co-occurrence within the same cluster.
 */
export function buildGraph(clusters: SignalCluster[]): GraphData {
  // Collect entities that appear in clusters with 2+ sources
  const entityMap = new Map<
    string,
    { mentions: number; type: string; verticals: Set<PriorityVertical>; clusters: string[] }
  >();

  for (const cluster of clusters) {
    if (cluster.sourceCount < 2) continue;
    for (const entity of cluster.entities) {
      const existing = entityMap.get(entity.name);
      if (existing) {
        existing.mentions += entity.mentions;
        for (const v of entity.verticals) existing.verticals.add(v);
        existing.clusters.push(cluster.id);
      } else {
        entityMap.set(entity.name, {
          mentions: entity.mentions,
          type: entity.type,
          verticals: new Set(entity.verticals),
          clusters: [cluster.id],
        });
      }
    }
  }

  // Sort by mentions desc, take top MAX_NODES
  const sortedEntities = Array.from(entityMap.entries())
    .sort((a, b) => b[1].mentions - a[1].mentions)
    .slice(0, MAX_NODES);

  const nodeSet = new Set(sortedEntities.map(([name]) => name));

  // Build nodes
  const nodes: GraphNode[] = sortedEntities.map(([name, data]) => {
    // Primary vertical: most common across the entity's verticals
    const verticalArr = Array.from(data.verticals);
    const primaryVertical: PriorityVertical = verticalArr[0] ?? 'general';

    return {
      id: name,
      label: name,
      type: data.type as GraphNode['type'],
      size: data.mentions,
      color: VERTICAL_COLORS[primaryVertical] ?? VERTICAL_COLORS.general,
      cluster: data.clusters[0],
    };
  });

  // Build edges: co-occurrence in same cluster, weight = shared items
  const edgeMap = new Map<string, number>();

  for (const cluster of clusters) {
    const clusterEntities = cluster.entities
      .map((e) => e.name)
      .filter((name) => nodeSet.has(name));

    // Count shared items between entity pairs
    const entityItemSets = new Map<string, Set<string>>();
    for (const ci of cluster.items) {
      const itemEntities = ci.item.entities ?? [];
      for (const ent of itemEntities) {
        if (!nodeSet.has(ent)) continue;
        if (!entityItemSets.has(ent)) entityItemSets.set(ent, new Set());
        entityItemSets.get(ent)!.add(ci.item.id);
      }
    }

    for (let i = 0; i < clusterEntities.length; i++) {
      for (let j = i + 1; j < clusterEntities.length; j++) {
        const a = clusterEntities[i];
        const b = clusterEntities[j];
        const key = a < b ? `${a}|||${b}` : `${b}|||${a}`;

        const setA = entityItemSets.get(a);
        const setB = entityItemSets.get(b);
        const shared =
          setA && setB
            ? [...setA].filter((id) => setB.has(id)).length
            : 1; // Default weight 1 if no item-level data

        edgeMap.set(key, (edgeMap.get(key) ?? 0) + Math.max(shared, 1));
      }
    }
  }

  // Sort edges by weight desc, take top MAX_EDGES
  const edges: GraphEdge[] = Array.from(edgeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_EDGES)
    .map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    });

  return { nodes, edges };
}
