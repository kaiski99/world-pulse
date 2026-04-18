import { fetchGoogleTrends } from '../lib/sources/google-trends';
import { fetchReddit } from '../lib/sources/reddit';
import { fetchCoinGecko } from '../lib/sources/coingecko';
import { fetchPolymarket } from '../lib/sources/polymarket';
import { fetchGitHub } from '../lib/sources/github';
import { fetchHackerNews } from '../lib/sources/hackernews';
import { fetchPapersWithCode } from '../lib/sources/paperswithcode';

async function testAll() {
  const fetchers = [
    { name: 'Google Trends', fn: fetchGoogleTrends },
    { name: 'Reddit', fn: fetchReddit },
    { name: 'CoinGecko', fn: fetchCoinGecko },
    { name: 'Polymarket', fn: fetchPolymarket },
    { name: 'GitHub', fn: fetchGitHub },
    { name: 'HackerNews', fn: fetchHackerNews },
    { name: 'PapersWithCode', fn: fetchPapersWithCode },
  ];

  for (const { name, fn } of fetchers) {
    console.log(`\n--- Testing ${name} ---`);
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;
    console.log(`Status: ${result.error ? 'ERROR: ' + result.error : 'OK'}`);
    console.log(`Items: ${result.items.length}`);
    console.log(`Time: ${elapsed}ms`);
    if (result.items.length > 0) {
      console.log('Sample item:', JSON.stringify(result.items[0], null, 2));
    }
  }

  console.log('\n\n=== Parallel fetch test ===');
  const start = Date.now();
  const results = await Promise.allSettled(fetchers.map(f => f.fn()));
  const elapsed = Date.now() - start;
  console.log(`Total parallel time: ${elapsed}ms`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const name = fetchers[i].name;
    if (r.status === 'fulfilled') {
      console.log(`${name}: OK (${r.value.items.length} items)${r.value.error ? ' ERROR: ' + r.value.error : ''}`);
    } else {
      console.log(`${name}: REJECTED - ${r.reason}`);
    }
  }
}

testAll();
