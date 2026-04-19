"use client";

import Link from "next/link";

interface TopBarProps {
  lastUpdated: string | null;
  onRefresh: () => void;
  loading: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}

const TABS = [
  { key: "signals", label: "SIGNALS", icon: "\u26A1" },
  { key: "flows", label: "FLOWS", icon: "\uD83C\uDF0A" },
  { key: "sources", label: "SOURCES", icon: "\uD83D\uDCCA" },
] as const;

export default function TopBar({
  lastUpdated,
  onRefresh,
  loading,
  activeView,
  onViewChange,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border-main bg-bg-surface/50 backdrop-blur-sm">
      {/* Left: Brand */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse-dot" />
        <h1 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-[0.2em] uppercase text-text-primary">
          World Pulse
        </h1>
      </div>

      {/* Center: Tab navigation */}
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onViewChange(tab.key)}
            className={`relative px-4 py-2 text-sm font-[family-name:var(--font-mono)] tracking-wider transition-colors rounded-t ${
              activeView === tab.key
                ? "text-accent-green"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            {activeView === tab.key && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent-green rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 min-w-[280px] justify-end">
        {lastUpdated && (
          <span className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
            Last updated: {formatRelativeTime(lastUpdated)}
          </span>
        )}
        <Link
          href="/tracker"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-orange text-accent-orange text-sm font-[family-name:var(--font-mono)] rounded hover:bg-accent-orange/10 transition-colors"
          title="Regime Tracker"
        >
          🎯 TRACKER
        </Link>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 border border-accent-green text-accent-green text-sm font-[family-name:var(--font-mono)] rounded hover:bg-accent-green/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          REFRESH
        </button>
        <Link
          href="/settings"
          className="p-1.5 text-text-muted hover:text-text-secondary transition-colors rounded hover:bg-white/[0.03]"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
