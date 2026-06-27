import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

async function fetchApprovedPosts(client, limit) {
  const params = new URLSearchParams();
  params.set('select', 'id,city_id,topic_id,author_handle,status,post_hashtags(hashtags(normalized_tag))');
  params.set('status', 'eq.approved');
  params.set('order', 'discovered_at.desc');
  params.set('limit', String(limit));
  return client.select('social_posts', params);
}

function edgeKeyParts(edge) {
  return `${edge.from_type}:${edge.from_key}:${edge.to_type}:${edge.to_key}:${edge.edge_type}`;
}

function buildEdges(posts, searchKey = 'toronto:food') {
  const edges = [];
  for (const post of posts) {
    if (post.city_id) {
      edges.push({
        from_type: 'search',
        from_key: searchKey,
        to_type: 'city',
        to_key: post.city_id,
        edge_type: 'contains',
        weight: 1,
        evidence: { source: 'graph-builder-agent' },
      });
    }
    if (post.topic_id) {
      edges.push({
        from_type: 'search',
        from_key: searchKey,
        to_type: 'topic',
        to_key: post.topic_id,
        edge_type: 'contains',
        weight: 1,
        evidence: { source: 'graph-builder-agent' },
      });
    }
    edges.push({
      from_type: 'search',
      from_key: searchKey,
      to_type: 'post',
      to_key: post.id,
      edge_type: 'matched',
      weight: 0.8,
      evidence: { source: 'graph-builder-agent', author_handle: post.author_handle },
    });
    if (post.author_handle) {
      edges.push({
        from_type: 'post',
        from_key: post.id,
        to_type: 'author',
        to_key: post.author_handle.replace(/^@/, '').toLowerCase(),
        edge_type: 'same_author',
        weight: 0.7,
        evidence: { source: 'graph-builder-agent' },
      });
    }
    for (const entry of post.post_hashtags ?? []) {
      const tag = entry?.hashtags?.normalized_tag;
      if (!tag) continue;
      edges.push({
        from_type: 'post',
        from_key: post.id,
        to_type: 'hashtag',
        to_key: tag,
        edge_type: 'tagged',
        weight: 1,
        evidence: { source: 'graph-builder-agent' },
      });
    }
  }

  return Array.from(new Map(edges.map((edge) => [edgeKeyParts(edge), edge])).values());
}

export async function runGraphBuilder(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const limit = options.limit ?? args.int('limit', 500);
  const searchKey = options.searchKey ?? args.value('search-key', 'toronto:food');
  if (!dryRun) assertWritableSupabase();
  const client = options.client ?? new SupabaseRestClient();
  const posts = await fetchApprovedPosts(client, limit);
  const edges = buildEdges(posts, searchKey);

  if (!dryRun && edges.length > 0) {
    await client.upsert('graph_edges', edges, {
      onConflict: 'from_type,from_key,to_type,to_key,edge_type',
      returning: 'minimal',
    });
  }

  return { posts: posts.length, edges: edges.length, dryRun };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGraphBuilder()
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
