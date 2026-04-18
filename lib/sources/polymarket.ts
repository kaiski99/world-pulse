import { SourceResult } from "../types";

export async function fetchPolymarket(): Promise<SourceResult> {
  console.log("[Polymarket] Fetching...");
  const result: SourceResult = {
    source: "polymarket",
    label: "Prediction Markets",
    icon: "🔮",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let data: any[];

    try {
      const res = await fetch(
        "https://gamma-api.polymarket.com/markets?closed=false&order=volume&ascending=false&limit=15",
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Markets endpoint returned ${res.status}`);
      data = await res.json();
    } catch {
      const res = await fetch(
        "https://gamma-api.polymarket.com/events?closed=false&order=volume&ascending=false&limit=15",
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Events fallback returned ${res.status}`);
      data = await res.json();
    }

    clearTimeout(timeout);

    result.items = data.map((market: any) => ({
      id: `pm-${market.id || market.slug}`,
      title: market.question || market.title,
      description: (market.description || "").slice(0, 200),
      url: `https://polymarket.com/event/${market.slug}`,
      score: parseFloat(market.volume) || 0,
      metadata: {
        volume: market.volume,
        liquidity: market.liquidity,
        outcomes: market.outcomePrices,
        endDate: market.endDateIso || market.end_date_iso,
      },
    }));

    console.log(`[Polymarket] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[Polymarket] Error:", result.error);
  }

  return result;
}
