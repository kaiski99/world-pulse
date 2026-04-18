"use client";

interface MarketRegimeBadgeProps {
  regime: string;
}

function getRegimeStyle(regime: string): { bg: string; text: string } {
  if (regime.includes("Expansion") || regime.includes("\uD83D\uDFE2")) {
    return { bg: "bg-green-500/20", text: "text-green-400" };
  }
  if (regime.includes("Risk-On") || regime.includes("\uD83D\uDD35")) {
    return { bg: "bg-blue-500/20", text: "text-blue-400" };
  }
  if (regime.includes("Safety") || regime.includes("\uD83D\uDFE1")) {
    return { bg: "bg-yellow-500/20", text: "text-yellow-400" };
  }
  if (regime.includes("Contraction") || regime.includes("\uD83D\uDD34")) {
    return { bg: "bg-red-500/20", text: "text-red-400" };
  }
  return { bg: "bg-gray-500/20", text: "text-gray-400" };
}

export default function MarketRegimeBadge({ regime }: MarketRegimeBadgeProps) {
  const { bg, text } = getRegimeStyle(regime);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-[family-name:var(--font-mono)] ${bg} ${text}`}
    >
      {regime}
    </span>
  );
}
