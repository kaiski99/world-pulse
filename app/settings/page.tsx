"use client";

import { useEffect } from "react";
import Link from "next/link";
import SettingsForm from "@/components/SettingsForm";
import { trackEvent } from "@/lib/tracking/events";

export default function SettingsPage() {
  useEffect(() => {
    trackEvent("settings_page_visited");
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-mono)] text-xl font-bold tracking-[0.2em] uppercase text-text-primary">
            Business Profile
          </h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            Configure your organization details, portfolio companies, and strategic interests.
            This profile shapes how World Pulse prioritizes signals and generates action recommendations.
          </p>
        </div>

        {/* Form */}
        <SettingsForm />
      </div>
    </div>
  );
}
