"use client";

import { PulseSnapshot } from "@/lib/types";

interface StatsBarProps {
  snapshot: PulseSnapshot | null;
}

export default function StatsBar({ snapshot }: StatsBarProps) {
  if (!snapshot) return null;

  const totalItems = snapshot.sources.reduce((sum, s) => sum + s.items.length, 0);
  const activeSources = snapshot.sources.filter((s) => !s.error).length;
  const totalSources = snapshot.sources.length;

  const fetchTimes = snapshot.sources.map((s) => new Date(s.fetchedAt).getTime());
  const fetchDuration = fetchTimes.length > 0
    ? Math.max(...fetchTimes) - Math.min(...fetchTimes)
    : 0;

  const stats = [
    { label: "Items", value: totalItems.toString() },
    { label: "Sources", value: `${activeSources}/${totalSources}` },
    { label: "Fetch", value: fetchDuration < 1000 ? `${fetchDuration}ms` : `${(fetchDuration / 1000).toFixed(1)}s` },
  ];

  return (
    <div className="flex gap-3 mx-6 mt-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex-1 px-3 py-2 rounded bg-bg-surface border border-border-main flex items-center justify-between"
        >
          <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-muted">
            {stat.label}
          </span>
          <span className="text-sm font-[family-name:var(--font-mono)] text-accent-green font-semibold">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
