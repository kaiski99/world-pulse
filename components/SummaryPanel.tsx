"use client";

interface SummaryPanelProps {
  summary: string | null;
  loading: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
    .replace(
      /^### (.*$)/gm,
      '<h3 class="text-sm font-bold text-accent-indigo mt-3 mb-1 font-[family-name:var(--font-mono)]">$1</h3>'
    )
    .replace(
      /^## (.*$)/gm,
      '<h2 class="text-base font-bold text-accent-indigo mt-4 mb-1 font-[family-name:var(--font-mono)]">$1</h2>'
    )
    .replace(
      /^# (.*$)/gm,
      '<h1 class="text-lg font-bold text-accent-indigo mt-4 mb-2 font-[family-name:var(--font-mono)]">$1</h1>'
    )
    .replace(
      /^- (.*$)/gm,
      '<li class="ml-4 text-sm text-text-secondary leading-relaxed list-disc">$1</li>'
    )
    .replace(
      /\n\n/g,
      '</p><p class="text-sm text-text-secondary leading-relaxed mt-2">'
    )
    .replace(/\n/g, "<br />");
}

export default function SummaryPanel({
  summary,
  loading,
  expanded,
  onToggle,
}: SummaryPanelProps) {
  return (
    <div className="mx-6 mt-4 rounded-lg bg-bg-surface border border-border-main border-l-4 border-l-accent-indigo overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\uD83E\uDDE0"}</span>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold tracking-wider uppercase text-accent-indigo">
            AI Briefing
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-4 rounded"
                  style={{ width: `${85 - i * 10}%` }}
                />
              ))}
            </div>
          ) : summary ? (
            <div
              className="text-sm text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(summary),
              }}
            />
          ) : (
            <p className="text-sm text-text-muted italic">
              Click REFRESH to generate briefing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
