import { NextResponse } from "next/server";
import { fetchMacroData, fetchCryptoFlows, getMacroCalendar, computeRegime } from "@/lib/tracker";

export const maxDuration = 30;

/**
 * Quick scan: regime + macro + calendar + flows, no token OHLCV.
 * Completes in <5 seconds for the dashboard initial load.
 */
export async function GET() {
  try {
    const [macro, cryptoFlows] = await Promise.all([
      fetchMacroData(),
      fetchCryptoFlows(),
    ]);
    const regime = computeRegime(macro);
    const calendar = getMacroCalendar();
    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      macro,
      regime,
      cryptoFlows,
      calendar,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Quick scan failed" },
      { status: 500 }
    );
  }
}
