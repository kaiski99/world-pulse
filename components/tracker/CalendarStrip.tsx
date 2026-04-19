"use client";

import type { MacroEvent } from "@/lib/tracker/types";

interface CalendarStripProps {
  events: MacroEvent[];
}

const IMPORTANCE_COLORS = {
  high: "border-red-500/40 bg-red-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  low: "border-border-main bg-transparent",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CalendarStrip({ events }: CalendarStripProps) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-lg bg-bg-surface border border-border-main p-4">
      <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
        Macro Calendar
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {events.slice(0, 8).map((evt, i) => {
          const days = daysUntil(evt.date);
          return (
            <div
              key={i}
              className={`flex-shrink-0 rounded-lg border px-3 py-2 min-w-[110px] ${IMPORTANCE_COLORS[evt.importance]}`}
            >
              <div className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted">
                {formatDate(evt.date)} ({days}d)
              </div>
              <div className="text-xs font-medium text-text-primary mt-0.5 leading-tight">
                {evt.name}
              </div>
              <div className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted mt-0.5">
                {evt.type}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
