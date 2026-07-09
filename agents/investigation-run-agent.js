import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';
import { createInvestigationRun } from './lib/investigation.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

async function main() {
  const args = parseArgs();
  assertWritableSupabase();
  const query = args.value('query', 'Hamilton');
  const dateRange = args.value('date-range', '90');
  const platform = args.value('platform', 'all');
  const resultLimit = args.int('limit', 80);
  const client = new SupabaseRestClient();
  const result = await createInvestigationRun({
    client,
    query,
    dateRange,
    platform,
    resultLimit,
    source: 'investigation_run_agent',
  });

  return {
    ok: true,
    run: {
      id: result.run.id,
      runKey: result.run.run_key,
      query: result.run.query,
      platform: result.run.platform,
      dateRange: result.run.date_range,
      resultCount: result.run.result_count,
      graphNodeCount: result.run.graph_node_count,
      graphEdgeCount: result.run.graph_edge_count,
    },
    topPosts: result.posts.slice(0, 5),
    topEntities: result.entities.slice(0, 10),
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
