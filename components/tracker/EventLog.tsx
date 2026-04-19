"use client";

import type { TrackerEvent } from "@/lib/tracker/types";

interface EventLogProps {
  events: TrackerEvent[];
}

const SEVERITY_STYLES = {
  critical: { dot: "bg-red-400", text: "text-red-400", bg: "bg-red-500/5" },
  warning: { dot: "bg-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500/5" },
  info: { dot: "bg-blue-400", text: "text-blue-400", bg: "bg-transparent" },
};

const TYPE_LABELS: Record<string, string> = {
  regime_flip: "REGIME",
  state_transition: "STATE",
  macro_surprise: "MACRO",
  disqualifier_appeared: "DISQUAL",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EventLog({ events }: EventLogProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg bg-bg-surface border border-border-main p-4">
        <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
          Event Log
        </h3>
        <p className="text-xs text-text-muted text-center py-4">No events in last 24h</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg-surface border border-border-main overflow-hidden">
      <div className="px-4 py-3 border-b border-border-main">
        <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted">
          Event Log
        </h3>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {events.map((evt) => {
          const s = SEVERITY_STYLES[evt.severity];
          return (
            <div key={evt.id} className={`flex items-start gap-3 px-4 py-2.5 border-b border-border-main/50 last:border-b-0 ${s.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-[family-name:var(--font-mono)] font-medium ${s.text}`}>
                    {TYPE_LABELS[evt.type] ?? evt.type}
                  </span>
                  <span className="text-xs text-text-primary font-medium">{evt.title}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{evt.detail}</p>
              </div>
              <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)] flex-shrink-0">
                {timeAgo(evt.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
