import { SourceResult, SourceItem } from "../types";

export async function fetchCoinGecko(): Promise<SourceResult> {
  console.log("[CoinGecko] Fetching...");
  const result: SourceResult = {
    source: "coingecko",
    label: "Crypto Trending",
    icon: "💰",
    fetchedAt: new Date().toISOString(),
    items: [],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`CoinGecko API returned ${res.status}`);

    const data = await res.json();
    const items: SourceItem[] = [];

    if (data.coins) {
      for (const coin of data.coins) {
        const item = coin.item;
        items.push({
          id: `cg-${item.id}`,
          title: `${item.name} (${item.symbol})`,
          description: `Rank #${item.market_cap_rank ?? "N/A"}`,
          url: `https://www.coingecko.com/en/coins/${item.slug || item.id}`,
          score: item.score,
          metadata: {
            symbol: item.symbol,
            market_cap_rank: item.market_cap_rank,
            price_btc: item.price_btc,
            thumb: item.thumb,
          },
        });
      }
    }

    if (data.nfts) {
      for (const nft of data.nfts) {
        items.push({
          id: `cg-nft-${nft.id}`,
          title: nft.name,
          description: `NFT — Floor: ${nft.floor_price_in_native_currency ?? "N/A"} ${nft.native_currency_symbol ?? ""}`,
          url: `https://www.coingecko.com/en/nft/${nft.id}`,
          metadata: { type: "nft", thumb: nft.thumb },
        });
      }
    }

    result.items = items;
    console.log(`[CoinGecko] Done — ${items.length} items`);
  } catch (err: any) {
    result.error = err.message || String(err);
    console.error("[CoinGecko] Error:", result.error);
  }

  return result;
}
