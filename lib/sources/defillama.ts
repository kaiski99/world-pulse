import { SourceResult } from "../types";

export async function fetchDeFiLlama(): Promise<SourceResult> {
  console.log("[DeFiLlama] Fetching...");
  const result: SourceResult = {
    source: "defillama",
    label: "DeFi Llama",
    icon: "🦙",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const [protocolsRes, dexRes] = await Promise.allSettled([
      fetch("https://api.llama.fi/protocols", { signal: controller.signal }),
      fetch("https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true", { signal: controller.signal }),
    ]);

    clearTimeout(timeout);

    if (protocolsRes.status === "fulfilled" && protocolsRes.value.ok) {
      const protocols = await protocolsRes.value.json();
      const sorted = protocols
        .filter((p: any) => p.tvl > 0 && p.change_1d !== undefined && p.change_1d !== null)
        .sort((a: any, b: any) => Math.abs(b.change_1d) - Math.abs(a.change_1d))
        .slice(0, 20);

      for (const p of sorted) {
        result.items.push({
          id: `dll-${p.slug}`,
          title: p.name,
          description: `TVL: $${formatNum(p.tvl)} | ${p.category || "DeFi"}`,
          url: `https://defillama.com/protocol/${p.slug}`,
          score: p.tvl,
          metadata: {
            tvl: p.tvl,
            change_1d: p.change_1d,
            change_7d: p.change_7d,
            category: p.category,
            chains: p.chains,
            symbol: p.symbol,
          },
        });
      }
    }

    if (dexRes.status === "fulfilled" && dexRes.value.ok) {
      const dexData = await dexRes.value.json();
      const dexProtocols = (dexData.protocols || [])
        .filter((d: any) => d.total24h > 0)
        .sort((a: any, b: any) => b.total24h - a.total24h)
        .slice(0, 10);

      for (const d of dexProtocols) {
        result.items.push({
          id: `dll-dex-${d.defillamaId || d.name}`,
          title: `${d.name} (DEX)`,
          description: `24h Vol: $${formatNum(d.total24h)}`,
          url: `https://defillama.com/dexs/${d.name.toLowerCase().replace(/\s+/g, "-")}`,
          score: d.total24h,
          metadata: {
            type: "dex",
            total24h: d.total24h,
            change_1d: d.change_1d,
          },
        });
      }
    }

    console.log(`[DeFiLlama] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[DeFiLlama] Error:", result.error);
  }

  return result;
}

function formatNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
