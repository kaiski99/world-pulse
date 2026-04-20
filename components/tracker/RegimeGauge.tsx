"use client";

import type { RegimeSnapshot } from "@/lib/tracker/types";

interface RegimeGaugeProps {
  regime: RegimeSnapshot;
}

export default function RegimeGauge({ regime }: RegimeGaugeProps) {
  const { score, components } = regime;
  const pct = score / 100;
  const angle = -90 + pct * 180;

  const bars = [
    { label: "DXY", value: components.dxyTrend, max: 33 },
    { label: "Net Liq", value: components.netLiquidity, max: 33 },
    { label: "Stable Flow", value: components.stablecoinFlow, max: 34 },
  ];

  return (
    <div className="rounded-lg bg-bg-surface border border-border-main p-4">
      <h3 className="font-[family-name:var(--font-mono)] text-xs font-semibold tracking-wider uppercase text-text-muted mb-3">
        Regime Breakdown
      </h3>

      {/* Semi-circle gauge */}
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 200 110" className="w-48">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Red zone (0-40) */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 36"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Yellow zone (40-70) */}
          <path
            d="M 56 36 A 80 80 0 0 1 132 28"
            fill="none"
            stroke="#eab308"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Green zone (70-100) */}
          <path
            d="M 132 28 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 65 * Math.cos((angle * Math.PI) / 180)}
            y2={100 + 65 * Math.sin((angle * Math.PI) / 180)}
            stroke="#e4e4e7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="4" fill="#e4e4e7" />
          {/* Score text */}
          <text x="100" y="92" textAnchor="middle" fill="#e4e4e7" fontSize="20" fontWeight="bold" fontFamily="monospace">
            {score}
          </text>
        </svg>
      </div>

      {/* Component bars */}
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted w-16 text-right">
              {b.label}
            </span>
            <div className="flex-1 h-1.5 bg-border-main rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  b.value / b.max >= 0.66 ? "bg-green-400" : b.value / b.max >= 0.33 ? "bg-yellow-400" : "bg-red-400"
                }`}
                style={{ width: `${(b.value / b.max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-text-muted w-6 text-right">
              {b.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
