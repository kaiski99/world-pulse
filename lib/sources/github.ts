import { SourceResult, SourceItem } from "../types";

export async function fetchGitHub(): Promise<SourceResult> {
  console.log("[GitHub] Fetching...");
  const result: SourceResult = {
    source: "github",
    label: "GitHub Trending",
    icon: "⭐",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const queries = [
      `created:>${weekAgo}+topic:ai OR topic:llm OR topic:machine-learning`,
      `created:>${weekAgo}+topic:crypto OR topic:defi OR topic:blockchain OR topic:web3`,
      `created:>${weekAgo}&sort=stars&order=desc`,
    ];

    const seen = new Set<string>();
    const allItems: SourceItem[] = [];

    const results = await Promise.allSettled(
      queries.map((q) =>
        fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`,
          { signal: controller.signal, headers: { "User-Agent": "WorldPulse/1.0" } }
        )
      )
    );

    clearTimeout(timeout);

    for (const res of results) {
      if (res.status !== "fulfilled" || !res.value.ok) continue;
      const data = await res.value.json();
      for (const repo of data.items || []) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);
        allItems.push({
          id: `gh-${repo.id}`,
          title: repo.full_name,
          description: (repo.description || "").slice(0, 200),
          url: repo.html_url,
          score: repo.stargazers_count,
          metadata: {
            language: repo.language,
            forks: repo.forks_count,
            stars: repo.stargazers_count,
            topics: repo.topics,
          },
        });
      }
    }

    result.items = allItems.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
    console.log(`[GitHub] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[GitHub] Error:", result.error);
  }

  return result;
}
