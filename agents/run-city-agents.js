import { parseArgs } from './lib/args.js';
import { mapLimit } from './lib/concurrency.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient } from './lib/supabase-rest.js';
import { runCollector } from './instagram-city-agent.js';
import { runThreadsCollector } from './threads-city-agent.js';
import { runGraphBuilder } from './graph-builder-agent.js';

loadEnv();

async function main() {
  const args = parseArgs();
  const dryRun = args.flag('dry-run');
  const cities = args.list('cities', ['toronto']);
  const topics = args.list('topics', ['food']);
  const platforms = args.list('platforms', args.value('platform') ? [args.value('platform')] : ['instagram']);
  const concurrency = args.int('concurrency', 2);
  const queryLimit = args.int('queries', 8);
  const perQueryLimit = args.int('per-query', 6);
  const client = new SupabaseRestClient();
  const segments = platforms.flatMap((platform) => cities.flatMap((city) => topics.map((topic) => ({ platform, city, topic }))));

  const collectorResults = await mapLimit(segments, concurrency, ({ platform, city, topic }) => {
    const runner = platform === 'threads' ? runThreadsCollector : platform === 'instagram' ? runCollector : null;
    if (!runner) throw new Error(`Unsupported collector platform: ${platform}`);
    return runner({
      client,
      dryRun,
      cities: [city],
      topics: [topic],
      concurrency: 1,
      queryLimit,
      perQueryLimit,
    });
  });

  const graphSummary = await runGraphBuilder({ client, dryRun });
  return {
    ok: true,
    dryRun,
    platforms,
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
