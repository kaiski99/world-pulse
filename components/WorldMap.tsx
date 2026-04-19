"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  PulseSnapshot,
  SourceResult,
  SignalCluster,
  PriorityVertical,
} from "@/lib/types";

// ─── Source Node Config ───
interface SourceNodeConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  glowColor: string;
  biome: string;
  // Position on the map (% based, 0-100)
  x: number;
  y: number;
  size: number;
}

const SOURCE_NODES: SourceNodeConfig[] = [
  {
    key: "paperswithcode",
    label: "Papers",
    icon: "📄",
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.4)",
    biome: "academia",
    x: 50,
    y: 12,
    size: 44,
  },
  {
    key: "hackernews",
    label: "HackerNews",
    icon: "🔶",
    color: "#fb923c",
    glowColor: "rgba(251,146,60,0.4)",
    biome: "tech",
    x: 82,
    y: 22,
    size: 44,
  },
  {
    key: "github",
    label: "GitHub",
    icon: "⚡",
    color: "#818cf8",
    glowColor: "rgba(129,140,248,0.4)",
    biome: "builder",
    x: 88,
    y: 50,
    size: 44,
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: "💬",
    color: "#f87171",
    glowColor: "rgba(248,113,113,0.4)",
    biome: "social",
    x: 78,
    y: 78,
    size: 44,
  },
  {
    key: "google-trends",
    label: "Trends",
    icon: "📈",
    color: "#4ade80",
    glowColor: "rgba(74,222,128,0.4)",
    biome: "search",
    x: 50,
    y: 88,
    size: 44,
  },
  {
    key: "polymarket",
    label: "Polymarket",
    icon: "🎯",
    color: "#38bdf8",
    glowColor: "rgba(56,189,248,0.4)",
    biome: "prediction",
    x: 22,
    y: 78,
    size: 44,
  },
  {
    key: "defillama",
    label: "DeFiLlama",
    icon: "🦙",
    color: "#00ff88",
    glowColor: "rgba(0,255,136,0.4)",
    biome: "defi",
    x: 12,
    y: 50,
    size: 44,
  },
  {
    key: "coingecko",
    label: "CoinGecko",
    icon: "🦎",
    color: "#fbbf24",
    glowColor: "rgba(251,191,36,0.4)",
    biome: "crypto",
    x: 18,
    y: 22,
    size: 44,
  },
];

// ─── Signal Strength Colors ───
const STRENGTH_COLORS: Record<string, string> = {
  critical: "#ef4444",
  strong: "#f97316",
  moderate: "#eab308",
  weak: "#71717a",
};

// ─── Vertical Colors ───
const VERTICAL_COLORS: Record<string, string> = {
  ai: "#a78bfa",
  defi: "#00ff88",
  payments: "#38bdf8",
  merchant: "#f97316",
  institutional: "#6366f1",
  general: "#71717a",
};

interface WorldMapProps {
  snapshot: PulseSnapshot;
  activeFilter: PriorityVertical | "all";
  onClusterSelect?: (cluster: SignalCluster) => void;
}

