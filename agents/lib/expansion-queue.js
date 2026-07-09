import { createInvestigationRun, getInvestigationRun } from './investigation.js';

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safePlatform(platform) {
  return ['all', 'instagram', 'threads', 'tiktok', 'youtube', 'x', 'web'].includes(platform) ? platform : 'all';
}

function safeDateRange(dateRange) {
  return dateRange === 'all' || /^\d+$/.test(String(dateRange)) ? String(dateRange) : '90';
}

function mapQueueRow(row) {
  return {
    id: row.id,
    sourceRunId: row.source_run_id,
    sourceEntityId: row.source_entity_id,
    parentQueueId: row.parent_queue_id,
    query: row.query,
    normalizedQuery: row.normalized_query,
    platform: row.platform,
    dateRange: row.date_range,
    depth: row.depth,
    priority: Number(row.priority || 0),
    status: row.status,
    reason: row.reason,
    resultRunId: row.result_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata || {},
    entity: row.entities
      ? {
          id: row.entities.id,
          type: row.entities.entity_type,
          label: row.entities.label,
          normalizedKey: row.entities.normalized_key,
        }
      : null,
  };
}

function mapRunSummaryRow(row) {
  return {
    id: row.id,
    runKey: row.run_key,
    query: row.query,
    platform: row.platform,
    dateRange: row.date_range,
    status: row.status,
    resultCount: row.result_count,
    graphNodeCount: row.graph_node_count,
    graphEdgeCount: row.graph_edge_count,
    createdAt: row.created_at,
    metadata: row.metadata || {},
  };
}

function selectExpansionQueueFields() {
  return 'id,source_run_id,source_entity_id,parent_queue_id,query,normalized_query,platform,date_range,depth,priority,status,reason,result_run_id,created_at,updated_at,metadata,entities(id,entity_type,normalized_key,label)';
}

function selectRunSummaryFields() {
  return 'id,run_key,query,platform,date_range,status,result_count,graph_node_count,graph_edge_count,created_at,metadata';
}

function mergeMetadata(item, patch) {
  return {
    ...(item?.metadata || {}),
    ...patch,
  };
}

function entityTypeBoost(type) {
  return (
    {
      business: 16,
      place: 14,
      concern: 13,
      event: 12,
      hashtag: 9,
      keyword: 7,
      author: 3,
    }[type] ?? 5
  );
}

function shouldAutoPlanEntity(entity, normalizedRunQuery) {
  const label = String(entity?.label || '').trim();
  const normalizedLabel = normalizeText(label);
  if (!entity?.id || !label || normalizedLabel.length < 3) return false;
  if (normalizedRunQuery.includes(normalizedLabel)) return false;
  if (/^\d+$/.test(normalizedLabel)) return false;

  const blocked = new Set([
    'anyone',
    'area',
    'canada',
    'hamilton',
    'ontario',
    'social',
    'today',
    'together',
    'looking',
    'interested',
  ]);
  if (blocked.has(normalizedLabel)) return false;
  if (entity.type === 'author' && Number(entity.postCount || 0) < 2) return false;
  if (entity.type === 'keyword' && Number(entity.weight || 0) < 2) return false;
  return true;
}

function expansionQueryForRunEntity(run, entity) {
  const label = String(entity.label || '').trim();
  const normalizedLabel = normalizeText(label);
  const cityLabel = run.cityName || run.citySlug || '';
  const base = cityLabel && !normalizeText(cityLabel).includes(normalizedLabel) ? cityLabel : run.query;
  if (!base) return label;
  if (normalizeText(base).includes(normalizedLabel)) return base;
  return `${base} ${label}`;
}

function rankExpansionEntity(entity) {
  const rankPenalty = Math.max(0, Number(entity.rank || 9999) - 1) * 0.15;
  return Number((Number(entity.weight || 0) + Number(entity.postCount || 0) * 3 + entityTypeBoost(entity.type) - rankPenalty).toFixed(4));
}

