import { createHash } from 'node:crypto';
import { extractRunEntities } from './entity-extraction.js';

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(query) {
  return Array.from(new Set(normalizeText(query).split(' ').filter((token) => token.length >= 2)));
}

function cleanTag(tag) {
  return String(tag ?? '').replace(/^#+/, '').trim();
}

function includesTerm(normalizedText, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (/^[a-z0-9/-]+$/i.test(normalizedTerm)) {
    return normalizedText.split(' ').includes(normalizedTerm);
  }
  return normalizedText.includes(normalizedTerm);
}

function inferCity(query, cities) {
  const normalized = normalizeText(query);
  return (
    cities.find((city) => {
      const terms = [city.slug, city.name_ko, city.name_en, ...(city.aliases ?? [])];
      return terms.some((term) => includesTerm(normalized, term));
    }) ?? null
  );
}

function inferTopic(query, topics) {
  const normalized = normalizeText(query);
  return (
    topics.find((topic) => {
      const terms = [topic.slug, topic.label_ko, topic.label_en, ...(topic.keywords ?? []), ...(topic.seed_hashtags ?? [])];
      return terms.some((term) => includesTerm(normalized, term));
    }) ?? null
  );
}

function windowForDateRange(dateRange, now = new Date()) {
  if (dateRange === 'all') return { windowStart: null, windowEnd: now };
  const days = Number.parseInt(dateRange, 10);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 90;
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - safeDays);
  return { windowStart, windowEnd: now };
}

function postDate(post) {
  const date = post.publishedAt ? new Date(post.publishedAt) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function postMatchesWindow(post, windowStart) {
  if (!windowStart) return true;
  const publishedAt = postDate(post);
  return publishedAt ? publishedAt >= windowStart : true;
}

function runKeyFor({ query, platform, dateRange, windowEnd }) {
  const day = windowEnd.toISOString().slice(0, 10);
  const normalizedQuery = normalizeText(query || 'untitled');
  const digest = createHash('sha1').update(`${normalizedQuery}|${platform}|${dateRange}|${day}`).digest('hex').slice(0, 14);
  return `run:${day}:${digest}`;
}

export function mapPostRow(row) {
  const city = row.cities || {};
  const topic = row.topics || {};
  const hashtags = (row.post_hashtags || [])
    .map((entry) => entry?.hashtags?.normalized_tag)
    .filter(Boolean);
  const media = row.post_media || [];
  return {
    id: row.id,
    platform: row.platform || 'instagram',
    sourceUrl: row.source_url,
    thumbnailUrl: media[0]?.media_url,
    cityId: row.city_id,
    topicId: row.topic_id,
    citySlug: city.slug,
    cityName: city.name_en || city.slug,
    topicSlug: topic.slug,
    topicName: topic.label_en || topic.slug,
    handle: row.author_handle || row.author_name || row.platform || 'post',
    caption: row.caption || '',
    query: row.metadata?.query || row.metadata?.source_query || topic.label_en || '',
    hashtags,
    score: Number(row.score || 0),
    status: row.status || 'approved',
    publishedAt: row.source_published_at || row.discovered_at || null,
  };
}

function mapRunRow(row) {
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
    citySlug: row.cities?.slug ?? null,
    cityName: row.cities?.name_en ?? null,
    topicSlug: row.topics?.slug ?? null,
    topicName: row.topics?.label_en ?? null,
    metadata: row.metadata ?? {},
  };
}

function mapRunPostRow(row) {
  const post = mapPostRow(row.social_posts || {});
  return {
    ...post,
    rank: row.rank,
    relevanceScore: Number(row.relevance_score || 0),
    matchReasons: row.match_reasons || [],
    runPostCreatedAt: row.created_at,
  };
}

function mapRunEntityRow(row) {
  const entity = row.entities || {};
  return {
    id: entity.id,
    type: entity.entity_type,
    label: entity.label,
    normalizedKey: entity.normalized_key,
    language: entity.language,
    rank: row.rank,
    weight: Number(row.weight || 0),
    postCount: row.post_count,
    postIds: row.evidence_post_ids || [],
    evidence: row.evidence || {},
    metadata: entity.metadata || {},
  };
}

async function loadApprovedPosts(client, limit) {
  const select = [
    'id',
    'platform',
    'source_url',
    'city_id',
    'topic_id',
    'author_name',
    'author_handle',
    'caption',
    'score',
    'status',
    'source_published_at',
    'discovered_at',
    'metadata',
    'cities(slug,name_ko,name_en,aliases)',
    'topics(slug,label_ko,label_en,keywords,seed_hashtags)',
    'post_hashtags(hashtags(normalized_tag))',
  ].join(',');
  const params = new URLSearchParams();
  params.set('select', select);
  params.set('status', 'eq.approved');
  params.set('order', 'source_published_at.desc.nullslast,discovered_at.desc');
  params.set('limit', String(limit));
  const rows = await client.select('social_posts', params);
  return rows.map(mapPostRow);
}

