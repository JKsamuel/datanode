import { parseArgs } from './lib/args.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

async function fetchApprovedPosts(client, limit) {
  const params = new URLSearchParams();
  params.set('select', 'id,city_id,topic_id,author_handle,caption,status,post_hashtags(hashtags(normalized_tag))');
  params.set('status', 'eq.approved');
  params.set('order', 'discovered_at.desc');
  params.set('limit', String(limit));
  return client.select('social_posts', params);
}

function edgeKeyParts(edge) {
  return `${edge.from_type}:${edge.from_key}:${edge.to_type}:${edge.to_key}:${edge.edge_type}`;
}

const STOPWORDS = new Set([
  '있는',
  '많은',
  '관련',
  '중심',
  '포스트',
  'instagram',
  'threads',
  'toronto',
  'vancouver',
  'canada',
  'with',
  'from',
  'that',
  'this',
]);

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s/-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensForPost(post) {
  const tags = (post.post_hashtags ?? []).map((entry) => entry?.hashtags?.normalized_tag).filter(Boolean);
  const tokens = normalizeText([post.caption, ...tags].join(' '))
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  return Array.from(new Set(tokens));
}

function postTags(post) {
  return new Set((post.post_hashtags ?? []).map((entry) => entry?.hashtags?.normalized_tag).filter(Boolean));
}

function canonicalPostPair(a, b) {
  return String(a.id).localeCompare(String(b.id)) <= 0 ? [a, b] : [b, a];
}

function pushPostPairEdge(edges, postA, postB, edgeType, weight, evidence) {
  const [from, to] = canonicalPostPair(postA, postB);
  edges.push({
    from_type: 'post',
    from_key: from.id,
    to_type: 'post',
    to_key: to.id,
    edge_type: edgeType,
    weight,
    evidence: {
      source: 'graph-builder-agent',
      ...evidence,
    },
  });
}

export function buildEdges(posts, searchKey = 'toronto:food') {
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

  for (let i = 0; i < posts.length; i += 1) {
    for (let j = i + 1; j < posts.length; j += 1) {
      const left = posts[i];
      const right = posts[j];

      if (left.city_id && left.city_id === right.city_id) {
        pushPostPairEdge(edges, left, right, 'same_city', 0.55, { city_id: left.city_id });
      }

      if (left.topic_id && left.topic_id === right.topic_id) {
        pushPostPairEdge(edges, left, right, 'same_topic', 0.6, { topic_id: left.topic_id });
      }

      if (left.author_handle && left.author_handle === right.author_handle) {
        pushPostPairEdge(edges, left, right, 'same_author', 0.85, { author_handle: left.author_handle });
      }

      const leftTags = postTags(left);
      const rightTags = postTags(right);
      const sharedTags = Array.from(leftTags).filter((tag) => rightTags.has(tag));
      const leftTokens = tokensForPost(left);
      const rightTokens = new Set(tokensForPost(right));
      const sharedTokens = leftTokens.filter((token) => rightTokens.has(token));
      const similarityWeight = Math.min(0.95, sharedTags.length * 0.16 + sharedTokens.length * 0.08);

      if (similarityWeight >= 0.16) {
        pushPostPairEdge(edges, left, right, 'similar_caption', similarityWeight, {
          shared_tags: sharedTags.slice(0, 8),
          shared_tokens: sharedTokens.slice(0, 12),
        });
      }
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
  let posts = [];
  try {
    posts = await fetchApprovedPosts(client, limit);
  } catch (error) {
    if (!dryRun) throw error;
    console.warn(`[DataNode] Skipping graph-builder DB read in dry-run: ${error.message}`);
  }
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
