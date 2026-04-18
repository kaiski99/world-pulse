import { FlowDataPoint } from "../types";

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function makeId(prefix: string, name: string): string {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export async function fetchMacroFlows(): Promise<{
  commodities: FlowDataPoint[];
  energy: FlowDataPoint[];
  fx: FlowDataPoint[];
}> {
  console.log("[macro] Starting macro flow fetches...");

  const result: {
    commodities: FlowDataPoint[];
    energy: FlowDataPoint[];
    fx: FlowDataPoint[];
  } = {
    commodities: [],
    energy: [],
    fx: [],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const signal = controller.signal;

  const fetchJSON = async (url: string) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };

  // ── a) Commodities ──
  try {
    const data = await fetchJSON(
      "https://api.coingecko.com/api/v3/simple/price?ids=paxos-gold,tether-gold&vs_currencies=usd&include_24hr_change=true"
    );

    const paxg = data["paxos-gold"];
    const xaut = data["tether-gold"];

    if (paxg) {
      const change = paxg.usd_24h_change ?? 0;
      result.commodities.push({
        id: makeId("commodity", "gold"),
        category: "commodity",
        name: "Gold (PAXG proxy)",
        value: paxg.usd ?? 0,
        unit: "$",
        change24h: ((paxg.usd ?? 0) * (change / 100)),
        changePct24h: change,
        direction: change > 0.1 ? "up" : change < -0.1 ? "down" : "flat",
        metadata: { source: "coingecko", proxy: "PAXG" },
      });
    }

    if (xaut) {
      const change = xaut.usd_24h_change ?? 0;
      result.commodities.push({
        id: makeId("commodity", "gold-xaut"),
        category: "commodity",
        name: "Gold (XAUT proxy)",
        value: xaut.usd ?? 0,
        unit: "$",
        change24h: ((xaut.usd ?? 0) * (change / 100)),
        changePct24h: change,
        direction: change > 0.1 ? "up" : change < -0.1 ? "down" : "flat",
        metadata: { source: "coingecko", proxy: "XAUT" },
      });
    }
  } catch (e) {
    console.log("[macro] CoinGecko commodity fetch failed, using placeholders:", e);
  }

  // If we didn't get gold data, use placeholders for everything
  if (result.commodities.length === 0) {
    const placeholders: { name: string; value: number; unit: string }[] = [
      { name: "Gold", value: 2350, unit: "$/oz" },
      { name: "Silver", value: 28, unit: "$/oz" },
      { name: "WTI Crude", value: 78, unit: "$/bbl" },
      { name: "Brent Crude", value: 82, unit: "$/bbl" },
      { name: "Natural Gas", value: 2.2, unit: "$/MMBtu" },
      { name: "Copper", value: 4.2, unit: "$/lb" },
    ];
    result.commodities = placeholders.map((p) => ({
      id: makeId("commodity", p.name),
      category: "commodity" as const,
      name: p.name,
      value: p.value,
      unit: p.unit,
      change24h: 0,
      changePct24h: 0,
      direction: "flat" as const,
      metadata: { placeholder: true },
    }));
  } else {
    // Add non-gold placeholders alongside live gold data
    const extraPlaceholders: { name: string; value: number; unit: string }[] = [
      { name: "Silver", value: 28, unit: "$/oz" },
      { name: "WTI Crude", value: 78, unit: "$/bbl" },
      { name: "Brent Crude", value: 82, unit: "$/bbl" },
      { name: "Natural Gas", value: 2.2, unit: "$/MMBtu" },
      { name: "Copper", value: 4.2, unit: "$/lb" },
    ];
    for (const p of extraPlaceholders) {
      result.commodities.push({
        id: makeId("commodity", p.name),
        category: "commodity",
        name: p.name,
        value: p.value,
        unit: p.unit,
        change24h: 0,
        changePct24h: 0,
        direction: "flat",
        metadata: { placeholder: true },
      });
    }
  }

  // ── b) FX ──
  const yesterday = getYesterdayDate();
  const fxPairs: {
    name: string;
    rateKey: string;
    invert: boolean;
  }[] = [
    { name: "EUR/USD", rateKey: "EUR", invert: true },
    { name: "GBP/USD", rateKey: "GBP", invert: true },
    { name: "USD/JPY", rateKey: "JPY", invert: false },
    { name: "USD/CNY", rateKey: "CNY", invert: false },
    { name: "USD/SGD", rateKey: "SGD", invert: false },
    { name: "USD/MYR", rateKey: "MYR", invert: false },
    { name: "USD/KRW", rateKey: "KRW", invert: false },
  ];

  let todayRates: Record<string, number> | null = null;
  let yesterdayRates: Record<string, number> | null = null;

  // Try Frankfurter first
  try {
    const [todayData, yesterdayData] = await Promise.all([
      fetchJSON("https://api.frankfurter.app/latest?from=USD"),
      fetchJSON(`https://api.frankfurter.app/${yesterday}?from=USD`),
    ]);
    todayRates = todayData?.rates ?? null;
    yesterdayRates = yesterdayData?.rates ?? null;
  } catch (e) {
    console.log("[macro] Frankfurter FX fetch failed, trying fallback:", e);

    // Fallback: open.er-api.com
    try {
      const fallback = await fetchJSON("https://open.er-api.com/v6/latest/USD");
      if (fallback?.rates) {
        todayRates = fallback.rates;
        // No yesterday data from this API, changePct will be 0
        yesterdayRates = fallback.rates;
      }
    } catch (e2) {
      console.log("[macro] Fallback FX fetch also failed:", e2);
    }
  }

  if (todayRates) {
    for (const pair of fxPairs) {
      const todayRate = todayRates[pair.rateKey];
      const yesterdayRate = yesterdayRates?.[pair.rateKey] ?? todayRate;

      if (todayRate == null) continue;

      const displayValue = pair.invert ? 1 / todayRate : todayRate;
      const prevValue = pair.invert
        ? 1 / (yesterdayRate ?? todayRate)
        : (yesterdayRate ?? todayRate);
      const changePct = prevValue !== 0
        ? ((displayValue - prevValue) / Math.abs(prevValue)) * 100
        : 0;

      result.fx.push({
        id: makeId("fx", pair.name),
        category: "fx",
        name: pair.name,
        value: displayValue,
        unit: pair.invert ? pair.name.split("/")[0] : pair.rateKey,
        change24h: displayValue - prevValue,
        changePct24h: changePct,
        direction: changePct > 0.05 ? "up" : changePct < -0.05 ? "down" : "flat",
        metadata: { rawRate: todayRate, inverted: pair.invert },
      });
    }
  }

  clearTimeout(timeout);

  // ── Duplicate oil/gas into energy ──
  const energyNames = ["WTI Crude", "Brent Crude", "Natural Gas"];
  result.energy = result.commodities
    .filter((c) => energyNames.includes(c.name))
    .map((c) => ({
      ...c,
      id: c.id.replace("commodity-", "energy-"),
      category: "energy" as const,
    }));

  console.log("[macro] Macro flow fetches complete.");
  return result;
}
