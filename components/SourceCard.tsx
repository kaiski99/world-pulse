"use client";

import { SourceResult } from "@/lib/types";
import { trackEvent } from "@/lib/tracking/events";
import LoadingSkeleton from "./LoadingSkeleton";

interface SourceCardProps {
  source: SourceResult;
  loading: boolean;
  searchQuery?: string;
  onRetry?: (sourceKey: string) => void;
}

const SOURCE_ICONS: Record<string, string> = {
  "google-trends": "\uD83D\uDCC8",
  reddit: "\uD83D\uDD25",
  coingecko: "\uD83D\uDCB0",
  polymarket: "\uD83D\uDD2E",
  github: "\u2B50",
  hackernews: "\uD83D\uDCF0",
  paperswithcode: "\uD83E\uDDEA",
  defillama: "\uD83E\uDD99",
};

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  Ruby: "#701516",
  Swift: "#F05138",
  Solidity: "#AA6746",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function highlightText(text: string, query: string): React.ReactNode {
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

export default function SourceCard({
  source,
  loading,
  searchQuery,
  onRetry,
}: SourceCardProps) {
  const icon = SOURCE_ICONS[source.source] || "\uD83D\uDCCA";

  const filteredItems = searchQuery
    ? source.items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : source.items;

  return (
    <div className="rounded-lg bg-bg-surface border border-border-main overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-main">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold tracking-wider uppercase text-text-primary">
            {source.label}
          </span>
          <span className="text-[10px] font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green">
            {filteredItems.length}
          </span>
        </div>
        {source.error && onRetry && (
          <button
            onClick={() => {
              trackEvent("source_retried", { source_key: source.source });
              onRetry(source.source);
            }}
            className="text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded border border-accent-orange text-accent-orange hover:bg-accent-orange/10 transition-colors"
          >
            RETRY
          </button>
        )}
      </div>

      {/* Error state */}
      {source.error && (
        <div className="px-4 py-2 bg-red-500/5 border-b border-red-500/20">
          <p className="text-xs text-red-400 font-[family-name:var(--font-mono)]">
            Error: {source.error}
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredItems.length > 0 ? (
        <div className="max-h-[400px] overflow-y-auto">
          {filteredItems.map((item, i) => {
            const meta = item.metadata || {};
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors border-b border-border-main/50 last:border-b-0 animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Coingecko: coin thumbnail */}
                    {source.source === "coingecko" && meta.thumb && (
                      <img
                        src={meta.thumb}
                        alt=""
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    )}
                    {/* GitHub: language color dot */}
                    {source.source === "github" && meta.language && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            LANGUAGE_COLORS[meta.language] || "#8b8b8b",
                        }}
                      />
                    )}
                    {/* Title */}
                    {item.url ? (
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
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {item.description}
                    </p>
                  )}

                  {/* Source-specific enrichments */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Reddit: subreddit badge */}
                    {source.source === "reddit" && meta.subreddit && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-indigo/20 text-accent-indigo">
                        r/{meta.subreddit}
                      </span>
                    )}

                    {/* Polymarket: probability bar */}
                    {source.source === "polymarket" && meta.outcomes && (
                      <PolymarketBar outcomes={meta.outcomes} />
                    )}

                    {/* DeFi Llama: change_1d colored arrow */}
                    {source.source === "defillama" && meta.change_1d !== undefined && (
                      <span
                        className={`text-[10px] font-[family-name:var(--font-mono)] ${
                          meta.change_1d >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {meta.change_1d >= 0 ? "\u2191" : "\u2193"}{" "}
                        {Math.abs(meta.change_1d).toFixed(2)}%
                      </span>
                    )}

                    {/* Papers With Code: authors */}
                    {source.source === "paperswithcode" && meta.authors && (
                      <span className="text-[10px] text-text-muted truncate max-w-[200px]">
                        {Array.isArray(meta.authors)
                          ? meta.authors.join(", ")
                          : meta.authors}
                      </span>
                    )}

                    {/* GitHub: language label */}
                    {source.source === "github" && meta.language && (
                      <span className="text-[10px] text-text-muted font-[family-name:var(--font-mono)]">
                        {meta.language}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score badge */}
                {item.score !== undefined && item.score !== null && (
                  <span className="text-xs font-[family-name:var(--font-mono)] text-accent-orange flex-shrink-0 mt-0.5">
                    {formatNumber(item.score)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-text-muted italic">
          {searchQuery ? "No matching items" : "No items available"}
        </p>
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
      <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
        <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-border-main">
          <div
            className="bg-accent-green/70 h-full"
            style={{ width: `${yes}%` }}
          />
          <div
            className="bg-red-500/70 h-full"
            style={{ width: `${no}%` }}
          />
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
