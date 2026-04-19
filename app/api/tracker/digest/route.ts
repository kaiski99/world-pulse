import { NextRequest, NextResponse } from "next/server";
import {
  fetchMacroData,
  fetchTokenData,
  fetchCryptoFlows,
  getMacroCalendar,
  computeRegime,
  evaluateTokens,
  checkRegimeFlip,
  generateDigest,
  formatDigestText,
  DEFAULT_WATCHLIST,
} from "@/lib/tracker";
import type { TrackerSnapshot } from "@/lib/tracker/types";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format") ?? "json";

    const [macro, tokens, cryptoFlows] = await Promise.all([
      fetchMacroData(),
      fetchTokenData(DEFAULT_WATCHLIST),
      fetchCryptoFlows(),
    ]);

    const regime = computeRegime(macro);
    const { states, events } = evaluateTokens(tokens, regime);
    const regimeFlip = checkRegimeFlip(regime);
    if (regimeFlip) events.unshift(regimeFlip);
    const calendar = getMacroCalendar();

    const snapshot: TrackerSnapshot = {
      id: `tracker-digest-${Date.now()}`,
      fetchedAt: new Date().toISOString(),
      macro,
      regime,
      tokens: states,
      cryptoFlows,
      events,
      calendar,
      watchlist: DEFAULT_WATCHLIST,
    };

    const digest = generateDigest(snapshot, events);

    if (format === "text") {
      return new Response(formatDigestText(digest), {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(digest);
  } catch (err: any) {
    console.error("[tracker/digest] Error:", err);
    return NextResponse.json(
      { error: err.message || "Digest generation failed" },
      { status: 500 }
    );
  }
}