async function loadCities(client) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,name_ko,name_en,aliases');
  params.set('order', 'slug.asc');
  return client.select('cities', params);
}

async function loadTopics(client) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,label_ko,label_en,keywords,seed_hashtags');
  params.set('order', 'slug.asc');
  return client.select('topics', params);
}

function scorePost(post, { tokens, city, topic, explicitCity, explicitTopic }) {
  if (explicitCity && post.citySlug !== city.slug) return null;
  if (explicitTopic && post.topicSlug !== topic.slug) return null;

  const haystack = normalizeText([post.cityName, post.citySlug, post.topicName, post.topicSlug, post.handle, post.caption, post.query, ...post.hashtags].join(' '));
  let relevance = 0;
  const reasons = [];

  if (explicitCity && post.citySlug === city.slug) {
    relevance += 5;
    reasons.push(`city:${city.slug}`);
  }
  if (explicitTopic && post.topicSlug === topic.slug) {
    relevance += 5;
    reasons.push(`topic:${topic.slug}`);
  }

  for (const token of tokens) {
    if (explicitCity && [normalizeText(city.name_ko), normalizeText(city.name_en), city.slug].includes(token)) continue;
    if (explicitTopic && [normalizeText(topic.label_ko), normalizeText(topic.label_en), topic.slug].includes(token)) continue;
    if (haystack.includes(token)) {
      relevance += token.length > 3 ? 2 : 1;
      reasons.push(`keyword:${token}`);
    }
  }

  if (tokens.length === 0 && !explicitCity && !explicitTopic) relevance = Number(post.score || 0);
  if (relevance <= 0) return null;
  return {
    post,
    relevanceScore: Number((relevance + Number(post.score || 0)).toFixed(4)),
    matchReasons: Array.from(new Set(reasons)).slice(0, 12),
  };
}

function graphCounts(results, entities = []) {
  const postIds = new Set(results.map((entry) => entry.post.id));
  const graphNodeCount = 1 + postIds.size + entities.length;
  const graphEdgeCount = postIds.size + entities.reduce((sum, entity) => sum + entity.postIds.length, 0);
  return { graphNodeCount, graphEdgeCount };
}

function mapEntityKey(entity) {
  return `${entity.type}:${entity.normalizedKey}`;
}

async function saveRunEntities(client, runId, entities) {
  const deleteParams = new URLSearchParams({ run_id: `eq.${runId}` });
  await client.delete('investigation_run_entities', deleteParams);
  if (entities.length === 0) return [];

  const entityRows = await client.upsert(
    'entities',
    entities.map((entity) => ({
      entity_type: entity.type,
      normalized_key: entity.normalizedKey,
      label: entity.label,
      language: entity.language,
      metadata: {
        extractor: 'rule_based_v1',
        evidence_count: entity.evidence.length,
      },
    })),
    { onConflict: 'entity_type,normalized_key' },
  );
  const idByKey = new Map(entityRows.map((row) => [`${row.entity_type}:${row.normalized_key}`, row.id]));
  const runEntityRows = entities
    .map((entity, index) => {
      const entityId = idByKey.get(mapEntityKey(entity));
      if (!entityId) return null;
      return {
        run_id: runId,
        entity_id: entityId,
        rank: index + 1,
        weight: entity.weight,
        post_count: entity.postCount,
        evidence_post_ids: entity.postIds,
        evidence: {
          extractor: 'rule_based_v1',
          samples: entity.evidence,
        },
      };
    })
    .filter(Boolean);

  if (runEntityRows.length > 0) {
    await client.insert('investigation_run_entities', runEntityRows, { returning: 'minimal' });
  }
  return entities;
}

