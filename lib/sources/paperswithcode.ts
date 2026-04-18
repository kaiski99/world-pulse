import { SourceResult } from "../types";

export async function fetchPapersWithCode(): Promise<SourceResult> {
  console.log("[PapersWithCode] Fetching...");
  const result: SourceResult = {
    source: "paperswithcode",
    label: "AI Research",
    icon: "🧪",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://huggingface.co/api/daily_papers", {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HuggingFace Papers API returned ${res.status}`);

    const data = await res.json();

    result.items = data.slice(0, 20).map((entry: any) => {
      const paper = entry.paper;
      return {
        id: `pwc-${paper.id}`,
        title: paper.title,
        description: (paper.summary || "").slice(0, 200),
        url: `https://arxiv.org/abs/${paper.id}`,
        score: entry.numComments || 0,
        metadata: {
          authors: (paper.authors || []).slice(0, 3).map((a: any) => a.name),
          published: paper.publishedAt,
        },
      };
    });

    console.log(`[PapersWithCode] Done — ${result.items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[PapersWithCode] Error:", result.error);
  }

  return result;
}
