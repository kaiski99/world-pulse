"use client";

import React, { useRef, useCallback } from "react";
import { trackEvent } from "@/lib/tracking/events";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function SearchBar({ value, onChange, inputRef }: SearchBarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChange = useCallback((v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      trackEvent("search_used", { query_length: v.length, action: v ? "typed" : "cleared" });
    }, 500);
  }, [onChange]);

  return (
    <div className="mx-6 mt-4">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Filter across all sources..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-bg-surface border border-border-main text-text-primary text-sm font-[family-name:var(--font-mono)] placeholder:text-text-muted focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors"
        />
        {value && (
          <button
            onClick={() => handleChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
