"use client";

import { useState, useEffect } from "react";
import { BusinessProfile, PortfolioCompany } from "@/lib/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/config/business-profile";
import { trackEvent, trackConversion } from "@/lib/tracking/events";
import CompanyCard from "./CompanyCard";
import TagInput from "./TagInput";

const STORAGE_KEY = "worldpulse_business_profile";

const REGIONS = ["APAC", "MENA", "Americas", "Europe", "Africa", "Global"];
const RISK_LEVELS: BusinessProfile["riskTolerance"][] = [
  "conservative",
  "moderate",
  "aggressive",
];
const RISK_LABELS: Record<BusinessProfile["riskTolerance"], string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
};

export default function SettingsForm() {
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_BUSINESS_PROFILE);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRegion(region: string) {
    setProfile((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }));
  }

  function updateCompany(index: number, company: PortfolioCompany) {
    setProfile((prev) => ({
      ...prev,
      portfolio: prev.portfolio.map((c, i) => (i === index ? company : c)),
    }));
  }

  function deleteCompany(index: number) {
    setProfile((prev) => ({
      ...prev,
      portfolio: prev.portfolio.filter((_, i) => i !== index),
    }));
  }

  function addCompany() {
    trackEvent("company_added", { portfolio_count_after: profile.portfolio.length + 1 });
    setProfile((prev) => ({
      ...prev,
      portfolio: [
        ...prev.portfolio,
        { name: "", category: "", stage: "", focus: "", keywords: [] },
      ],
    }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setToast(true);
    setTimeout(() => setToast(false), 3000);
    const filledFields = [
      profile.orgName !== DEFAULT_BUSINESS_PROFILE.orgName,
      profile.description !== DEFAULT_BUSINESS_PROFILE.description,
      profile.edge !== DEFAULT_BUSINESS_PROFILE.edge,
      profile.portfolio.length > 0,
      profile.interests.length > 0,
      profile.goals.length > 0,
      profile.riskTolerance !== DEFAULT_BUSINESS_PROFILE.riskTolerance,
      profile.regions.length > 0,
    ];
    trackConversion("profile_saved", {
      portfolio_count: profile.portfolio.length,
      interest_count: profile.interests.length,
      goal_count: profile.goals.length,
      risk_tolerance: profile.riskTolerance,
      region_count: profile.regions.length,
      profile_completeness_pct: Math.round((filledFields.filter(Boolean).length / filledFields.length) * 100),
    });
  }

  function reset() {
    setProfile(DEFAULT_BUSINESS_PROFILE);
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded bg-[#12121a] border border-[#1e1e2e] focus:border-accent-green focus:outline-none text-text-primary transition-colors";
  const labelClass = "block text-xs text-text-muted uppercase tracking-wider mb-1";
  const sectionClass = "space-y-4";

  return (
    <div className="space-y-8 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-lg bg-accent-green text-white text-sm font-medium shadow-lg animate-fade-in">
          Profile saved successfully
        </div>
      )}

      {/* Section 1 — Organization */}
      <section className={sectionClass}>
        <h2 className="text-xs font-[family-name:var(--font-mono)] text-text-muted uppercase tracking-[0.15em] border-b border-border-main pb-2">
          Organization
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Org Name</label>
            <input
              type="text"
              value={profile.orgName}
              onChange={(e) => update("orgName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Core Edge</label>
            <input
              type="text"
              value={profile.edge}
              onChange={(e) => update("edge", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={2}
            value={profile.description}
            onChange={(e) => update("description", e.target.value)}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Risk Tolerance */}
        <div>
          <label className={labelClass}>Risk Tolerance</label>
          <div className="flex gap-2 mt-1">
            {RISK_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => update("riskTolerance", level)}
                className={`px-4 py-2 text-sm rounded border transition-colors ${
                  profile.riskTolerance === level
                    ? "border-accent-green bg-accent-green/10 text-accent-green"
                    : "border-[#1e1e2e] text-text-muted hover:text-text-secondary hover:border-[#2e2e3e]"
                }`}
              >
                {RISK_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        {/* Regions */}
        <div>
          <label className={labelClass}>Regions</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => toggleRegion(region)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  profile.regions.includes(region)
                    ? "border-accent-green bg-accent-green/10 text-accent-green"
                    : "border-[#1e1e2e] text-text-muted hover:text-text-secondary hover:border-[#2e2e3e]"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Portfolio Companies */}
      <section className={sectionClass}>
        <h2 className="text-xs font-[family-name:var(--font-mono)] text-text-muted uppercase tracking-[0.15em] border-b border-border-main pb-2">
          Portfolio Companies
        </h2>

        <div className="space-y-3">
          {profile.portfolio.map((company, i) => (
            <CompanyCard
              key={i}
              company={company}
              onChange={(c) => updateCompany(i, c)}
              onDelete={() => deleteCompany(i)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addCompany}
          className="w-full py-2 text-sm rounded border border-accent-green text-accent-green hover:bg-accent-green/10 transition-colors"
        >
          + Add Company
        </button>
      </section>

      {/* Section 3 — Interests & Goals */}
      <section className={sectionClass}>
        <h2 className="text-xs font-[family-name:var(--font-mono)] text-text-muted uppercase tracking-[0.15em] border-b border-border-main pb-2">
          Interests & Goals
        </h2>

        <div>
          <label className={labelClass}>Interests</label>
          <TagInput
            tags={profile.interests}
            onChange={(tags) => update("interests", tags)}
            placeholder="Add an interest"
          />
        </div>

        <div>
          <label className={labelClass}>Goals</label>
          <TagInput
            tags={profile.goals}
            onChange={(tags) => update("goals", tags)}
            placeholder="Add a goal"
          />
        </div>
      </section>

      {/* Bottom buttons */}
      <div className="flex gap-3 pt-4 border-t border-border-main">
        <button
          type="button"
          onClick={save}
          className="px-6 py-2.5 text-sm font-medium rounded bg-accent-green text-white hover:bg-accent-green/90 transition-colors"
        >
          Save Profile
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 text-sm font-medium rounded border border-[#1e1e2e] text-text-muted hover:text-text-secondary hover:border-[#2e2e3e] transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}
