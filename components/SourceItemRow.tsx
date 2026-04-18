"use client";

import { SourceItem } from "@/lib/types";

interface SourceItemRowProps {
  item: SourceItem;
  sourceType?: string;
  searchQuery?: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  Swift: "#F05138",
};

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-accent-green/30 text-accent-green">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SourceItemRow({ item, sourceType, searchQuery }: SourceItemRowProps) {
  const title = item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-primary hover:text-accent-green transition-colors text-sm font-medium leading-tight"
    >
      {highlightText(item.title, searchQuery || "")}
    </a>
  ) : (
    <span className="text-text-primary text-sm font-medium leading-tight">
      {highlightText(item.title, searchQuery || "")}
    </span>
  );

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors border-b border-border-main/50 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {sourceType === "coingecko" && item.metadata?.thumb && (
            <img src={item.metadata.thumb} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
          )}
          {sourceType === "github" && item.metadata?.language && (
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: LANGUAGE_COLORS[item.metadata.language] || "#8b8b8b" }}
            />
          )}
          {title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.description && (
            <p className="text-xs text-text-muted truncate">{item.description}</p>
          )}
          {sourceType === "reddit" && item.metadata?.subreddit && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-indigo/20 text-accent-indigo flex-shrink-0">
              r/{item.metadata.subreddit}
            </span>
          )}
        </div>
        {sourceType === "polymarket" && item.metadata?.outcomes && (
          <PolymarketBar outcomes={item.metadata.outcomes} />
        )}
      </div>
      {item.score !== undefined && item.score !== null && (
        <span className="text-xs font-[family-name:var(--font-mono)] text-accent-orange flex-shrink-0 mt-0.5">
          {formatNumber(item.score)}
        </span>
      )}
    </div>
  );
}

function PolymarketBar({ outcomes }: { outcomes: string }) {
  try {
    const parsed = JSON.parse(outcomes);
    const yes = parseFloat(parsed[0]) * 100;
    const no = parseFloat(parsed[1]) * 100;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-border-main">
          <div className="bg-accent-green/70 h-full" style={{ width: `${yes}%` }} />
          <div className="bg-red-500/70 h-full" style={{ width: `${no}%` }} />
        </div>
        <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
          {yes.toFixed(0)}%
        </span>
      </div>
    );
  } catch {
    return null;
  }
}
