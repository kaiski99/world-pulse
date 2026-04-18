"use client";

interface PriorityFilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  breakdown: Record<string, number> | null;
}

const FILTERS = [
  { key: "all", label: "ALL", icon: "", color: "#00ff88" },
  { key: "ai", label: "AI", icon: "\uD83E\uDDE0", color: "#a78bfa" },
  { key: "defi", label: "DeFi", icon: "\uD83D\uDD17", color: "#22d3ee" },
  { key: "payments", label: "Pay", icon: "\uD83D\uDCB3", color: "#34d399" },
  { key: "merchant", label: "Merch", icon: "\uD83C\uDFEA", color: "#fbbf24" },
  { key: "institutional", label: "Insti", icon: "\uD83C\uDFDB\uFE0F", color: "#60a5fa" },
] as const;

export default function PriorityFilterBar({
  activeFilter,
  onFilterChange,
  breakdown,
}: PriorityFilterBarProps) {
  const total = breakdown
    ? Object.values(breakdown).reduce((sum, v) => sum + v, 0)
    : 0;

  return (
    <div className="mx-6 mt-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = f.key === "all" ? total : (breakdown?.[f.key] ?? 0);

          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-[family-name:var(--font-mono)] tracking-wider transition-all border ${
                isActive
                  ? "border-transparent text-bg-primary font-semibold"
                  : "border-border-main text-text-muted hover:text-text-secondary hover:border-white/10"
              }`}
              style={
                isActive
                  ? { backgroundColor: f.color, color: "#0a0a0f" }
                  : undefined
              }
            >
              {f.icon && <span className="text-sm">{f.icon}</span>}
              <span>{f.label}</span>
              {breakdown && (
                <span
                  className={`text-[10px] ${
                    isActive ? "opacity-70" : "text-text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Breakdown bar */}
      {breakdown && total > 0 && (
        <div className="flex h-1 mt-3 rounded-full overflow-hidden bg-border-main">
          {FILTERS.filter((f) => f.key !== "all").map((f) => {
            const count = breakdown[f.key] ?? 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <div
                key={f.key}
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: f.color,
                  opacity: activeFilter === "all" || activeFilter === f.key ? 1 : 0.3,
                }}
                title={`${f.label}: ${count}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
