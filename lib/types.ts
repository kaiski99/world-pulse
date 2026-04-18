// ─── Priority Verticals ───
export type PriorityVertical = 'ai' | 'defi' | 'payments' | 'merchant' | 'institutional' | 'general';

// ─── Source Layer ───
export interface SourceItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, any>;
  timestamp?: string;
  tags?: PriorityVertical[];
  entities?: string[];
}

export interface SourceResult {
  source: string;
  label: string;
  icon: string;
  fetchedAt: string;
  items: SourceItem[];
  error?: string;
}

// ─── Intelligence Layer ───
export interface Entity {
  name: string;
  displayName: string;
  type: 'company' | 'token' | 'technology' | 'person' | 'concept' | 'protocol' | 'chain';
  mentions: number;
  sources: string[];
  verticals: PriorityVertical[];
}

export interface SignalCluster {
  id: string;
  name: string;
  entities: Entity[];
  items: ClusterItem[];
  sourceCount: number;
  verticals: PriorityVertical[];
  signalScore: number;
  totalEngagement: number;
  signalStrength: 'critical' | 'strong' | 'moderate' | 'weak';
  narrative?: string;
  flowIndicators?: FlowIndicator[];
}

export interface ClusterItem {
  source: string;
  sourceLabel: string;
  sourceIcon: string;
  item: SourceItem;
}

// ─── Graph Layer ───
export interface GraphNode {
  id: string;
  label: string;
  type: Entity['type'];
  size: number;
  color: string;
  cluster?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Flow Layer ───
export type FlowCategory = 'capital' | 'energy' | 'commodity' | 'fx';

export interface FlowDataPoint {
  id: string;
  category: FlowCategory;
  name: string;
  value: number;
  unit: string;
  change24h: number;
  changePct24h: number;
  change7d?: number;
  direction: 'up' | 'down' | 'flat';
  metadata?: Record<string, any>;
}

export interface FlowStream {
  from: string;
  to: string;
  value: number;
  label: string;
  category: FlowCategory;
  direction: 'inflow' | 'outflow';
  changePct: number;
}

export interface FlowSnapshot {
  fetchedAt: string;
  capital: {
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
  macro: {
    commodities: FlowDataPoint[];
    energy: FlowDataPoint[];
    fx: FlowDataPoint[];
  };
  streams: FlowStream[];
  heatmapData: HeatmapCell[];
}

export interface HeatmapCell {
  row: string;
  column: string;
  value: number;
  color: string;
}

export interface FlowIndicator {
  label: string;
  category: FlowCategory;
  direction: 'up' | 'down' | 'flat';
  magnitude: number;
}

// ─── Business Profile ───
export interface PortfolioCompany {
  name: string;
  category: string;
  stage: string;
  focus: string;
  keywords: string[];
}

export interface BusinessProfile {
  orgName: string;
  description: string;
  edge: string;
  portfolio: PortfolioCompany[];
  interests: string[];
  goals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  regions: string[];
}

// ─── Actions ───
export type ActionType = 'yield' | 'trade' | 'build' | 'partnership';
export type ActionUrgency = 'now' | 'this-week' | 'watch' | 'long-term';
export type ActionConfidence = 'high' | 'medium' | 'low';

export interface Action {
  id: string;
  type: ActionType;
  title: string;
  rationale: string;
  specificPlay: string;
  urgency: ActionUrgency;
  confidence: ActionConfidence;
  potentialUpside: string;
  risk: string;
  relatedCluster?: string;
  relatedFlows?: string[];
  relevantCompany?: string;
  sourceEvidence: string[];
  tags: PriorityVertical[];
}

export interface ActionsSnapshot {
  generatedAt: string;
  actions: Action[];
  marketRegime: string;
  strategicDirective: string;
}

// ─── Master Snapshot ───
export interface PulseSnapshot {
  id: string;
  createdAt: string;
  sources: SourceResult[];
  clusters: SignalCluster[];
  graph: GraphData;
  flows: FlowSnapshot;
  priorityBreakdown: Record<PriorityVertical, number>;
  summary?: string;
  actions?: ActionsSnapshot;
}
