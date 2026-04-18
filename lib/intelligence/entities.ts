import type { SourceItem } from '../types';

// ─── Entity Dictionary ───
interface EntityEntry {
  displayName: string;
  type: 'company' | 'token' | 'technology' | 'person' | 'concept' | 'protocol' | 'chain';
}

const ENTITY_DICTIONARY: Map<string, EntityEntry> = new Map([
  // COMPANIES
  ...([
    'OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft', 'Apple', 'Amazon',
    'NVIDIA', 'Tesla', 'Stripe', 'PayPal', 'Square', 'Block', 'Shopify',
    'Coinbase', 'Binance', 'Kraken', 'BlackRock', 'Fidelity', 'JPMorgan',
    'Goldman Sachs', 'Morgan Stanley', 'Visa', 'Mastercard', 'Ripple',
    'Circle', 'Tether', 'a16z', 'Sequoia', 'Paradigm', 'Polychain',
    'Robinhood', 'Revolut', 'Wise', 'Adyen',
  ] as const).map((name): [string, EntityEntry] => [
    name.toLowerCase(),
    { displayName: name, type: 'company' },
  ]),

  // TOKENS / CHAINS
  ...([
    'Bitcoin', 'Ethereum', 'Solana', 'BNB', 'Cardano', 'Avalanche',
    'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Hyperliquid', 'Berachain',
    'Sui', 'Aptos', 'Near', 'Cosmos', 'Polkadot', 'Chainlink', 'Uniswap',
    'Aave', 'Maker', 'Curve', 'Lido', 'EigenLayer', 'Jupiter', 'Raydium',
    'Jito', 'Pendle', 'Ethena', 'USDC', 'USDT',
  ] as const).map((name): [string, EntityEntry] => [
    name.toLowerCase(),
    { displayName: name, type: 'token' },
  ]),

  // TECHNOLOGIES
  ...([
    'GPT-4', 'GPT-5', 'Claude', 'Gemini', 'Llama', 'Mistral', 'DALL-E',
    'Stable Diffusion', 'Midjourney', 'Cursor', 'Copilot', 'Devin', 'MCP',
    'A2A', 'RAG', 'LoRA', 'Transformer', 'RLHF', 'DPO',
    'Lightning Network', 'ZK-proof', 'ZK-rollup',
  ] as const).map((name): [string, EntityEntry] => [
    name.toLowerCase(),
    { displayName: name, type: 'technology' },
  ]),

  // PEOPLE
  ...([
    'Sam Altman', 'Dario Amodei', 'Jensen Huang', 'Elon Musk',
    'Vitalik Buterin', 'CZ', 'Brian Armstrong', 'Mark Zuckerberg',
    'Sundar Pichai', 'Satya Nadella', 'Larry Fink', 'Michael Saylor',
  ] as const).map((name): [string, EntityEntry] => [
    name.toLowerCase(),
    { displayName: name, type: 'person' },
  ]),

  // COMMODITIES (mapped as concept type)
  ...([
    'Gold', 'Silver', 'Oil', 'Crude', 'Natural Gas', 'Copper',
    'Platinum', 'Palladium',
  ] as const).map((name): [string, EntityEntry] => [
    name.toLowerCase(),
    { displayName: name, type: 'concept' },
  ]),
]);

// Words to skip when extracting unknown entities
const SKIP_WORDS = new Set([
  'the', 'this', 'that', 'new', 'how', 'why', 'what', 'when', 'where',
  'who', 'which', 'its', 'are', 'was', 'were', 'has', 'had', 'have',
  'been', 'will', 'can', 'may', 'but', 'not', 'all', 'any', 'each',
  'for', 'from', 'into', 'with', 'over', 'after', 'before', 'between',
  'under', 'above', 'more', 'most', 'some', 'such', 'than', 'too',
  'very', 'just', 'also', 'now', 'here', 'there', 'then', 'only',
  'about', 'still', 'could', 'would', 'should', 'does', 'did',
  'get', 'got', 'set', 'let', 'say', 'said', 'top', 'big', 'per',
  'via', 'etc', 'one', 'two', 'three', 'first', 'last', 'next',
  'major', 'key', 'latest', 'report', 'according', 'many', 'much',
  'every', 'other', 'another', 'several', 'few', 'both', 'while',
]);

/**
 * Extract known and unknown entities from source items.
 * Matches against the entity dictionary (case-insensitive) and also
 * detects unknown entities as sequences of 2-3 capitalized words
 * that don't appear at sentence start and aren't common words.
 */
export function extractEntities(items: SourceItem[]): SourceItem[] {
  return items.map((item) => {
    const text = `${item.title ?? ''} ${item.description ?? ''}`;
    const textLower = text.toLowerCase();
    const found = new Set<string>();

    // 1. Match known entities from dictionary
    for (const [key] of ENTITY_DICTIONARY) {
      if (textLower.includes(key)) {
        found.add(key);
      }
    }

    // 2. Extract unknown entities: sequences of 2-3 capitalized words
    //    not at sentence start and not common skip words
    const sentences = text.split(/[.!?]\s+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // Find all words with their positions
      const words = trimmed.split(/\s+/);
      let i = 0;
      while (i < words.length) {
        // Skip the first word of a sentence (it's capitalized by convention)
        if (i === 0) {
          i++;
          continue;
        }

        // Look for sequences of 2-3 capitalized words
        if (/^[A-Z][a-zA-Z'-]*$/.test(words[i]) && !SKIP_WORDS.has(words[i].toLowerCase())) {
          const start = i;
          let end = i + 1;
          while (
            end < words.length &&
            end - start < 3 &&
            /^[A-Z][a-zA-Z'-]*$/.test(words[end]) &&
            !SKIP_WORDS.has(words[end].toLowerCase())
          ) {
            end++;
          }
          if (end - start >= 2) {
            const phrase = words.slice(start, end).join(' ');
            const phraseLower = phrase.toLowerCase();
            // Only add if not already a known entity
            if (!ENTITY_DICTIONARY.has(phraseLower)) {
              found.add(phraseLower);
            }
            i = end;
            continue;
          }
        }
        i++;
      }
    }

    return {
      ...item,
      entities: Array.from(found),
    };
  });
}
