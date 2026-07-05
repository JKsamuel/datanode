import { parseArgs } from './lib/args.js';
import { assessPostRelevance } from './lib/content-filter.js';
import { upsertHashtagsForPost } from './lib/db.js';
import { loadEnv } from './lib/env.js';
import { extractHashtags } from './lib/instagram.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

async function fetchPendingPosts(client, limit) {
  const params = new URLSearchParams();
  params.set(
    'select',
    'id,source_url,caption,author_handle,status,metadata,cities(slug,name_ko,name_en,province_code,aliases),topics(slug,label_ko,label_en,keywords,seed_hashtags)',
  );
  params.set('status', 'in.(candidate,approved)');
  params.set('order', 'discovered_at.desc');
  params.set('limit', String(limit));
  return client.select('social_posts', params);
}

async function inspectPost(page, sourceUrl, timeoutMs) {
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const bodyText = document.body.innerText ?? '';
    const publishedAt =
      document.querySelector('time[datetime]')?.getAttribute('datetime') ??
      document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ??
      null;
    const title =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
      document.title ??
      '';
    return { bodyText, publishedAt, title };
  });
}

async function createBrowser({ headed }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  });
  return { browser, context };
}

export async function runEnrichment(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const limit = options.limit ?? args.int('limit', 20);
  const timeoutMs = options.timeoutMs ?? args.int('timeout-ms', 20000);
  const headed = options.headed ?? args.flag('headed');
  const allowDirectPostGoto = options.allowDirectPostGoto ?? args.flag('allow-direct-post-goto');
  if (!dryRun) {
    assertWritableSupabase();
    if (!allowDirectPostGoto) {
      throw new Error('Live enrichment directly opens post URLs. Use the search-grid collector flow, or pass --allow-direct-post-goto explicitly.');
    }
  }
  const client = options.client ?? new SupabaseRestClient();
  const posts = await fetchPendingPosts(client, limit);
  const browserBundle = dryRun ? null : await createBrowser({ headed });
  const summary = [];

  try {
    for (const post of posts) {
      const page = browserBundle ? await browserBundle.context.newPage() : null;
      try {
        const signals = dryRun
          ? { bodyText: `${post.caption ?? ''} #dryrun #instagram`, publishedAt: null, title: post.author_handle ?? '' }
          : await inspectPost(page, post.source_url, timeoutMs);
        const hashtags = extractHashtags(signals.bodyText);
        const caption = post.caption || signals.title || signals.bodyText.replace(/\s+/g, ' ').slice(0, 500);
        const relevance = assessPostRelevance({
          text: [caption, signals.bodyText, ...hashtags.map((tag) => `#${tag}`)].join(' '),
          city: post.cities,
          topic: post.topics,
          sourceProfileHandle: post.metadata?.source_profile_handle,
          sourceQuery: post.metadata?.source_query,
        });
        if (!dryRun) {
          const params = new URLSearchParams({ id: `eq.${post.id}` });
          await client.patch('social_posts', params, {
            caption,
            source_published_at: signals.publishedAt,
            language: relevance.language,
            status: relevance.accepted ? 'approved' : 'rejected',
            score: relevance.score,
            reviewed_at: new Date().toISOString(),
            metadata: {
              ...(post.metadata ?? {}),
              enricher: 'enrichment-agent',
              relevance_filter: relevance,
            },
          });
          if (relevance.accepted) await upsertHashtagsForPost(client, post.id, hashtags);
        }
        summary.push({ postId: post.id, accepted: relevance.accepted, status: relevance.status, hashtags: hashtags.length, dryRun });
      } finally {
        await page?.close();
      }
    }
  } finally {
    await browserBundle?.browser.close();
  }

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEnrichment()
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
