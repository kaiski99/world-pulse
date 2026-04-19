import { NextRequest, NextResponse } from "next/server";
import {
  fetchMacroData,
  fetchTokenData,
  fetchCryptoFlows,
  getMacroCalendar,
  computeRegime,
  evaluateTokens,
  checkRegimeFlip,
  DEFAULT_WATCHLIST,
} from "@/lib/tracker";
import type { TrackerSnapshot, TokenStateRecord } from "@/lib/tracker/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customWatchlist: string[] = body.watchlist ?? DEFAULT_WATCHLIST;
    const previousRegime = body.previousRegime ?? undefined;
    const previousStates: Map<string, TokenStateRecord> = new Map();

    if (Array.isArray(body.previousStates)) {
      for (const s of body.previousStates) {
        previousStates.set(s.tokenId, s);
      }
    }

    // Parallel fetch: macro + tokens + crypto flows
    const [macro, tokens, cryptoFlows] = await Promise.all([
      fetchMacroData(),
      fetchTokenData(customWatchlist),
      fetchCryptoFlows(),
    ]);

    // Compute regime
    const regime = computeRegime(macro, previousRegime);

    // Evaluate all tokens
    const { states, events } = evaluateTokens(tokens, regime, previousStates);

    // Check regime flip
    const regimeFlipEvent = checkRegimeFlip(regime, previousRegime);
    if (regimeFlipEvent) events.unshift(regimeFlipEvent);

    // Calendar
    const calendar = getMacroCalendar();

    const snapshot: TrackerSnapshot = {
      id: `tracker-${Date.now()}`,
      fetchedAt: new Date().toISOString(),
      macro,
      regime,
      tokens: states,
      cryptoFlows,
      events,
      calendar,
      watchlist: customWatchlist,
    };

    return NextResponse.json(snapshot);
  } catch (err: any) {
    console.error("[tracker] Error:", err);
    return NextResponse.json(
      { error: err.message || "Tracker fetch failed" },
      { status: 500 }
    );
  }
}
