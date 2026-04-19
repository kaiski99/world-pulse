"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  PulseSnapshot,
  SourceResult,
  PriorityVertical,
  ActionType,
  BusinessProfile,
  SignalCluster,
} from "@/lib/types";
import { getBusinessProfile } from "@/lib/config/business-profile";
import TopBar from "@/components/TopBar";
import PriorityFilterBar from "@/components/PriorityFilterBar";
import SummaryPanel from "@/components/SummaryPanel";
import SearchBar from "@/components/SearchBar";
import SignalClusterCard from "@/components/SignalClusterCard";
import SourceCard from "@/components/SourceCard";
import FlowOverviewStrip from "@/components/FlowOverviewStrip";
import SankeyDiagram from "@/components/SankeyDiagram";
import FlowHeatmap from "@/components/FlowHeatmap";
import FlowTable from "@/components/FlowTable";
import ActionsPanel from "@/components/ActionsPanel";
import WorldMap from "@/components/WorldMap";

const SOURCE_ORDER = [
  "paperswithcode",
  "coingecko",
  "defillama",
  "polymarket",
  "github",
  "reddit",
  "hackernews",
  "google-trends",
];

export default function Home() {
  const [snapshot, setSnapshot] = useState<PulseSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"signals" | "flows" | "sources">("signals");
  const [activeFilter, setActiveFilter] = useState<PriorityVertical | "all">("all");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const [activeActionFilter, setActiveActionFilter] = useState<ActionType | "all">("all");
  const [heatmapSort, setHeatmapSort] = useState<string | undefined>();
  const searchRef = useRef<HTMLInputElement>(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile: BusinessProfile = getBusinessProfile();
      const res = await fetch("/api/fetch-all?summarize=true&actions=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: PulseSnapshot = await res.json();
      setSnapshot(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = useCallback(async (sourceKey: string) => {
    try {
      const res = await fetch(`/api/sources/${sourceKey}`);
      if (!res.ok) throw new Error(`Retry failed: ${res.status}`);
      const newSource: SourceResult = await res.json();
      setSnapshot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sources: prev.sources.map((s) => (s.source === sourceKey ? newSource : s)),
        };
      });
    } catch (err: any) {
      console.error("Retry failed:", err);
    }
  }, []);

  useEffect(() => {
    const views = ["signals", "flows", "sources"] as const;
    const verticals: PriorityVertical[] = ["ai", "defi", "payments", "merchant", "institutional"];

    function handleKeyDown(e: KeyboardEvent) {
      if (document.activeElement === searchRef.current) return;
      if (e.key === "r" && !e.metaKey && !e.ctrlKey) handleRefresh();
      if (e.key === "s" && !e.metaKey && !e.ctrlKey) setSummaryExpanded((v) => !v);
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) setActionsExpanded((v) => !v);
      if (e.key === "Tab" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setActiveView((v) => views[(views.indexOf(v) + 1) % views.length]);
      }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSearchQuery(""); setActiveFilter("all"); setExpandedCluster(null); searchRef.current?.blur(); }
      if (e.key >= "1" && e.key <= "5") setActiveFilter(verticals[parseInt(e.key) - 1]);
      if (e.key === "0") setActiveFilter("all");
      if (e.key === "p" && !e.metaKey && !e.ctrlKey) window.location.href = "/settings";
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRefresh]);

  const filteredClusters = useMemo(() => {
    if (!snapshot) return [];
    let clusters = snapshot.clusters;
    if (activeFilter !== "all") {
      clusters = clusters.filter((c) => c.verticals.includes(activeFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      clusters = clusters.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.items.some((i) => i.item.title.toLowerCase().includes(q))
      );
    }
    return clusters;
  }, [snapshot, activeFilter, searchQuery]);

  const filteredSources = useMemo(() => {
    if (!snapshot) return [];
    const ordered = SOURCE_ORDER.map((key) => snapshot.sources.find((s) => s.source === key)).filter(Boolean) as SourceResult[];
    if (activeFilter === "all" && !searchQuery) return ordered;
    return ordered.map((source) => {
      let items = source.items;
      if (activeFilter !== "all") items = items.filter((i) => i.tags?.includes(activeFilter));
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter((i) => i.title.toLowerCase().includes(q));
      }
      return { ...source, items };
    });
  }, [snapshot, activeFilter, searchQuery]);

  const hasData = snapshot !== null;

  return (
    <div className="min-h-screen flex">
      <div className={`flex-1 min-w-0 transition-all ${hasData && actionsExpanded ? "md:mr-[320px]" : ""}`}>
        <TopBar
          lastUpdated={snapshot?.createdAt || null}
          onRefresh={handleRefresh}
          loading={loading}
          activeView={activeView}
          onViewChange={(v) => setActiveView(v as any)}
        />

        <PriorityFilterBar
          activeFilter={activeFilter}
          onFilterChange={(f) => setActiveFilter(f as any)}
          breakdown={snapshot?.priorityBreakdown || null}
        />

        <SummaryPanel
          summary={snapshot?.summary || null}
          loading={loading && !snapshot}
          expanded={summaryExpanded}
          onToggle={() => setSummaryExpanded((v) => !v)}
          hasData={hasData}
        />

        <div className="px-6 mt-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} inputRef={searchRef} />
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 rounded bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {hasData ? (
          <>
            {activeView === "signals" && (
              <div className="px-6 py-4 pb-8">
                {/* Interactive World Map */}
                <div className="mb-6 rounded-xl bg-bg-surface border border-border-main overflow-hidden">
                  <WorldMap
                    snapshot={snapshot}
                    activeFilter={activeFilter}
                    onClusterSelect={(cluster) => {
                      setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id);
                    }}
                  />
                </div>

                {/* Signal Clusters + Connection Graph */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3 space-y-3">
                    {filteredClusters.length > 0 ? (
                      filteredClusters.slice(0, 20).map((cluster) => (
                        <SignalClusterCard
                          key={cluster.id}
                          cluster={cluster}
                          expanded={expandedCluster === cluster.id}
                          onToggle={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                          searchQuery={searchQuery}
                        />
                      ))
                    ) : (
                      <p className="text-text-muted text-sm py-8 text-center">No clusters match your filters</p>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    <div className="sticky top-4 rounded-lg bg-bg-surface border border-border-main p-4">
                      <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
                        Connection Graph
                      </h3>
                      <GraphView graph={snapshot.graph} activeFilter={activeFilter} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === "flows" && (
              <div className="px-6 py-4 pb-8 space-y-4">
                <FlowOverviewStrip flows={snapshot.flows} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-bg-surface border border-border-main p-4">
                    <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
                      Flow Diagram
                    </h3>
                    <SankeyDiagram streams={snapshot.flows.streams} />
                  </div>
                  <div className="rounded-lg bg-bg-surface border border-border-main p-4">
                    <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
                      Heatmap
                    </h3>
                    <FlowHeatmap heatmapData={snapshot.flows.heatmapData} sortColumn={heatmapSort} onSortChange={setHeatmapSort} />
                  </div>
                </div>
                <FlowTable
                  title="Capital Flows"
                  icon="💰"
                  data={[...snapshot.flows.capital.chainTVL, ...snapshot.flows.capital.stablecoinsByChain]}
                  columns={[
                    { key: "name", label: "Chain" },
                    { key: "value", label: "Value" },
                    { key: "changePct24h", label: "24h %" },
                  ]}
                  defaultOpen
                />
                <FlowTable
                  title="DeFi Yields"
                  icon="🏗️"
                  data={snapshot.flows.capital.defiYields}
                  columns={[
                    { key: "name", label: "Pool" },
                    { key: "value", label: "APY %" },
                    { key: "changePct24h", label: "24h %" },
                  ]}
                />
                <FlowTable
                  title="Commodities & Energy"
                  icon="📦"
                  data={[...snapshot.flows.macro.commodities, ...snapshot.flows.macro.energy]}
                  columns={[
                    { key: "name", label: "Asset" },
                    { key: "value", label: "Price" },
                    { key: "changePct24h", label: "24h %" },
                  ]}
                />
                <FlowTable
                  title="FX Rates"
                  icon="💱"
                  data={snapshot.flows.macro.fx}
                  columns={[
                    { key: "name", label: "Pair" },
                    { key: "value", label: "Rate" },
                    { key: "changePct24h", label: "24h %" },
                  ]}
                />
              </div>
            )}

            {activeView === "sources" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4 pb-8">
                {filteredSources.map((source) => (
                  <SourceCard
                    key={source.source}
                    source={source}
                    loading={false}
                    searchQuery={searchQuery}
                    onRetry={handleRetry}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-4xl mb-4">🌐</div>
            <p className="text-text-muted font-[family-name:var(--font-mono)] text-sm">
              {loading ? "Fetching world data..." : 'Click REFRESH or press "R" to get started'}
            </p>
          </div>
        )}
      </div>

      {hasData && (
        <ActionsPanel
          actions={snapshot?.actions || null}
          expanded={actionsExpanded}
          onToggle={() => setActionsExpanded((v) => !v)}
          activeFilter={activeActionFilter}
          onFilterChange={setActiveActionFilter}
        />
      )}
    </div>
  );
}

function GraphView({ graph, activeFilter }: { graph: PulseSnapshot["graph"]; activeFilter: string }) {
  if (!graph || graph.nodes.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">No graph data</p>;
  }

  const nodes = graph.nodes.slice(0, 40);
  const edges = graph.edges.slice(0, 100);
  const width = 500;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 400 }}>
      {edges.map((edge, i) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return null;
        const si = nodes.indexOf(source);
        const ti = nodes.indexOf(target);
        const angle1 = (si / nodes.length) * Math.PI * 2;
        const angle2 = (ti / nodes.length) * Math.PI * 2;
        const r = Math.min(width, height) * 0.35;
        const x1 = cx + r * Math.cos(angle1);
        const y1 = cy + r * Math.sin(angle1);
        const x2 = cx + r * Math.cos(angle2);
        const y2 = cy + r * Math.sin(angle2);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#1e1e2e"
            strokeWidth={Math.max(0.5, edge.weight * 0.5)}
            opacity={0.3}
          />
        );
      })}
      {nodes.map((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        const r = Math.min(width, height) * 0.35;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const nodeSize = Math.max(4, Math.min(12, node.size * 1.5));
        const dimmed = activeFilter !== "all" && !node.color;

        return (
          <g key={node.id} opacity={dimmed ? 0.15 : 1}>
            <circle cx={x} cy={y} r={nodeSize} fill={node.color || "#71717a"} />
            {nodeSize >= 6 && (
              <text
                x={x}
                y={y + nodeSize + 10}
                textAnchor="middle"
                fill="#71717a"
                fontSize={8}
                fontFamily="var(--font-mono)"
              >
                {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
