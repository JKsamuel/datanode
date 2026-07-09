import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';
import { runExpansionQueueItem, runNextExpansionQueueItem } from './lib/expansion-queue.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

function summarizeResult(result) {
  if (!result) return null;
  const run = result.runResult?.run;
  return {
    queueItem: {
      id: result.item.id,
      query: result.item.query,
      status: result.item.status,
      resultRunId: result.item.resultRunId,
    },
    skipped: result.skipped,
    reason: result.reason,
    run: run
      ? {
          id: run.id,
          runKey: run.run_key,
          query: run.query,
          platform: run.platform,
          dateRange: run.date_range,
          resultCount: run.result_count,
          graphNodeCount: run.graph_node_count,
          graphEdgeCount: run.graph_edge_count,
        }
      : null,
  };
}

async function main() {
  const args = parseArgs();
  assertWritableSupabase();
  const queueId = args.value('queue-id', null);
  const runId = args.value('run-id', null);
  const limit = queueId ? 1 : Math.max(1, args.int('limit', 1));
  const resultLimit = args.int('result-limit', 80);
  const client = new SupabaseRestClient();
  const results = [];

  for (let index = 0; index < limit; index += 1) {
    const result = queueId
      ? await runExpansionQueueItem(client, queueId, { resultLimit })
      : await runNextExpansionQueueItem(client, { runId, resultLimit });
    if (!result) break;
    results.push(summarizeResult(result));
    if (queueId) break;
  }

  return {
    ok: true,
    processed: results.length,
    results,
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
