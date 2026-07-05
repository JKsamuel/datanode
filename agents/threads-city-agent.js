import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from './lib/args.js';
import { mapLimit } from './lib/concurrency.js';
import { createCrawlRun, completeCrawlRun, fetchCities, fetchTopics } from './lib/db.js';
import { loadEnv } from './lib/env.js';
import { buildThreadsSeedQueries, canonicalThreadsUrl, extractThreadsTags } from './lib/threads.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

function compactText(text, limit = 900) {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function createBrowser({ headed, storageState }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: !headed });
  const contextOptions = {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  };
  if (storageState && existsSync(storageState)) contextOptions.storageState = storageState;
  const context = await browser.newContext(contextOptions);
  return { browser, context };
}

async function extractOpenThreadSignal(page, fallbackUrl) {
  return page.evaluate((fallback) => {
    const canonical =
      document.querySelector('meta[property="og:url"]')?.getAttribute('content') ??
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      location.href ??
      fallback;
    const article = document.querySelector('article') ?? document.querySelector('[role="article"]');
    const text = article?.innerText ?? document.body.innerText ?? '';
    const authorHref = Array.from(document.querySelectorAll('a[href^="/@"], a[href*="threads.com/@"], a[href*="threads.net/@"]'))
      .map((anchor) => anchor.getAttribute('href') ?? '')
      .find((href) => /\/@[^/?#]+/.test(href));
    const authorHandle = authorHref?.match(/@([^/?#]+)/)?.[1] ?? null;
    const publishedAt =
      document.querySelector('time[datetime]')?.getAttribute('datetime') ??
      document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ??
      null;
    const mediaUrl =
      document.querySelector('article img[src], [role="article"] img[src]')?.getAttribute('src') ??
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
      null;
    return { canonical, text, authorHandle, publishedAt, mediaUrl };
  }, fallbackUrl);
}

async function returnToSearch(page, searchUrl) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(350);
  if (canonicalThreadsUrl(page.url())) {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 7000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  const resultCount = await page.locator('a[href*="/post/"]').count().catch(() => 0);
  if (resultCount === 0) {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }
}

async function collectSignalsFromThreadsSearch(page, url, limit, timeoutMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(1800);
  const signals = [];
  const seen = new Set();

  for (let index = 0; signals.length < limit; index += 1) {
    const cards = page.locator('a[href*="/post/"]');
    const cardCount = await cards.count();
    if (index >= cardCount) break;

    const card = cards.nth(index);
    const href = await card.getAttribute('href').catch(() => null);
    const fallbackUrl = canonicalThreadsUrl(href ?? '');
    if (!fallbackUrl || seen.has(fallbackUrl)) continue;
    seen.add(fallbackUrl);

    try {
      await card.click({ timeout: 8000 });
      await page.waitForTimeout(1200);
      const openSignal = await extractOpenThreadSignal(page, fallbackUrl);
      const sourceUrl = canonicalThreadsUrl(openSignal.canonical) ?? fallbackUrl;
      const caption = compactText(openSignal.text);
      signals.push({
        sourceUrl,
        caption,
        authorHandle: openSignal.authorHandle,
        sourcePublishedAt: openSignal.publishedAt,
        mediaUrl: openSignal.mediaUrl,
        hashtags: extractThreadsTags(caption),
        extractionMode: 'threads-search-card-click',
      });
    } finally {
      await returnToSearch(page, url);
    }
  }

  return signals;
}

function dryRunSignals(query, city, topic, limit) {
  const token = `${city.slug}-${topic.slug}-${query.query}`.replace(/[^a-z0-9-]/gi, '').slice(0, 44);
  return Array.from({ length: Math.min(limit, 3) }, (_, index) => ({
    sourceUrl: `https://www.threads.com/@datanode_${city.slug}/post/${token}${index}`,
    caption: `${city.name_ko} ${topic.label_ko} 관련 고민과 질문 dry-run thread ${index + 1}: ${query.query}`,
    authorHandle: `datanode_${city.slug}_${index + 1}`,
    sourcePublishedAt: null,
    mediaUrl: null,
    hashtags: [city.slug, topic.slug, 'threads', 'dryrun'],
    extractionMode: 'dry-run',
  }));
}

async function insertQuery(client, { runId, city, topic, query, resultCount, dryRun }) {
  if (dryRun) return { id: `dry-threads-${city.slug}-${topic.slug}-${query.query}` };
  const rows = await client.insert('crawl_queries', {
    crawl_run_id: runId,
    city_id: city.id,
    topic_id: topic.id,
    query: query.query,
    search_kind: query.searchKind,
    source_url: query.url,
    result_count: resultCount,
  });
  return rows[0];
}

async function upsertPosts(client, { city, topic, crawlQueryId, signals, dryRun }) {
  const rows = signals.map((signal) => ({
    platform: 'threads',
    source_url: signal.sourceUrl,
    canonical_url: signal.sourceUrl,
    city_id: city.id,
    topic_id: topic.id,
    crawl_query_id: dryRun ? null : crawlQueryId,
    author_handle: signal.authorHandle,
    caption: signal.caption,
    source_published_at: signal.sourcePublishedAt,
    status: 'candidate',
    score: 0.45,
    metadata: {
      collector: 'threads-city-agent',
      extraction_mode: signal.extractionMode,
      hashtags: signal.hashtags,
      media_url: signal.mediaUrl,
    },
  }));

  if (dryRun || rows.length === 0) return rows;
  return client.upsert('social_posts', rows, { onConflict: 'source_url' });
}

export async function runThreadsCollector(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const citySlugs = options.cities ?? args.list('cities', args.value('city') ? [args.value('city')] : ['toronto']);
  const topicSlugs = options.topics ?? args.list('topics', args.value('topic') ? [args.value('topic')] : ['food']);
  const queryLimit = options.queryLimit ?? args.int('queries', 8);
  const perQueryLimit = options.perQueryLimit ?? args.int('per-query', 6);
  const timeoutMs = options.timeoutMs ?? args.int('timeout-ms', 20000);
  const concurrency = options.concurrency ?? args.int('concurrency', 2);
  const headed = options.headed ?? args.flag('headed');
  const storageState = resolve(args.value('storage-state', process.env.THREADS_PLAYWRIGHT_STORAGE_STATE ?? 'agents/.threads-storage-state.json'));
  if (!dryRun) assertWritableSupabase();
  const client = options.client ?? new SupabaseRestClient();
  const cities = await fetchCities(client, citySlugs);
  const topics = await fetchTopics(client, topicSlugs);
  const segments = cities.flatMap((city) => topics.map((topic) => ({ city, topic })));
  const browserBundle = dryRun ? null : await createBrowser({ headed, storageState });
  const summary = [];

  try {
    await mapLimit(segments, concurrency, async ({ city, topic }) => {
      const queries = buildThreadsSeedQueries(city, topic, queryLimit);
      const run = dryRun
        ? { id: `dry-threads-${city.slug}-${topic.slug}` }
        : await createCrawlRun(client, {
            cityId: city.id,
            topicId: topic.id,
            metadata: { platform: 'threads', city: city.slug, topic: topic.slug, dryRun },
          });

      let discovered = 0;
      let inserted = 0;
      try {
        for (const query of queries) {
          const page = browserBundle ? await browserBundle.context.newPage() : null;
          let signals = [];
          try {
            signals = dryRun ? dryRunSignals(query, city, topic, perQueryLimit) : await collectSignalsFromThreadsSearch(page, query.url, perQueryLimit, timeoutMs);
          } finally {
            await page?.close();
          }
          const uniqueSignals = Array.from(new Map(signals.map((signal) => [signal.sourceUrl, signal])).values()).slice(0, perQueryLimit);
          discovered += uniqueSignals.length;
          const crawlQuery = await insertQuery(client, { runId: run.id, city, topic, query, resultCount: uniqueSignals.length, dryRun });
          const postRows = await upsertPosts(client, { city, topic, crawlQueryId: crawlQuery.id, signals: uniqueSignals, dryRun });
          inserted += postRows.length;
        }
        if (!dryRun) {
          await completeCrawlRun(client, run.id, {
            status: 'completed',
            metadata: { platform: 'threads', city: city.slug, topic: topic.slug, discovered, inserted },
          });
        }
        summary.push({ platform: 'threads', city: city.slug, topic: topic.slug, queries: queries.length, discovered, inserted, dryRun });
      } catch (error) {
        if (!dryRun) {
          await completeCrawlRun(client, run.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: { platform: 'threads', city: city.slug, topic: topic.slug, discovered, inserted },
          });
        }
        throw error;
      }
    });
  } finally {
    await browserBundle?.browser.close();
  }

  return summary.sort((a, b) => `${a.city}:${a.topic}`.localeCompare(`${b.city}:${b.topic}`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runThreadsCollector()
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