export async function listExpansionQueue(client, { runId, limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set('select', selectExpansionQueueFields());
  params.set('order', 'priority.desc,created_at.desc');
  params.set('limit', String(limit));
  if (runId) params.set('source_run_id', `eq.${runId}`);
  const rows = await client.select('expansion_queue', params);
  return rows.map(mapQueueRow);
}

export async function getExpansionQueueItem(client, queueId) {
  if (!queueId) throw new Error('queueId is required.');
  const params = new URLSearchParams();
  params.set('select', selectExpansionQueueFields());
  params.set('id', `eq.${queueId}`);
  params.set('limit', '1');
  const rows = await client.select('expansion_queue', params);
  return rows[0] ? mapQueueRow(rows[0]) : null;
}

export async function getRunSummary(client, runId) {
  if (!runId) return null;
  const params = new URLSearchParams();
  params.set('select', selectRunSummaryFields());
  params.set('id', `eq.${runId}`);
  params.set('limit', '1');
  const rows = await client.select('investigation_runs', params);
  return rows[0] ? mapRunSummaryRow(rows[0]) : null;
}

export async function getInboundExpansionQueueItem(client, runId) {
  if (!runId) return null;
  const params = new URLSearchParams();
  params.set('select', selectExpansionQueueFields());
  params.set('result_run_id', `eq.${runId}`);
  params.set('limit', '1');
  const rows = await client.select('expansion_queue', params);
  return rows[0] ? mapQueueRow(rows[0]) : null;
}

export async function getExpansionQueueItemByKey(client, { sourceRunId, sourceEntityId = null, normalizedQuery }) {
  if (!sourceRunId || !normalizedQuery) return null;
  const params = new URLSearchParams();
  params.set('select', selectExpansionQueueFields());
  params.set('source_run_id', `eq.${sourceRunId}`);
  params.set('normalized_query', `eq.${normalizedQuery}`);
  params.set('limit', '1');
  if (sourceEntityId) {
    params.set('source_entity_id', `eq.${sourceEntityId}`);
  } else {
    params.set('source_entity_id', 'is.null');
  }
  const rows = await client.select('expansion_queue', params);
  return rows[0] ? mapQueueRow(rows[0]) : null;
}

export async function updateExpansionQueueItem(client, queueId, patch, { returning = 'representation' } = {}) {
  if (!queueId) throw new Error('queueId is required.');
  const params = new URLSearchParams({ id: `eq.${queueId}` });
  const rows = await client.patch('expansion_queue', params, patch, { returning });
  if (!Array.isArray(rows) || !rows[0]) return null;
  const item = mapQueueRow(rows[0]);
  return (await getExpansionQueueItem(client, item.id)) || item;
}

export async function getNextExpansionQueueItem(client, { runId = null } = {}) {
  const params = new URLSearchParams();
  params.set('select', selectExpansionQueueFields());
  params.set('status', 'eq.queued');
  params.set('order', 'priority.desc,created_at.asc');
  params.set('limit', '1');
  if (runId) params.set('source_run_id', `eq.${runId}`);
  const rows = await client.select('expansion_queue', params);
  return rows[0] ? mapQueueRow(rows[0]) : null;
}

export async function createExpansionQueueItem(
  client,
  {
    sourceRunId,
    sourceEntityId = null,
    query,
    platform = 'all',
    dateRange = '90',
    depth = 1,
    priority = 0,
    reason = 'manual_entity_expansion',
    metadata = {},
  },
) {
  if (!sourceRunId) throw new Error('sourceRunId is required.');
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) throw new Error('query is required.');
  const existing = await getExpansionQueueItemByKey(client, { sourceRunId, sourceEntityId, normalizedQuery });
  if (existing && ['running', 'completed'].includes(existing.status)) return existing;

  const rows = await client.upsert(
    'expansion_queue',
    {
      source_run_id: sourceRunId,
      source_entity_id: sourceEntityId,
      query,
      normalized_query: normalizedQuery,
      platform: safePlatform(platform),
      date_range: safeDateRange(dateRange),
      depth: Math.max(1, Number.parseInt(depth, 10) || 1),
      priority: Number(priority || 0),
      status: 'queued',
      reason,
      metadata,
    },
    { onConflict: 'source_run_id,source_entity_id,normalized_query' },
  );
  const item = mapQueueRow(rows[0]);
  return (await getExpansionQueueItem(client, item.id)) || item;
}

