import type { SourceResult, SignalCluster, ClusterItem, Entity, PriorityVertical } from '../types';

/**
 * Build signal clusters from source results using entity co-occurrence.
 */
export function buildClusters(sources: SourceResult[]): SignalCluster[] {
  // 1. Flatten all items with source metadata into ClusterItem[]
  const allItems: ClusterItem[] = [];
  for (const src of sources) {
    for (const item of src.items) {
      allItems.push({
        source: src.source,
        sourceLabel: src.label,
        sourceIcon: src.icon,
        item,
      });
    }
  }

  // 2. Build entity-to-items index
  const entityIndex = new Map<string, ClusterItem[]>();
  for (const ci of allItems) {
    const entities = ci.item.entities ?? [];
    for (const entity of entities) {
      if (!entityIndex.has(entity)) {
        entityIndex.set(entity, []);
      }
      entityIndex.get(entity)!.push(ci);
    }
  }

  // 3. Merge entities that co-occur in >80% of same items
  const entityKeys = Array.from(entityIndex.keys());
  const merged = new Map<string, Set<string>>(); // canonical → merged set
  const mergeTarget = new Map<string, string>();  // entity → canonical

  for (const key of entityKeys) {
    if (!mergeTarget.has(key)) {
      merged.set(key, new Set([key]));
      mergeTarget.set(key, key);
    }
  }

  for (let i = 0; i < entityKeys.length; i++) {
    for (let j = i + 1; j < entityKeys.length; j++) {
      const a = entityKeys[i];
      const b = entityKeys[j];
      const itemsA = new Set(entityIndex.get(a)!.map((ci) => ci.item.id));
      const itemsB = new Set(entityIndex.get(b)!.map((ci) => ci.item.id));
      const intersection = new Set([...itemsA].filter((id) => itemsB.has(id)));
      const smaller = Math.min(itemsA.size, itemsB.size);
      if (smaller > 0 && intersection.size / smaller > 0.8) {
        // Merge b into a's canonical
        const canonA = mergeTarget.get(a)!;
        const canonB = mergeTarget.get(b)!;
        if (canonA !== canonB) {
          const setB = merged.get(canonB)!;
          const setA = merged.get(canonA)!;
          for (const ent of setB) {
            setA.add(ent);
            mergeTarget.set(ent, canonA);
          }
          merged.delete(canonB);
        }
      }
    }
  }

  // Build merged entity → items (union)
  const mergedEntityItems = new Map<string, Set<ClusterItem>>();
  for (const [canonical, entitySet] of merged) {
    const items = new Set<ClusterItem>();
    for (const ent of entitySet) {
      for (const ci of entityIndex.get(ent) ?? []) {
        items.add(ci);
      }
    }
    mergedEntityItems.set(canonical, items);
  }

  // 4. Greedy clustering
  const sortedEntities = Array.from(mergedEntityItems.entries()).sort(
    (a, b) => b[1].size - a[1].size
  );

  interface RawCluster {
    entities: Set<string>;
    items: Set<ClusterItem>;
  }

  const clusters: RawCluster[] = [];

  for (const [entity, itemSet] of sortedEntities) {
    let bestCluster: RawCluster | null = null;
    let bestOverlap = 0;

    for (const cluster of clusters) {
      const overlap = [...itemSet].filter((ci) => cluster.items.has(ci)).length;
      const ratio = overlap / itemSet.size;
      if (ratio > 0.5 && overlap > bestOverlap) {
        bestCluster = cluster;
        bestOverlap = overlap;
      }
    }

    if (bestCluster) {
      bestCluster.entities.add(entity);
      // Also add merged entities
      const mergedSet = merged.get(entity);
      if (mergedSet) {
        for (const e of mergedSet) bestCluster.entities.add(e);
      }
      for (const ci of itemSet) bestCluster.items.add(ci);
    } else {
      const newEntities = new Set<string>([entity]);
      const mergedSet = merged.get(entity);
      if (mergedSet) {
        for (const e of mergedSet) newEntities.add(e);
      }
      clusters.push({ entities: newEntities, items: new Set(itemSet) });
    }
  }

  // 5. Only keep clusters with items from 2+ different sources
  const validClusters = clusters.filter((c) => {
    const sourcesSet = new Set([...c.items].map((ci) => ci.source));
    return sourcesSet.size >= 2;
  });

  // 6-9. Build SignalCluster objects
  const result: SignalCluster[] = validClusters.map((raw, index) => {
    const itemsArr = Array.from(raw.items);
    const sourcesSet = new Set(itemsArr.map((ci) => ci.source));

    // Count mentions per entity
    const entityMentions = new Map<string, number>();
    for (const ent of raw.entities) {
      entityMentions.set(ent, (entityIndex.get(ent) ?? []).length);
    }

    // Sort entities by mentions desc to pick top one for name
    const sortedEnts = Array.from(raw.entities).sort(
      (a, b) => (entityMentions.get(b) ?? 0) - (entityMentions.get(a) ?? 0)
    );

    const topEntity = sortedEnts[0] ?? 'unknown';

    // Build Entity[] objects
    const entityObjects: Entity[] = sortedEnts.map((ent) => {
      const entItems = entityIndex.get(ent) ?? [];
      const entSources = new Set(entItems.map((ci) => ci.source));
      const entVerticals = new Set<PriorityVertical>();
      for (const ci of entItems) {
        for (const tag of ci.item.tags ?? []) {
          entVerticals.add(tag);
        }
      }
      return {
        name: ent,
        displayName: ent,
        type: 'concept' as const,
        mentions: entItems.length,
        sources: Array.from(entSources),
        verticals: Array.from(entVerticals),
      };
    });

    // Verticals: union of all item tags
    const verticals = new Set<PriorityVertical>();
    for (const ci of itemsArr) {
      for (const tag of ci.item.tags ?? []) {
        verticals.add(tag);
      }
    }

    // Total engagement: sum of scores
    const totalEngagement = itemsArr.reduce(
      (sum, ci) => sum + (ci.item.score ?? 0),
      0
    );

    return {
      id: `cluster-${index}`,
      name: topEntity,
      entities: entityObjects,
      items: itemsArr,
      sourceCount: sourcesSet.size,
      verticals: Array.from(verticals),
      signalScore: 0,
      totalEngagement,
      signalStrength: 'weak' as const,
    };
  });

  // 9. Sort by sourceCount desc then totalEngagement desc
  result.sort((a, b) => {
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    return b.totalEngagement - a.totalEngagement;
  });

  return result;
}
