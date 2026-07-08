import { parseArgs } from './lib/args.js';
import { assessPostRelevance } from './lib/content-filter.js';
import { fetchCities } from './lib/db.js';
import { loadEnv } from './lib/env.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

function hashtagsForPost(post) {
  return (post.post_hashtags ?? []).map((entry) => entry?.hashtags?.normalized_tag).filter(Boolean);
}

function cutoffDateFromMonths(months) {
  if (!months || months <= 0) return null;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

function isOlderThanCutoff(sourcePublishedAt, cutoffDate) {
  if (!sourcePublishedAt || !cutoffDate) return false;
  const publishedAt = new Date(sourcePublishedAt);
  if (!Number.isFinite(publishedAt.getTime())) return false;
  return publishedAt < cutoffDate;
}

async function fetchReviewPosts(client, { citySlugs, platforms, statuses, limit }) {
  const cities = await fetchCities(client, citySlugs);
  const params = new URLSearchParams();
  params.set(
    'select',
    'id,platform,status,caption,author_handle,source_published_at,metadata,cities(slug,name_ko,name_en,province_code,aliases),topics(slug,label_ko,label_en,keywords,seed_hashtags),post_hashtags(hashtags(normalized_tag))',
  );
  if (cities.length > 0) params.set('city_id', `in.(${cities.map((city) => city.id).join(',')})`);
  if (platforms.length > 0) params.set('platform', `in.(${platforms.join(',')})`);
  if (statuses.length > 0) params.set('status', `in.(${statuses.join(',')})`);
  params.set('order', 'discovered_at.desc');
  params.set('limit', String(limit));
  return client.select('social_posts', params);
}

export async function runCandidateReview(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const citySlugs = options.cities ?? args.list('cities', args.value('city') ? [args.value('city')] : []);
  const platforms = options.platforms ?? args.list('platforms', args.value('platform') ? [args.value('platform')] : []);
  const statuses = options.statuses ?? args.list('statuses', ['candidate', 'approved']);
  const limit = options.limit ?? args.int('limit', 200);
  const approveThreshold = options.approveThreshold ?? Number.parseFloat(args.value('approve-threshold', '0.55'));
  const recentMonths = options.recentMonths ?? (args.value('recent-months') ? args.int('recent-months', null) : null);
  const cutoffDate = cutoffDateFromMonths(recentMonths);
  if (!dryRun) assertWritableSupabase();

  const client = options.client ?? new SupabaseRestClient();
  const posts = await fetchReviewPosts(client, { citySlugs, platforms, statuses, limit });
  const summary = { reviewed: 0, approved: 0, candidate: 0, rejected: 0, expired: 0, recentMonths, dryRun, posts: [] };

  for (const post of posts) {
    const tags = hashtagsForPost(post);
    const relevance = assessPostRelevance({
      text: [post.caption, ...tags.map((tag) => `#${tag}`)].join(' '),
      city: post.cities,
      topic: post.topics,
      sourceProfileHandle: post.metadata?.source_profile_handle,
      sourceQuery: post.metadata?.source_query,
    });
    const expired = isOlderThanCutoff(post.source_published_at, cutoffDate);
    const nextStatus = expired ? 'expired' : relevance.accepted ? (relevance.score >= approveThreshold ? 'approved' : 'candidate') : 'rejected';
    summary.reviewed += 1;
    summary[nextStatus] += 1;
    summary.posts.push({
      id: post.id,
      platform: post.platform,
      previousStatus: post.status,
      nextStatus,
      score: relevance.score,
      publishedAt: post.source_published_at,
      reasons: relevance.reasons,
      caption: String(post.caption ?? '').slice(0, 120),
    });

    if (!dryRun) {
      const params = new URLSearchParams({ id: `eq.${post.id}` });
      await client.patch(
        'social_posts',
        params,
        {
          status: nextStatus,
          score: relevance.score,
          language: relevance.language,
          reviewed_at: new Date().toISOString(),
          metadata: {
            ...(post.metadata ?? {}),
            reviewer: 'review-candidates-agent',
            auto_approved: nextStatus === 'approved',
            review_recent_months: recentMonths,
            review_cutoff: cutoffDate?.toISOString() ?? null,
            relevance_filter: relevance,
          },
        },
        { returning: 'minimal' },
      );
    }
  }

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCandidateReview()
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
