import { parseArgs } from './lib/args.js';
import { mapLimit } from './lib/concurrency.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient } from './lib/supabase-rest.js';
import { runCollector } from './instagram-city-agent.js';
import { runGraphBuilder } from './graph-builder-agent.js';

loadEnv();

async function main() {
  const args = parseArgs();
  const dryRun = args.flag('dry-run');
  const cities = args.list('cities', ['toronto']);
  const topics = args.list('topics', ['food']);
  const concurrency = args.int('concurrency', 2);
  const queryLimit = args.int('queries', 4);
  const perQueryLimit = args.int('per-query', 6);
  const client = new SupabaseRestClient();
  const segments = cities.flatMap((city) => topics.map((topic) => ({ city, topic })));

  const collectorResults = await mapLimit(segments, concurrency, ({ city, topic }) =>
    runCollector({
      client,
      dryRun,
      cities: [city],
      topics: [topic],
      concurrency: 1,
      queryLimit,
      perQueryLimit,
    }),
  );

  const graphSummary = await runGraphBuilder({ client, dryRun });
  return {
    ok: true,
    dryRun,
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
