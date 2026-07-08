import { parseArgs } from './lib/args.js';
import { mapLimit } from './lib/concurrency.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient } from './lib/supabase-rest.js';
import { runCollector } from './instagram-city-agent.js';
import { runThreadsCollector } from './threads-city-agent.js';
import { runGraphBuilder } from './graph-builder-agent.js';

loadEnv();

const defaultSignalSeeds = [
  'food',
  'rent-real-estate',
  'jobs',
  'events',
  'immigration',
  'finance',
  'education',
  'transportation',
  'healthcare',
  'travel-outdoors',
];

async function main() {
  const args = parseArgs();
  const dryRun = args.flag('dry-run');
  const cities = args.list('cities', ['toronto']);
  const topics = args.list('topics', defaultSignalSeeds);
  const platforms = args.list('platforms', args.value('platform') ? [args.value('platform')] : ['instagram']);
  const concurrency = args.int('concurrency', 2);
  const queryLimit = args.int('queries', 8);
  const perQueryLimit = args.int('per-query', 6);
  const recentMonths = args.value('recent-months') ? args.int('recent-months', null) : null;
  const client = new SupabaseRestClient();
  const segments = platforms.flatMap((platform) => cities.map((city) => ({ platform, city })));

  const collectorResults = await mapLimit(segments, concurrency, ({ platform, city }) => {
    const runner = platform === 'threads' ? runThreadsCollector : platform === 'instagram' ? runCollector : null;
    if (!runner) throw new Error(`Unsupported collector platform: ${platform}`);
    return runner({
      client,
      dryRun,
      cities: [city],
      topics,
      concurrency: 1,
      queryLimit,
      perQueryLimit,
      recentMonths,
    });
  });

  const graphSummary = await runGraphBuilder({ client, dryRun });
  return {
    ok: true,
    dryRun,
    platforms,
    cities,
    seedTopics: topics,
    recentMonths,
    collectorResults: collectorResults.flat(),
    graphSummary,
  };
}

main()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
