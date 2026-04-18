import { SourceResult, SourceItem } from "../types";

export async function fetchGoogleTrends(): Promise<SourceResult> {
  console.log("[GoogleTrends] Fetching...");
  const result: SourceResult = {
    source: "google-trends",
    label: "Google Trends",
    icon: "📈",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const [usRes, sgRes] = await Promise.allSettled([
      fetch("https://trends.google.com/trending/rss?geo=US", {
        signal: controller.signal,
        headers: { "User-Agent": "WorldPulse/1.0" },
      }),
      fetch("https://trends.google.com/trending/rss?geo=SG", {
        signal: controller.signal,
        headers: { "User-Agent": "WorldPulse/1.0" },
      }),
    ]);

    clearTimeout(timeout);

    const items: SourceItem[] = [];
    const seen = new Set<string>();

    for (const res of [usRes, sgRes]) {
      if (res.status === "fulfilled" && res.value.ok) {
        const xml = await res.value.text();
        const { XMLParser } = await import("fast-xml-parser");
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(xml);

        const channel = parsed?.rss?.channel;
        if (!channel) continue;

        const rawItems = Array.isArray(channel.item)
          ? channel.item
          : channel.item
            ? [channel.item]
            : [];

        for (const entry of rawItems) {
          const title = entry.title;
          if (!title || seen.has(title)) continue;
          seen.add(title);

          const newsItems = entry["ht:news_item"];
          const firstNews = Array.isArray(newsItems) ? newsItems[0] : newsItems;

          items.push({
            id: `gt-${title.replace(/\s+/g, "-").toLowerCase()}`,
            title,
            description: firstNews?.["ht:news_item_title"] || undefined,
            url: firstNews?.["ht:news_item_url"] || undefined,
            score: parseInt(entry["ht:approx_traffic"]?.replace(/[^0-9]/g, "") || "0"),
            metadata: {
              traffic: entry["ht:approx_traffic"],
              pubDate: entry.pubDate,
            },
          });
        }
      }
    }

    result.items = items;
    console.log(`[GoogleTrends] Done — ${items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[GoogleTrends] Error:", result.error);
  }

  return result;
}
