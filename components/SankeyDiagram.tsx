"use client";

import { useMemo, useState } from "react";
import { FlowStream } from "@/lib/types";

interface SankeyDiagramProps {
  streams: FlowStream[];
}

interface SankeyNode {
  id: string;
  column: number;
  y: number;
  height: number;
  label: string;
}

interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  thickness: number;
  category: string;
  label: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  capital: "#22d3ee",
  commodity: "#fbbf24",
  energy: "#f97316",
  fx: "#a78bfa",
};

const LEFT_NODES = ["TradFi", "USD", "Foreign Currencies"];
const MIDDLE_NODES = ["Crypto", "Stablecoins", "Gold", "Oil"];

const SVG_WIDTH = 900;
const SVG_HEIGHT = 400;
const NODE_WIDTH = 16;
const COL_X = [40, SVG_WIDTH / 2 - NODE_WIDTH / 2, SVG_WIDTH - 40 - NODE_WIDTH];
const NODE_PAD = 12;
const MIN_THICKNESS = 2;
const MAX_THICKNESS = 20;

function buildNodes(
  ids: string[],
  column: number,
  totalHeight: number
): SankeyNode[] {
  const count = ids.length;
  if (count === 0) return [];
  const nodeHeight = Math.max(
    20,
    (totalHeight - (count - 1) * NODE_PAD) / count
  );
  return ids.map((id, i) => ({
    id,
    column,
    y: i * (nodeHeight + NODE_PAD) + 20,
    height: nodeHeight,
    label: id,
  }));
}

export default function SankeyDiagram({ streams }: SankeyDiagramProps) {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  const { nodes, links } = useMemo(() => {
    if (!streams || streams.length === 0) {
      return { nodes: [], links: [] };
    }

    // Discover right-column nodes from stream targets not in left/middle
    const allNodeNames = new Set([
      ...LEFT_NODES,
      ...MIDDLE_NODES,
    ]);
    const rightNodeNames = new Set<string>();
    for (const s of streams) {
      if (!allNodeNames.has(s.to) && !allNodeNames.has(s.from)) {
        rightNodeNames.add(s.to);
      } else if (!allNodeNames.has(s.to)) {
        rightNodeNames.add(s.to);
      }
    }

    // Add some defaults if nothing found
    const rightIds = rightNodeNames.size > 0
      ? Array.from(rightNodeNames)
      : ["Ethereum", "Solana", "Arbitrum", "DeFi Yields"];

    const usableHeight = SVG_HEIGHT - 40;
    const leftNodes = buildNodes(LEFT_NODES, 0, usableHeight);
    const middleNodes = buildNodes(MIDDLE_NODES, 1, usableHeight);
    const rightNodes = buildNodes(rightIds, 2, usableHeight);

    const allNodes = [...leftNodes, ...middleNodes, ...rightNodes];
    const nodeMap = new Map<string, SankeyNode>();
    for (const n of allNodes) {
      nodeMap.set(n.id, n);
    }

    // Normalize flow values for thickness
    const maxVal = Math.max(...streams.map((s) => Math.abs(s.value)), 1);

    const sankeyLinks: SankeyLink[] = [];
    for (const s of streams) {
      const source = nodeMap.get(s.from);
      const target = nodeMap.get(s.to);
      if (source && target && source.column < target.column) {
        const normalized = Math.abs(s.value) / maxVal;
        const thickness =
          MIN_THICKNESS + normalized * (MAX_THICKNESS - MIN_THICKNESS);
        sankeyLinks.push({
          source,
          target,
          value: s.value,
          thickness,
          category: s.category,
          label: s.label,
        });
      }
    }

    return { nodes: allNodes, links: sankeyLinks };
  }, [streams]);

  if (!streams || streams.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-bg-surface rounded border border-border-main">
        <span className="text-text-muted text-sm">No flow data available</span>
      </div>
    );
  }

  function pathD(link: SankeyLink): string {
    const x1 = COL_X[link.source.column] + NODE_WIDTH;
    const y1 = link.source.y + link.source.height / 2;
    const x2 = COL_X[link.target.column];
    const y2 = link.target.y + link.target.height / 2;
    const cx1 = x1 + (x2 - x1) * 0.4;
    const cx2 = x2 - (x2 - x1) * 0.4;
    return `M ${x1},${y1} C ${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
  }

  return (
    <div className="bg-bg-surface rounded border border-border-main p-2 overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        height={400}
        className="font-[family-name:var(--font-mono)]"
      >
        {/* Links */}
        {links.map((link, i) => (
          <path
            key={i}
            d={pathD(link)}
            fill="none"
            stroke={CATEGORY_COLORS[link.category] || "#666"}
            strokeWidth={link.thickness}
            strokeOpacity={hoveredLink === i ? 0.8 : 0.4}
            onMouseEnter={() => setHoveredLink(i)}
            onMouseLeave={() => setHoveredLink(null)}
            className="transition-opacity duration-150 cursor-pointer"
          >
            <title>{`${link.source.label} → ${link.target.label}: ${link.label}`}</title>
          </path>
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={COL_X[node.column]}
              y={node.y}
              width={NODE_WIDTH}
              height={node.height}
              rx={3}
              fill={
                node.column === 0
                  ? "#334155"
                  : node.column === 1
                    ? "#1e3a5f"
                    : "#1a2e1a"
              }
              stroke="#475569"
              strokeWidth={1}
            />
            <text
              x={
                node.column === 0
                  ? COL_X[0] - 4
                  : node.column === 2
                    ? COL_X[2] + NODE_WIDTH + 4
                    : COL_X[1] + NODE_WIDTH / 2
              }
              y={node.y + node.height / 2}
              textAnchor={
                node.column === 0
                  ? "end"
                  : node.column === 2
                    ? "start"
                    : "middle"
              }
              dominantBaseline="central"
              fill="#94a3b8"
              fontSize={11}
              className="select-none"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