export async function createInvestigationRun({
  client,
  query = 'Hamilton',
  dateRange = '90',
  platform = 'all',
  source = 'datanode_ui',
  postLimit = 500,
  resultLimit = 80,
} = {}) {
  const safePlatform = ['all', 'instagram', 'threads', 'tiktok', 'youtube', 'x', 'web'].includes(platform) ? platform : 'all';
  const safeDateRange = dateRange === 'all' || /^\d+$/.test(String(dateRange)) ? String(dateRange) : '90';
  const normalizedQuery = normalizeText(query || 'Hamilton');
  const now = new Date();
  const { windowStart, windowEnd } = windowForDateRange(safeDateRange, now);
  const [cities, topics, posts] = await Promise.all([loadCities(client), loadTopics(client), loadApprovedPosts(client, postLimit)]);
  const city = inferCity(query, cities);
  const topic = inferTopic(query, topics);
  const tokens = queryTokens(query);
  const scopedPosts = posts
    .filter((post) => safePlatform === 'all' || post.platform === safePlatform)
    .filter((post) => postMatchesWindow(post, windowStart));
  const scored = scopedPosts
    .map((post) =>
      scorePost(post, {
        tokens,
        city,
        topic,
        explicitCity: Boolean(city),
        explicitTopic: Boolean(topic),
      }),
    )
    .filter(Boolean)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || Number(b.post.score || 0) - Number(a.post.score || 0))
    .slice(0, resultLimit);
  const extractedEntities = extractRunEntities(scored.map((entry) => entry.post));
  const { graphNodeCount, graphEdgeCount } = graphCounts(scored, extractedEntities);
  const runKey = runKeyFor({ query, platform: safePlatform, dateRange: safeDateRange, windowEnd });
  const metadata = {
    requested_query: query,
    normalized_query: normalizedQuery,
    inferred_city: city?.slug ?? null,
    inferred_topic: topic?.slug ?? null,
    scoped_post_count: scopedPosts.length,
    scoring: 'city_topic_keyword_relevance_v1',
  };

  const runRows = await client.upsert(
    'investigation_runs',
    {
      run_key: runKey,
      query,
      normalized_query: normalizedQuery,
      city_id: city?.id ?? null,
      topic_id: topic?.id ?? null,
      platform: safePlatform,
      date_range: safeDateRange,
      window_start: windowStart?.toISOString() ?? null,
      window_end: windowEnd.toISOString(),
      status: 'completed',
      source,
      result_count: scored.length,
      graph_node_count: graphNodeCount,
      graph_edge_count: graphEdgeCount,
      is_public: true,
      metadata,
    },
    { onConflict: 'run_key' },
  );
  const run = runRows[0];
  const deleteParams = new URLSearchParams({ run_id: `eq.${run.id}` });
  await client.delete('investigation_run_posts', deleteParams);

  if (scored.length > 0) {
    await client.insert(
      'investigation_run_posts',
      scored.map((entry, index) => ({
        run_id: run.id,
        post_id: entry.post.id,
        rank: index + 1,
        relevance_score: entry.relevanceScore,
        match_reasons: entry.matchReasons,
      })),
      { returning: 'minimal' },
    );
  }
  await saveRunEntities(client, run.id, extractedEntities);

  return {
    run,
    posts: scored.map((entry, index) => ({
      id: entry.post.id,
      rank: index + 1,
      relevanceScore: entry.relevanceScore,
      matchReasons: entry.matchReasons,
      platform: entry.post.platform,
      handle: entry.post.handle,
      caption: entry.post.caption,
      publishedAt: entry.post.publishedAt,
    })),
    entities: extractedEntities,
  };
}

export async function listInvestigationRuns(client, { limit = 12 } = {}) {
  const params = new URLSearchParams();
  params.set(
    'select',
    [
      'id',
      'run_key',
      'query',
      'platform',
      'date_range',
      'status',
      'result_count',
      'graph_node_count',
      'graph_edge_count',
      'created_at',
      'metadata',
      'cities(slug,name_en)',
      'topics(slug,label_en)',
    ].join(','),
  );
  params.set('is_public', 'eq.true');
  params.set('order', 'created_at.desc');
  params.set('limit', String(limit));
  const rows = await client.select('investigation_runs', params);
  return rows.map(mapRunRow);
}

export async function getInvestigationRun(client, runId) {
  const runParams = new URLSearchParams();
  runParams.set(
    'select',
    [
      'id',
      'run_key',
      'query',
      'platform',
      'date_range',
      'status',
      'result_count',
      'graph_node_count',
      'graph_edge_count',
      'created_at',
      'metadata',
      'cities(slug,name_en)',
      'topics(slug,label_en)',
    ].join(','),
  );
  runParams.set('id', `eq.${runId}`);
  runParams.set('limit', '1');
  const runs = await client.select('investigation_runs', runParams);
  const run = runs[0];
  if (!run) return null;

  const postParams = new URLSearchParams();
  postParams.set(
    'select',
    `rank,relevance_score,match_reasons,created_at,social_posts(${[
      'id',
      'platform',
      'source_url',
      'city_id',
      'topic_id',
      'author_name',
      'author_handle',
      'caption',
      'score',
      'status',
      'source_published_at',
      'discovered_at',
      'metadata',
      'cities(slug,name_ko,name_en,aliases)',
      'topics(slug,label_ko,label_en,keywords,seed_hashtags)',
      'post_media(media_url)',
      'post_hashtags(hashtags(normalized_tag))',
    ].join(',')})`,
  );
  postParams.set('run_id', `eq.${runId}`);
  postParams.set('order', 'rank.asc');
  const runPostRows = await client.select('investigation_run_posts', postParams);
  const entityParams = new URLSearchParams();
  entityParams.set(
    'select',
    'rank,weight,post_count,evidence_post_ids,evidence,entities(id,entity_type,normalized_key,label,language,metadata)',
  );
  entityParams.set('run_id', `eq.${runId}`);
  entityParams.set('order', 'rank.asc');
  const runEntityRows = await client.select('investigation_run_entities', entityParams);

  return {
    run: mapRunRow(run),
    posts: runPostRows.map(mapRunPostRow),
    entities: runEntityRows.map(mapRunEntityRow),
  };
}
