"use client";

import { Action, ActionType, ActionUrgency, ActionConfidence } from "@/lib/types";

interface ActionCardProps {
  action: Action;
  expanded: boolean;
  onToggle: () => void;
}

const TYPE_ICONS: Record<ActionType, string> = {
  yield: "\uD83D\uDCB0",
  trade: "\uD83D\uDCC8",
  build: "\uD83D\uDD28",
  partnership: "\uD83E\uDD1D",
};

const URGENCY_CONFIG: Record<
  ActionUrgency,
  { dot: string; label: string; textColor: string; pulse?: boolean }
> = {
  now: { dot: "bg-red-500", label: "NOW", textColor: "text-red-400", pulse: true },
  "this-week": { dot: "bg-orange-500", label: "THIS WEEK", textColor: "text-orange-400" },
  watch: { dot: "bg-yellow-500", label: "WATCH", textColor: "text-yellow-400" },
  "long-term": { dot: "bg-gray-500", label: "LONG TERM", textColor: "text-gray-400" },
};

function ConfidenceIndicator({ confidence }: { confidence: ActionConfidence }) {
  const filled = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-4 h-1.5 rounded-sm ${
            i < filled ? "bg-green-500" : "bg-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

export default function ActionCard({ action, expanded, onToggle }: ActionCardProps) {
  const urgency = URGENCY_CONFIG[action.urgency];
  const typeIcon = TYPE_ICONS[action.type];
  const truncatedRisk =
    action.risk.length > 30 ? action.risk.slice(0, 30) + "\u2026" : action.risk;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left bg-bg-surface border border-border-main rounded-lg p-3 hover:border-gray-600 transition-colors cursor-pointer"
    >
      {/* Top row: icon + urgency */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeIcon}</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {urgency.pulse && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${urgency.dot}`} />
            </span>
            <span
              className={`text-[10px] font-semibold tracking-wider font-[family-name:var(--font-mono)] ${urgency.textColor}`}
            >
              {urgency.label}
            </span>
          </div>
        </div>
        <ConfidenceIndicator confidence={action.confidence} />
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-text-primary mb-1">{action.title}</h4>

      {/* Rationale */}
      <p
        className={`text-xs text-text-secondary leading-relaxed ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {action.rationale}
      </p>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* The Play */}
          <div className="border-l-2 border-green-500 bg-green-500/5 rounded-r-md px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-[family-name:var(--font-mono)] mb-1">
              The Play
            </p>
            <p className="text-xs text-text-primary leading-relaxed">
              {action.specificPlay}
            </p>
          </div>

          {/* Bottom pills */}
          <div className="flex flex-wrap gap-1.5">
            {/* Upside pill */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400">
              {action.potentialUpside}
            </span>

            {/* Risk pill */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400">
              {truncatedRisk}
            </span>

            {/* Source evidence pills */}
            {action.sourceEvidence.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/15 text-gray-400"
              >
                {src}
              </span>
            ))}

            {/* Relevant company badge */}
            {action.relevantCompany && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400">
                {action.relevantCompany}
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );
}
