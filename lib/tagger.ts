import { SourceItem, PriorityVertical } from "./types";

const VERTICAL_KEYWORDS: Record<PriorityVertical, string[]> = {
  ai: [
    "ai", "artificial intelligence", "machine learning", "deep learning", "llm", "gpt", "claude",
    "gemini", "llama", "mistral", "transformer", "neural", "openai", "anthropic", "copilot",
    "cursor", "devin", "mcp", "a2a", "rag", "lora", "rlhf", "dpo", "diffusion", "midjourney",
    "stable diffusion", "dall-e", "agent", "agentic", "fine-tuning", "embedding", "langchain",
    "hugging face", "huggingface", "papers with code", "paperswithcode",
  ],
  defi: [
    "defi", "crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "token", "nft",
    "blockchain", "web3", "dao", "dex", "cex", "yield", "staking", "liquidity", "amm", "swap",
    "bridge", "l2", "rollup", "zk", "airdrop", "tvl", "coinbase", "binance", "uniswap", "aave",
    "maker", "curve", "lido", "eigenlayer", "pendle", "ethena", "hyperliquid", "arbitrum",
    "optimism", "base", "polygon", "avalanche", "bnb", "cardano", "sui", "aptos", "near",
    "cosmos", "polkadot", "chainlink", "jupiter", "raydium", "jito", "berachain", "prediction market",
    "polymarket", "coingecko", "defillama", "stablecoin", "usdc", "usdt",
  ],
  payments: [
    "payment", "fintech", "stripe", "paypal", "square", "block", "visa", "mastercard",
    "cross-border", "remittance", "stablecoin payment", "on-ramp", "off-ramp", "wise",
    "revolut", "adyen", "checkout", "merchant payment", "pix", "upi", "lightning network",
    "circle", "ripple",
  ],
  merchant: [
    "ecommerce", "e-commerce", "shopify", "amazon seller", "marketplace", "retail",
    "supply chain", "logistics", "b2b", "saas", "commerce", "merchant",
  ],
  institutional: [
    "etf", "blackrock", "fidelity", "jpmorgan", "goldman sachs", "morgan stanley",
    "custody", "regulation", "sec", "institutional", "tradfi", "wall street", "hedge fund",
    "asset management", "compliance", "larry fink", "michael saylor",
  ],
  general: [],
};

export function tagItems(items: SourceItem[]): SourceItem[] {
  return items.map((item) => {
    const text = `${item.title} ${item.description || ""}`.toLowerCase();
    const tags: PriorityVertical[] = [];

    for (const [vertical, keywords] of Object.entries(VERTICAL_KEYWORDS)) {
      if (vertical === "general") continue;
      if (keywords.some((kw) => text.includes(kw))) {
        tags.push(vertical as PriorityVertical);
      }
    }

    if (tags.length === 0) tags.push("general");
    return { ...item, tags };
  });
}
