import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';
import { planExpansionQueueForRun } from './lib/expansion-queue.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

async function main() {
  const args = parseArgs();
  assertWritableSupabase();
  const runId = args.value('run-id');
  if (!runId) throw new Error('--run-id is required.');

  const client = new SupabaseRestClient();
  const result = await planExpansionQueueForRun(client, runId, {
    maxItems: args.int('max-items', 8),
  });

  return {
    ok: true,
    run: {
      id: result.run.id,
      query: result.run.query,
      platform: result.run.platform,
      dateRange: result.run.dateRange,
    },
    plannedCount: result.plannedCount,
    items: result.items.map((item) => ({
      id: item.id,
      query: item.query,
      status: item.status,
      priority: item.priority,
      resultRunId: item.resultRunId,
      entity: item.entity,
    })),
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
