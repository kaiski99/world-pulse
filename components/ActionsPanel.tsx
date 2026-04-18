"use client";

import { ActionsSnapshot, ActionType } from "@/lib/types";
import ActionCard from "./ActionCard";
import MarketRegimeBadge from "./MarketRegimeBadge";
import { useState } from "react";

interface ActionsPanelProps {
  actions: ActionsSnapshot | null;
  expanded: boolean;
  onToggle: () => void;
  activeFilter: ActionType | "all";
  onFilterChange: (f: ActionType | "all") => void;
}

const FILTER_TABS: { key: ActionType | "all"; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "yield", label: "\uD83D\uDCB0 Yields" },
  { key: "trade", label: "\uD83D\uDCC8 Trades" },
  { key: "build", label: "\uD83D\uDD28 Build" },
  { key: "partnership", label: "\uD83E\uDD1D BD" },
];

export default function ActionsPanel({
  actions,
  expanded,
  onToggle,
  activeFilter,
  onFilterChange,
}: ActionsPanelProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const filteredActions =
    actions?.actions.filter(
      (a) => activeFilter === "all" || a.type === activeFilter
    ) ?? [];

  const countByType = (type: ActionType | "all") => {
    if (!actions) return 0;
    if (type === "all") return actions.actions.length;
    return actions.actions.filter((a) => a.type === type).length;
  };

  // ── Desktop collapsed tab ──
  const collapsedTab = (
    <div className="hidden md:block">
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-10 h-24 bg-bg-surface border border-border-main border-r-0 rounded-l-lg flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
        aria-label="Open action center"
      >
        <span className="text-lg">{"\uD83C\uDFAF"}</span>
      </button>
    </div>
  );

  // ── Desktop expanded panel ──
  const desktopPanel = (
    <div className="hidden md:flex fixed right-0 top-0 h-full w-80 z-40 flex-col bg-bg-primary border-l border-border-main">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-xs font-bold tracking-widest text-text-muted font-[family-name:var(--font-mono)]">
          ACTION CENTER
        </h2>
        <button
          type="button"
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary transition-colors p-1 cursor-pointer"
          aria-label="Close action center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Regime badge + directive */}
      {actions && (
        <div className="px-4 pb-3 space-y-2">
          <MarketRegimeBadge regime={actions.marketRegime} />
          <p className="text-xs italic text-text-secondary leading-relaxed">
            {actions.strategicDirective}
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const count = countByType(tab.key);
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`flex-shrink-0 px-2.5 py-1.5 text-[10px] font-medium tracking-wide rounded-t-md border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-green-500 text-accent-green"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filteredActions.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-8">
            No actions available
          </p>
        ) : (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              expanded={expandedCardId === action.id}
              onToggle={() =>
                setExpandedCardId(
                  expandedCardId === action.id ? null : action.id
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );

  // ── Mobile collapsed peek bar ──
  const mobilePeekBar = (
    <div className="md:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-0 left-0 right-0 z-40 bg-bg-surface border-t border-border-main px-4 py-3 flex items-center justify-between cursor-pointer"
        aria-label="Open action center"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{"\uD83C\uDFAF"}</span>
          {actions && <MarketRegimeBadge regime={actions.marketRegime} />}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted font-[family-name:var(--font-mono)]">
            {actions?.actions.length ?? 0} actions
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
      </button>
    </div>
  );

  // ── Mobile expanded overlay ──
  const mobileOverlay = (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-xs font-bold tracking-widest text-text-muted font-[family-name:var(--font-mono)]">
          ACTION CENTER
        </h2>
        <button
          type="button"
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary transition-colors p-1 cursor-pointer"
          aria-label="Close action center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Regime badge + directive */}
      {actions && (
        <div className="px-4 pb-3 space-y-2">
          <MarketRegimeBadge regime={actions.marketRegime} />
          <p className="text-xs italic text-text-secondary leading-relaxed">
            {actions.strategicDirective}
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const count = countByType(tab.key);
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={`flex-shrink-0 px-2.5 py-1.5 text-[10px] font-medium tracking-wide rounded-t-md border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-green-500 text-accent-green"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                      isActive
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filteredActions.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-8">
            No actions available
          </p>
        ) : (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              expanded={expandedCardId === action.id}
              onToggle={() =>
                setExpandedCardId(
                  expandedCardId === action.id ? null : action.id
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      {expanded ? desktopPanel : collapsedTab}

      {/* Mobile */}
      {expanded ? mobileOverlay : mobilePeekBar}
    </>
  );
}
