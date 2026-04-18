"use client";

import { SignalCluster, PriorityVertical } from "@/lib/types";

interface SignalClusterCardProps {
  cluster: SignalCluster;
  expanded: boolean;
  onToggle: () => void;
  searchQuery?: string;
}

const STRENGTH_CONFIG: Record<
  string,
  { color: string; label: string; dotClass: string }
> = {
  critical: { color: "#ef4444", label: "CRITICAL", dotClass: "bg-red-500" },
  strong: { color: "#f97316", label: "STRONG", dotClass: "bg-orange-500" },
  moderate: { color: "#eab308", label: "MODERATE", dotClass: "bg-yellow-500" },
  weak: { color: "#71717a", label: "WEAK", dotClass: "bg-zinc-500" },
};

const VERTICAL_COLORS: Record<PriorityVertical, string> = {
  ai: "#a78bfa",
  defi: "#22d3ee",
  payments: "#34d399",
  merchant: "#fbbf24",
  institutional: "#60a5fa",
  general: "#71717a",
};

const VERTICAL_LABELS: Record<PriorityVertical, string> = {
  ai: "AI",
  defi: "DeFi",
  payments: "Pay",
  merchant: "Merch",
  institutional: "Insti",
  general: "General",
};

function highlightText(
  text: string,
  query: string | undefined
): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-accent-green/30 text-accent-green">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SignalClusterCard({
  cluster,
  expanded,
  onToggle,
  searchQuery,
}: SignalClusterCardProps) {
  const strength = STRENGTH_CONFIG[cluster.signalStrength] || STRENGTH_CONFIG.weak;

  // Group items by source for expanded view
  const groupedBySource = cluster.items.reduce(
    (acc, ci) => {
      if (!acc[ci.source]) {
        acc[ci.source] = { label: ci.sourceLabel, icon: ci.sourceIcon, items: [] };
      }
      acc[ci.source].items.push(ci);
      return acc;
    },
    {} as Record<string, { label: string; icon: string; items: typeof cluster.items }>
  );

  // Unique source badges
  const sourceBadges = Object.entries(groupedBySource).map(([key, val]) => ({
    key,
    label: val.label,
    icon: val.icon,
    count: val.items.length,
  }));

  // Engagement bar width (clamp to 100%)
  const maxEngagement = 1000;
  const engagementPct = Math.min(
    (cluster.totalEngagement / maxEngagement) * 100,
    100
  );

  return (
    <div
      className="rounded-lg bg-bg-surface border border-border-main overflow-hidden hover:border-white/10 transition-colors cursor-pointer animate-fade-in"
      onClick={onToggle}
    >
      <div className="px-4 py-3 space-y-2.5">
        {/* Row 1: Signal strength + name */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${strength.dotClass}`}
              style={{ boxShadow: `0 0 6px ${strength.color}40` }}
            />
            <span
              className="text-[10px] font-[family-name:var(--font-mono)] font-bold tracking-wider"
              style={{ color: strength.color }}
            >
              {strength.label}
            </span>
          </div>
          <span className="text-sm font-semibold text-text-primary truncate">
            {highlightText(cluster.name, searchQuery)}
          </span>
          <span className="ml-auto text-[10px] font-[family-name:var(--font-mono)] text-text-muted flex-shrink-0">
            {cluster.sourceCount} src
          </span>
        </div>

        {/* Row 2: Source badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {sourceBadges.map((sb) => (
            <span
              key={sb.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-text-secondary font-[family-name:var(--font-mono)]"
            >
              <span>{sb.icon}</span>
              <span>{sb.label}</span>
              <span className="text-text-muted">{sb.count}</span>
            </span>
          ))}
        </div>

        {/* Row 3: Vertical tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {cluster.verticals.map((v) => (
            <span
              key={v}
              className="px-2 py-0.5 rounded-full text-[10px] font-[family-name:var(--font-mono)] font-medium"
              style={{
                backgroundColor: `${VERTICAL_COLORS[v]}15`,
                color: VERTICAL_COLORS[v],
              }}
            >
              {VERTICAL_LABELS[v]}
            </span>
          ))}
        </div>

        {/* Row 4: Flow indicators */}
        {cluster.flowIndicators && cluster.flowIndicators.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {cluster.flowIndicators.map((fi, idx) => {
              const isUp = fi.direction === "up";
              const arrow = isUp ? "\u2191" : fi.direction === "down" ? "\u2193" : "\u2192";
              const textColor = isUp
                ? "text-green-400"
                : fi.direction === "down"
                ? "text-red-400"
                : "text-text-muted";
              const categoryColor =
                fi.category === "capital"
                  ? "#00ff88"
                  : fi.category === "energy"
                  ? "#f97316"
                  : fi.category === "commodity"
                  ? "#eab308"
                  : "#60a5fa";

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)] bg-white/[0.03] border-l-2 ${textColor}`}
                  style={{ borderLeftColor: categoryColor }}
                >
                  <span>{arrow}</span>
                  <span>{fi.label}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Row 5: Narrative */}
        {cluster.narrative && (
          <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
            {cluster.narrative}
          </p>
        )}

        {/* Engagement bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-border-main overflow-hidden">
            <div
              className="h-full bg-accent-green/60 rounded-full transition-all duration-500"
              style={{ width: `${engagementPct}%` }}
            />
          </div>
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
            {cluster.totalEngagement.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Expanded: Items grouped by source */}
      {expanded && (
        <div className="border-t border-border-main">
          {Object.entries(groupedBySource).map(([sourceKey, group]) => (
            <div key={sourceKey} className="border-b border-border-main/50 last:border-b-0">
              <div className="px-4 py-2 bg-white/[0.02] flex items-center gap-2">
                <span className="text-sm">{group.icon}</span>
                <span className="text-[11px] font-[family-name:var(--font-mono)] font-semibold text-text-secondary uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
                  {group.items.length}
                </span>
              </div>
              {group.items.map((ci) => (
                <div
                  key={ci.item.id}
                  className="px-4 py-2 hover:bg-white/[0.02] transition-colors flex items-start justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-1 min-w-0">
                    {ci.item.url ? (
                      <a
                        href={ci.item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-primary hover:text-accent-green transition-colors leading-tight"
                      >
                        {highlightText(ci.item.title, searchQuery)}
                      </a>
                    ) : (
                      <span className="text-xs text-text-primary leading-tight">
                        {highlightText(ci.item.title, searchQuery)}
                      </span>
                    )}
                    {ci.item.description && (
                      <p className="text-[10px] text-text-muted mt-0.5 truncate">
                        {ci.item.description}
                      </p>
                    )}
                  </div>
                  {ci.item.score !== undefined && ci.item.score !== null && (
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent-orange flex-shrink-0">
                      {ci.item.score.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