export async function planExpansionQueueForRun(client, runId, { maxItems = 8 } = {}) {
  const detail = await getInvestigationRun(client, runId);
  if (!detail?.run) throw new Error('Investigation run not found.');

  const normalizedRunQuery = normalizeText(detail.run.query || '');
  const candidates = (detail.entities || [])
    .filter((entity) => shouldAutoPlanEntity(entity, normalizedRunQuery))
    .map((entity) => ({
      entity,
      query: expansionQueryForRunEntity(detail.run, entity),
      priority: rankExpansionEntity(entity),
    }))
    .sort((a, b) => b.priority - a.priority || Number(a.entity.rank || 9999) - Number(b.entity.rank || 9999))
    .slice(0, Math.max(1, Number.parseInt(maxItems, 10) || 8));

  const items = [];
  for (const candidate of candidates) {
    const item = await createExpansionQueueItem(client, {
      sourceRunId: detail.run.id,
      sourceEntityId: candidate.entity.id,
      query: candidate.query,
      platform: detail.run.platform || 'all',
      dateRange: detail.run.dateRange || '90',
      depth: Number(detail.run.metadata?.expansion_depth || 0) + 1,
      priority: candidate.priority,
      reason: 'auto_entity_planner_v1',
      metadata: {
        planner: 'auto_entity_planner_v1',
        parent_query: detail.run.query,
        entity_type: candidate.entity.type,
        entity_label: candidate.entity.label,
        entity_rank: candidate.entity.rank,
        entity_weight: candidate.entity.weight,
        entity_post_count: candidate.entity.postCount,
      },
    });
    items.push(item);
  }

  return {
    run: detail.run,
    plannedCount: items.length,
    items,
  };
}

export async function getInvestigationLineage(client, runId, { childLimit = 20, ancestorLimit = 6 } = {}) {
  const current = await getRunSummary(client, runId);
  if (!current) throw new Error('Investigation run not found.');

  const ancestors = [];
  const seen = new Set([current.id]);
  let parentRunId = current.metadata?.parent_run_id || null;
  while (parentRunId && ancestors.length < ancestorLimit && !seen.has(parentRunId)) {
    seen.add(parentRunId);
    const parent = await getRunSummary(client, parentRunId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentRunId = parent.metadata?.parent_run_id || null;
  }

  const inbound = await getInboundExpansionQueueItem(client, current.id);
  const queue = await listExpansionQueue(client, { runId: current.id, limit: childLimit });
  const childItems = queue.filter((item) => item.resultRunId);
  const children = [];
  for (const item of childItems) {
    const run = await getRunSummary(client, item.resultRunId);
    if (run) children.push({ queue: item, run });
  }

  return {
    current,
    ancestors,
    inbound,
    children,
  };
}

export async function runExpansionQueueItem(client, queueId, { resultLimit = 80 } = {}) {
  const item = await getExpansionQueueItem(client, queueId);
  if (!item) throw new Error('Expansion queue item not found.');

  if (item.status === 'completed' && item.resultRunId) {
    return {
      item,
      runResult: null,
      skipped: true,
      reason: 'already_completed',
    };
  }

  if (!['queued', 'failed'].includes(item.status)) {
    throw new Error(`Expansion queue item is ${item.status}, not queued.`);
  }

  const startedAt = new Date().toISOString();
  await updateExpansionQueueItem(client, item.id, {
    status: 'running',
    metadata: mergeMetadata(item, {
      worker: 'expansion_queue_worker_v1',
      started_at: startedAt,
    }),
  });

  try {
    const runResult = await createInvestigationRun({
      client,
      query: item.query,
      dateRange: item.dateRange,
      platform: item.platform,
      resultLimit,
      source: 'expansion_queue_worker',
      metadata: {
        parent_run_id: item.sourceRunId,
        source_queue_id: item.id,
        source_entity_id: item.sourceEntityId,
        parent_queue_id: item.parentQueueId,
        expansion_depth: item.depth,
        expansion_reason: item.reason,
      },
    });
    const completedItem = await updateExpansionQueueItem(client, item.id, {
      status: 'completed',
      result_run_id: runResult.run.id,
      metadata: mergeMetadata(item, {
        worker: 'expansion_queue_worker_v1',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        result_count: runResult.run.result_count,
        graph_node_count: runResult.run.graph_node_count,
        graph_edge_count: runResult.run.graph_edge_count,
      }),
    });

    return {
      item: completedItem,
      runResult,
      skipped: false,
      reason: null,
    };
  } catch (error) {
    await updateExpansionQueueItem(client, item.id, {
      status: 'failed',
      metadata: mergeMetadata(item, {
        worker: 'expansion_queue_worker_v1',
        failed_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }),
    });
    throw error;
  }
}

export async function runNextExpansionQueueItem(client, { runId = null, resultLimit = 80 } = {}) {
  const item = await getNextExpansionQueueItem(client, { runId });
  if (!item) return null;
  return runExpansionQueueItem(client, item.id, { resultLimit });
}
