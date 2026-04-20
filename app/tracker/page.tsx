"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { TrackerSnapshot } from "@/lib/tracker/types";
import RegimeStrip from "@/components/tracker/RegimeStrip";
import RegimeGauge from "@/components/tracker/RegimeGauge";
import MacroCards from "@/components/tracker/MacroCards";
import WatchlistTable from "@/components/tracker/WatchlistTable";
import EventLog from "@/components/tracker/EventLog";
import CalendarStrip from "@/components/tracker/CalendarStrip";

export default function TrackerPage() {
  const [snapshot, setSnapshot] = useState<TrackerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevSnapshotRef = useRef<TrackerSnapshot | null>(null);

  // Quick scan: regime + macro + calendar only (no token OHLCV). Fast.
  const handleQuickScan = useCallback(async () => {
    setQuickLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tracker/quick");
      if (!res.ok) throw new Error(`Quick scan failed: ${res.status}`);
      const data = await res.json();
      // Shape into TrackerSnapshot-ish (empty tokens, empty events)
      const merged: TrackerSnapshot = {
        id: `quick-${Date.now()}`,
        fetchedAt: data.fetchedAt,
        macro: data.macro,
        regime: data.regime,
        tokens: prevSnapshotRef.current?.tokens ?? [],
        cryptoFlows: data.cryptoFlows,
        events: prevSnapshotRef.current?.events ?? [],
        calendar: data.calendar,
        watchlist: prevSnapshotRef.current?.watchlist ?? [],
      };
      setSnapshot(merged);
    } catch (err: any) {
      setError(err.message || "Quick scan failed");
    } finally {
      setQuickLoading(false);
    }
  }, []);

  // Full scan: includes token OHLCV. Slow (20-40s).
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      const prev = prevSnapshotRef.current;
      if (prev) {
        body.previousRegime = prev.regime;
        body.previousStates = prev.tokens;
        body.watchlist = prev.watchlist;
      }

      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: TrackerSnapshot = await res.json();
      setSnapshot(data);
      prevSnapshotRef.current = data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch tracker data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run quick scan on mount
  useEffect(() => {
    handleQuickScan();
  }, [handleQuickScan]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border-main bg-bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-text-muted hover:text-text-secondary transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="w-2.5 h-2.5 rounded-full bg-accent-orange animate-pulse" />
          <h1 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-[0.2em] uppercase text-text-primary">
            Regime Tracker
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {snapshot && (
            <span className="text-xs text-text-muted font-[family-name:var(--font-mono)] hidden sm:block">
              {new Date(snapshot.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleQuickScan}
            disabled={quickLoading || loading}
            className="flex items-center gap-2 px-3 py-1.5 border border-border-main text-text-secondary text-xs font-[family-name:var(--font-mono)] rounded hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Regime + macro only (fast)"
          >
            <svg className={`w-3.5 h-3.5 ${quickLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {quickLoading ? "…" : "QUICK"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || quickLoading}
            className="flex items-center gap-2 px-4 py-1.5 border border-accent-orange text-accent-orange text-sm font-[family-name:var(--font-mono)] rounded hover:bg-accent-orange/10 transition-colors disabled:opacity-50"
            title="Full scan including token OHLCV (20-40s)"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loading ? "SCANNING..." : "FULL SCAN"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 rounded bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {snapshot ? (
        <div className="px-4 sm:px-6 py-4 space-y-4 pb-8 max-w-7xl mx-auto">
          {/* Regime strip */}
          <RegimeStrip
            regime={snapshot.regime}
            nextEvent={snapshot.calendar[0]}
            netLiquidityDelta={snapshot.macro.netLiquidity.change ?? undefined}
            dxyValue={snapshot.macro.dxy.status === "LIVE" ? snapshot.macro.dxy.value : undefined}
            btcDominance={snapshot.macro.btcDominance?.status === "LIVE" ? snapshot.macro.btcDominance.value : undefined}
          />

          {/* Regime gauge + Event log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RegimeGauge regime={snapshot.regime} />
            <div className="lg:col-span-2">
              <EventLog events={snapshot.events} />
            </div>
          </div>

          {/* Macro cards */}
          <MacroCards macro={snapshot.macro} />

          {/* Watchlist */}
          <WatchlistTable tokens={snapshot.tokens} regimeLevel={snapshot.regime.level} />

          {/* Calendar */}
          <CalendarStrip events={snapshot.calendar} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">{loading ? "" : "\uD83C\uDFAF"}</div>
          <p className="text-text-muted font-[family-name:var(--font-mono)] text-sm">
            {loading ? "Scanning macro + crypto data..." : "Press SCAN to run regime analysis"}
          </p>
          <p className="text-text-muted font-[family-name:var(--font-mono)] text-[10px] mt-2 max-w-md">
            Ingests rates, FX, liquidity, credit + token OHLCV data. Computes regime score and evaluates Kotegawa state machine per token.
          </p>
        </div>
      )}
    </div>
  );
}
