import { SourceResult } from "../types";

export async function fetchHackerNews(): Promise<SourceResult> {
  console.log("[HackerNews] Fetching...");
  const result: SourceResult = {
    source: "hackernews",
    label: "Hacker News",
    icon: "📰",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: controller.signal,
    });
    if (!topRes.ok) throw new Error(`HN API returned ${topRes.status}`);

    const ids: number[] = await topRes.json();
    const top25 = ids.slice(0, 25);

    const stories = await Promise.all(
      top25.map(async (id) => {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: controller.signal,
        });
        return res.json();
      })
    );

    clearTimeout(timeout);

    result.items = stories
      .filter((s: any) => s && s.title)
      .map((s: any) => ({
        id: `hn-${s.id}`,
        title: s.title,
        description: `${s.type} by ${s.by}`,
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        score: s.score,
        metadata: { by: s.by, descendants: s.descendants, type: s.type },
      }));

    console.log(`[HackerNews] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[HackerNews] Error:", result.error);
  }

  return result;
}