export default function WorldMap({
  snapshot,
  activeFilter,
  onClusterSelect,
}: WorldMapProps) {
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 700 });

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setDimensions({ width: w, height: Math.min(w * 0.85, 700) });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;

  // Map source items to activity level (0-1)
  const sourceActivity = useMemo(() => {
    const activity: Record<string, number> = {};
    const maxItems = Math.max(
      ...snapshot.sources.map((s) => s.items.length),
      1
    );
    snapshot.sources.forEach((s) => {
      activity[s.source] = s.items.length / maxItems;
    });
    return activity;
  }, [snapshot.sources]);

  // Compute which clusters connect which sources
  const clusterConnections = useMemo(() => {
    const connections: {
      from: string;
      to: string;
      clusters: SignalCluster[];
      strength: number;
    }[] = [];
    const seen = new Set<string>();

    snapshot.clusters.forEach((cluster) => {
      const sources = [
        ...new Set(cluster.items.map((item) => item.source)),
      ];
      for (let i = 0; i < sources.length; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const key = [sources[i], sources[j]].sort().join(":");
          if (!seen.has(key)) {
            seen.add(key);
            connections.push({
              from: sources[i],
              to: sources[j],
              clusters: [cluster],
              strength: cluster.signalScore,
            });
          } else {
            const conn = connections.find(
              (c) =>
                [c.from, c.to].sort().join(":") === key
            );
            if (conn) {
              conn.clusters.push(cluster);
              conn.strength += cluster.signalScore;
            }
          }
        }
      }
    });
    return connections;
  }, [snapshot.clusters]);

  // Top signal clusters to show floating on map
  const floatingClusters = useMemo(() => {
    let clusters = snapshot.clusters;
    if (activeFilter !== "all") {
      clusters = clusters.filter((c) =>
        c.verticals.includes(activeFilter)
      );
    }
    return clusters.slice(0, 6);
  }, [snapshot.clusters, activeFilter]);

  // Position floating clusters between their source nodes
  const clusterPositions = useMemo(() => {
    return floatingClusters.map((cluster, idx) => {
      const sources = [
        ...new Set(cluster.items.map((item) => item.source)),
      ];
      const matchingNodes = SOURCE_NODES.filter((n) =>
        sources.includes(n.key)
      );

      let x: number, y: number;
      if (matchingNodes.length > 0) {
        // Position between related source nodes, offset by index
        x =
          matchingNodes.reduce((sum, n) => sum + n.x, 0) /
          matchingNodes.length;
        y =
          matchingNodes.reduce((sum, n) => sum + n.y, 0) /
          matchingNodes.length;
        // Offset slightly to avoid overlap
        const angle = (idx / floatingClusters.length) * Math.PI * 2;
        x += Math.cos(angle) * 6;
        y += Math.sin(angle) * 6;
      } else {
        // Fallback: place in center area
        const angle = (idx / floatingClusters.length) * Math.PI * 2;
        x = 50 + Math.cos(angle) * 18;
        y = 50 + Math.sin(angle) * 18;
      }

      // Clamp to map bounds
      x = Math.max(15, Math.min(85, x));
      y = Math.max(15, Math.min(85, y));

      return { cluster, x, y };
    });
  }, [floatingClusters]);

  // Get source details for popup
  const getSourceDetails = useCallback(
    (sourceKey: string) => {
      const source = snapshot.sources.find((s) => s.source === sourceKey);
      const relatedClusters = snapshot.clusters.filter((c) =>
        c.items.some((item) => item.source === sourceKey)
      );
      return { source, relatedClusters };
    },
    [snapshot]
  );

  // Convert % position to pixel position
  const toPixel = (pctX: number, pctY: number) => ({
    x: (pctX / 100) * width,
    y: (pctY / 100) * height,
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: 700 }}
      >
        <defs>
          {/* Glow filter for active nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient for map background */}
          <radialGradient id="map-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="70%" stopColor="#12121a" />
            <stop offset="100%" stopColor="#0a0a0f" />
          </radialGradient>
          {/* Pulse animation for active nodes */}
          {SOURCE_NODES.map((node) => (
            <radialGradient
              key={`grad-${node.key}`}
              id={`node-grad-${node.key}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor={node.color} stopOpacity="0.3" />
              <stop offset="60%" stopColor={node.color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={node.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#map-bg)" rx="16" />

        {/* Grid lines (subtle) */}
        {[20, 40, 60, 80].map((pct) => {
          const px = (pct / 100) * width;
          const py = (pct / 100) * height;
          return (
            <g key={`grid-${pct}`}>
              <line
                x1={px}
                y1={0}
                x2={px}
                y2={height}
                stroke="#1e1e2e"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                opacity="0.3"
              />
              <line
                x1={0}
                y1={py}
                x2={width}
                y2={py}
                stroke="#1e1e2e"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                opacity="0.3"
              />
            </g>
          );
        })}

        {/* Connection paths between sources */}
        {clusterConnections.map((conn, i) => {
          const fromNode = SOURCE_NODES.find((n) => n.key === conn.from);
          const toNode = SOURCE_NODES.find((n) => n.key === conn.to);
          if (!fromNode || !toNode) return null;

          const p1 = toPixel(fromNode.x, fromNode.y);
          const p2 = toPixel(toNode.x, toNode.y);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          // Curve toward center
          const ctrlX = midX + (cx - midX) * 0.3;
          const ctrlY = midY + (cy - midY) * 0.3;

          const maxStrength = Math.max(
            ...clusterConnections.map((c) => c.strength),
            1
          );
          const opacity = 0.1 + (conn.strength / maxStrength) * 0.4;
          const strokeWidth = 1 + (conn.strength / maxStrength) * 2;

          const isHighlighted =
            hoveredSource === conn.from || hoveredSource === conn.to;

          return (
            <path
              key={`conn-${i}`}
              d={`M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`}
              fill="none"
              stroke={isHighlighted ? "#00ff88" : "#2a2a4a"}
              strokeWidth={isHighlighted ? strokeWidth + 1 : strokeWidth}
              opacity={isHighlighted ? 0.8 : opacity}
              className="transition-all duration-300"
            />
          );
        })}

        {/* Source nodes */}
        {SOURCE_NODES.map((node) => {
          const pos = toPixel(node.x, node.y);
          const activity = sourceActivity[node.key] || 0;
          const isHovered = hoveredSource === node.key;
          const isSelected = selectedSource === node.key;
          const source = snapshot.sources.find(
            (s) => s.source === node.key
          );
          const itemCount = source?.items.length || 0;
          const hasError = source?.error;
          const pulseRadius = node.size + activity * 20;

          // Dim if filtered and this source has no items matching
          const dimmed =
            activeFilter !== "all" &&
            source &&
            !source.items.some((i) => i.tags?.includes(activeFilter));

          return (
            <g
              key={node.key}
              className="cursor-pointer transition-all duration-200"
              opacity={dimmed ? 0.25 : 1}
              onMouseEnter={() => setHoveredSource(node.key)}
              onMouseLeave={() => setHoveredSource(null)}
              onClick={() =>
                setSelectedSource(
                  selectedSource === node.key ? null : node.key
                )
              }
            >
              {/* Activity pulse ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={pulseRadius}
                fill={`url(#node-grad-${node.key})`}
                className={activity > 0.3 ? "animate-pulse-dot" : ""}
              />

              {/* Outer ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={node.size / 2 + 4}
                fill="none"
                stroke={node.color}
                strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                opacity={isHovered || isSelected ? 0.9 : 0.4}
                filter={isHovered ? "url(#glow)" : undefined}
                className="transition-all duration-200"
              />

              {/* Main circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={node.size / 2}
                fill="#12121a"
                stroke={node.color}
                strokeWidth={isHovered || isSelected ? 2 : 1}
                opacity={isHovered || isSelected ? 1 : 0.7}
                filter={isHovered ? "url(#glow)" : undefined}
                className="transition-all duration-200"
              />

              {/* Icon */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={node.size * 0.4}
                className="select-none pointer-events-none"
              >
                {node.icon}
              </text>

              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + node.size / 2 + 16}
                textAnchor="middle"
                fill={isHovered || isSelected ? node.color : "#71717a"}
                fontSize={11}
                fontFamily="var(--font-mono)"
                fontWeight={isHovered ? "600" : "400"}
                className="transition-all duration-200 select-none pointer-events-none"
              >
                {node.label}
              </text>

              {/* Item count badge */}
              {itemCount > 0 && (
                <g>
                  <rect
                    x={pos.x + node.size / 2 - 4}
                    y={pos.y - node.size / 2 - 4}
                    width={itemCount > 99 ? 28 : 22}
                    height={16}
                    rx={8}
                    fill={node.color}
                    opacity={0.9}
                  />
                  <text
                    x={
                      pos.x +
                      node.size / 2 -
                      4 +
                      (itemCount > 99 ? 14 : 11)
                    }
                    y={pos.y - node.size / 2 + 5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0a0a0f"
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    className="select-none pointer-events-none"
                  >
                    {itemCount}
                  </text>
                </g>
              )}

              {/* Error indicator */}
              {hasError && (
                <circle
                  cx={pos.x - node.size / 2 + 2}
                  cy={pos.y - node.size / 2 + 2}
                  r={5}
                  fill="#ef4444"
                  className="animate-pulse-dot"
                />
              )}
            </g>
          );
        })}

        {/* Floating signal clusters */}
        {clusterPositions.map(({ cluster, x, y }, idx) => {
          const pos = toPixel(x, y);
          const strengthColor =
            STRENGTH_COLORS[cluster.signalStrength] || "#71717a";
          const isHovered = hoveredCluster === cluster.id;
          const primaryVertical = cluster.verticals[0];
          const vertColor =
            VERTICAL_COLORS[primaryVertical] || "#71717a";

          return (
            <g
              key={cluster.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredCluster(cluster.id)}
              onMouseLeave={() => setHoveredCluster(null)}
              onClick={() => onClusterSelect?.(cluster)}
            >
              {/* Glow background */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 28 : 22}
                fill={strengthColor}
                opacity={isHovered ? 0.15 : 0.08}
                className="transition-all duration-200"
              />

              {/* Cluster pill */}
              <rect
                x={pos.x - 50}
                y={pos.y - 12}
                width={100}
                height={24}
                rx={12}
                fill="#12121a"
                stroke={strengthColor}
                strokeWidth={isHovered ? 1.5 : 1}
                opacity={isHovered ? 1 : 0.85}
                filter={isHovered ? "url(#glow)" : undefined}
                className="transition-all duration-200"
              />

              {/* Strength dot */}
              <circle
                cx={pos.x - 38}
                cy={pos.y}
                r={3}
                fill={strengthColor}
                className={
                  cluster.signalStrength === "critical"
                    ? "animate-pulse-dot"
                    : ""
                }
              />

              {/* Cluster name */}
              <text
                x={pos.x - 30}
                y={pos.y + 1}
                dominantBaseline="central"
                fill="#e4e4e7"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fontWeight="500"
                className="select-none pointer-events-none"
              >
                {cluster.name.length > 14
                  ? cluster.name.slice(0, 14) + "…"
                  : cluster.name}
              </text>

              {/* Score */}
              <text
                x={pos.x + 40}
                y={pos.y + 1}
                textAnchor="end"
                dominantBaseline="central"
                fill={strengthColor}
                fontSize={8}
                fontFamily="var(--font-mono)"
                fontWeight="700"
                className="select-none pointer-events-none"
              >
                {cluster.signalScore}
              </text>

              {/* Vertical color accent bar */}
              <rect
                x={pos.x + 43}
                y={pos.y - 4}
                width={3}
                height={8}
                rx={1.5}
                fill={vertColor}
                opacity={0.8}
              />
            </g>
          );
        })}

        {/* Center hub label */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="#3f3f46"
          fontSize={10}
          fontFamily="var(--font-mono)"
          fontWeight="600"
          letterSpacing="0.1em"
          className="select-none"
        >
          WORLD PULSE
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="#2a2a3a"
          fontSize={8}
          fontFamily="var(--font-mono)"
          className="select-none"
        >
          {snapshot.clusters.length} signals ·{" "}
          {snapshot.sources.reduce((sum, s) => sum + s.items.length, 0)}{" "}
          items
        </text>
      </svg>

      {/* Selected source popup */}
      {selectedSource && (
        <SourcePopup
          sourceKey={selectedSource}
          snapshot={snapshot}
          sourceNode={SOURCE_NODES.find((n) => n.key === selectedSource)!}
          onClose={() => setSelectedSource(null)}
          onClusterSelect={onClusterSelect}
        />
      )}

      {/* Hovered cluster tooltip */}
      {hoveredCluster && (
        <ClusterTooltip
          cluster={
            floatingClusters.find((c) => c.id === hoveredCluster)!
          }
          position={clusterPositions.find(
            (c) => c.cluster.id === hoveredCluster
          )}
        />
      )}
    </div>
  );
}

// ─── Source Popup ───
function SourcePopup({
  sourceKey,
  snapshot,
  sourceNode,
  onClose,
  onClusterSelect,
}: {
  sourceKey: string;
  snapshot: PulseSnapshot;
  sourceNode: SourceNodeConfig;
  onClose: () => void;
  onClusterSelect?: (cluster: SignalCluster) => void;
}) {
  const source = snapshot.sources.find((s) => s.source === sourceKey);
  const relatedClusters = snapshot.clusters.filter((c) =>
    c.items.some((item) => item.source === sourceKey)
  );

  if (!source) return null;

  return (
    <div
      className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-bg-surface border border-border-main rounded-xl p-4 animate-fade-in z-10"
      style={{ borderColor: sourceNode.color + "40" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{sourceNode.icon}</span>
          <span
            className="font-[family-name:var(--font-mono)] text-sm font-semibold"
            style={{ color: sourceNode.color }}
          >
            {source.label}
          </span>
          <span className="text-xs text-text-muted">
            {source.items.length} items
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Related clusters */}
      {relatedClusters.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-text-muted font-[family-name:var(--font-mono)] mb-1.5 uppercase tracking-wider">
            Active Signals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relatedClusters.slice(0, 5).map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => onClusterSelect?.(cluster)}
                className="px-2 py-1 rounded-full text-xs font-[family-name:var(--font-mono)] cursor-pointer transition-all hover:opacity-100"
                style={{
                  background:
                    STRENGTH_COLORS[cluster.signalStrength] + "20",
                  color: STRENGTH_COLORS[cluster.signalStrength],
                  border: `1px solid ${
                    STRENGTH_COLORS[cluster.signalStrength]
                  }40`,
                }}
              >
                {cluster.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top items */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {source.items.slice(0, 6).map((item, i) => (
          <div
            key={item.id || i}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {item.title}
              </a>
            ) : (
              <span>{item.title}</span>
            )}
            {item.score != null && (
              <span className="ml-1 text-text-muted">
                ({item.score})
              </span>
            )}
          </div>
        ))}
        {source.items.length > 6 && (
          <div className="text-xs text-text-muted">
            +{source.items.length - 6} more
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cluster Tooltip ───
function ClusterTooltip({
  cluster,
  position,
}: {
  cluster: SignalCluster;
  position?: { x: number; y: number };
}) {
  if (!cluster || !position) return null;

  return (
    <div
      className="absolute pointer-events-none animate-fade-in z-20"
      style={{
        left: `${position.x}%`,
        top: `${position.y - 8}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-bg-surface border border-border-main rounded-lg p-3 shadow-xl max-w-64">
        <div className="text-xs font-[family-name:var(--font-mono)] font-semibold text-text-primary mb-1">
          {cluster.name}
        </div>
        {cluster.narrative && (
          <div className="text-xs text-text-secondary leading-relaxed">
            {cluster.narrative.slice(0, 120)}
            {cluster.narrative.length > 120 ? "…" : ""}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <span
            className="text-xs font-[family-name:var(--font-mono)]"
            style={{
              color: STRENGTH_COLORS[cluster.signalStrength],
            }}
          >
            {cluster.signalStrength}
          </span>
          <span className="text-xs text-text-muted">
            {cluster.sourceCount} sources
          </span>
        </div>
      </div>
    </div>
  );
}
