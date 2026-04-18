import { SourceResult } from "../types";

const SUBREDDITS = [
  "MachineLearning", "LocalLLaMA", "defi", "CryptoCurrency", "ethereum",
  "fintech", "ecommerce", "investing", "wallstreetbets", "technology", "worldnews",
];

export async function fetchReddit(): Promise<SourceResult> {
  console.log("[Reddit] Fetching...");
  const result: SourceResult = {
    source: "reddit",
    label: "Reddit Hot",
    icon: "🔥",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const subs = SUBREDDITS.join("+");
    const res = await fetch(
      `https://www.reddit.com/r/${subs}/hot.json?limit=30`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "WorldPulse/1.0" },
      }
    );

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Reddit API returned ${res.status}`);

    const data = await res.json();

    result.items = data.data.children
      .filter((c: any) => c.kind === "t3")
      .map((child: any) => {
        const d = child.data;
        return {
          id: d.id,
          title: d.title,
          description: d.subreddit_name_prefixed,
          url: "https://reddit.com" + d.permalink,
          score: d.score,
          metadata: {
            ups: d.ups,
            num_comments: d.num_comments,
            subreddit: d.subreddit,
          },
        };
      });

    console.log(`[Reddit] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[Reddit] Error:", result.error);
  }

  return result;
}
