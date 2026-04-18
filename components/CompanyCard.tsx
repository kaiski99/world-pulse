"use client";

import { PortfolioCompany } from "@/lib/types";

interface CompanyCardProps {
  company: PortfolioCompany;
  onChange: (c: PortfolioCompany) => void;
  onDelete: () => void;
}

const CATEGORIES = [
  "AI Agent",
  "DeFi/Trading",
  "Payments",
  "NFT/Collectibles",
  "Social",
  "Infrastructure",
  "Gaming",
  "Other",
];

const STAGES = ["Idea", "Pre-launch", "MVP", "Live", "Growth", "Scale"];

export default function CompanyCard({ company, onChange, onDelete }: CompanyCardProps) {
  function update(field: keyof PortfolioCompany, value: string | string[]) {
    onChange({ ...company, [field]: value });
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded bg-[#12121a] border border-[#1e1e2e] focus:border-accent-green focus:outline-none text-text-primary transition-colors";
  const labelClass = "block text-xs text-text-muted uppercase tracking-wider mb-1";

  return (
    <div className="relative bg-bg-surface border border-border-main rounded-lg p-4">
      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors"
        title="Delete company"
      >
        <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={company.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="Company name"
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={company.category}
            onChange={(e) => update("category", e.target.value)}
            className={inputClass}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stage */}
        <div>
          <label className={labelClass}>Stage</label>
          <select
            value={company.stage}
            onChange={(e) => update("stage", e.target.value)}
            className={inputClass}
          >
            <option value="">Select stage</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Focus */}
        <div>
          <label className={labelClass}>Focus</label>
          <input
            type="text"
            value={company.focus}
            onChange={(e) => update("focus", e.target.value)}
            className={inputClass}
            placeholder="One-line description"
          />
        </div>

        {/* Keywords */}
        <div className="col-span-2">
          <label className={labelClass}>Keywords</label>
          <input
            type="text"
            value={company.keywords.join(", ")}
            onChange={(e) =>
              update(
                "keywords",
                e.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
              )
            }
            className={inputClass}
            placeholder="Comma-separated keywords"
          />
        </div>
      </div>
    </div>
  );
}
