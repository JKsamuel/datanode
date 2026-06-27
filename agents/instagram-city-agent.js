import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from './lib/args.js';
import { mapLimit } from './lib/concurrency.js';
import { createCrawlRun, completeCrawlRun, fetchCities, fetchTopics } from './lib/db.js';
import { loadEnv } from './lib/env.js';
import { buildSeedQueries, canonicalInstagramUrl, extractHashtags } from './lib/instagram.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

function compactText(text, limit = 700) {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function looksLikePostUrl(url) {
  return Boolean(canonicalInstagramUrl(url));
}

async function extractOpenPostSignal(page, fallbackUrl) {
  return page.evaluate((fallback) => {
    const canonical =
      document.querySelector('meta[property="og:url"]')?.getAttribute('content') ??
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      location.href ??
      fallback;
    const article = document.querySelector('article');
    const text = article?.innerText ?? document.body.innerText ?? '';
    const authorHref = Array.from(document.querySelectorAll('article a[href^="/"], a[href^="/"]'))
      .map((anchor) => anchor.getAttribute('href') ?? '')
      .find((href) => /^\/(?!p\/|reel\/|explore\/|accounts\/|about\/)[^/?#]+\/?$/.test(href));
    const authorHandle = authorHref ? authorHref.replace(/^\/|\/$/g, '') : null;
    const publishedAt =
      document.querySelector('time[datetime]')?.getAttribute('datetime') ??
      document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ??
      null;
    return { canonical, text, authorHandle, publishedAt };
  }, fallbackUrl);
}

async function returnToSearchGrid(page, searchUrl) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(350);

  if (looksLikePostUrl(page.url())) {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(700);
  }

  const gridLinks = await page.locator('a[href*="/p/"], a[href*="/reel/"]').count().catch(() => 0);
  if (gridLinks === 0) {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
}

async function collectSignalsFromSearchGrid(page, url, limit, timeoutMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(1600);
  const signals = [];
  const seen = new Set();

  for (let index = 0; signals.length < limit; index += 1) {
    const cards = page.locator('a[href*="/p/"], a[href*="/reel/"]');
    const cardCount = await cards.count();
    if (index >= cardCount) break;

    const card = cards.nth(index);
    const href = await card.getAttribute('href').catch(() => null);
    const fallbackUrl = canonicalInstagramUrl(href ?? '');
    if (!fallbackUrl || seen.has(fallbackUrl)) continue;
    seen.add(fallbackUrl);

    try {
      await card.click({ timeout: 8000 });
      await page.waitForTimeout(1300);
      const openSignal = await extractOpenPostSignal(page, fallbackUrl);
      const sourceUrl = canonicalInstagramUrl(openSignal.canonical) ?? fallbackUrl;
      signals.push({
        sourceUrl,
        caption: compactText(openSignal.text),
        authorHandle: openSignal.authorHandle,
        sourcePublishedAt: openSignal.publishedAt,
        hashtags: extractHashtags(openSignal.text),
        extractionMode: 'search-grid-card-click',
      });
    } finally {
      await returnToSearchGrid(page, url);
    }
  }

  return signals;
}

async function createBrowser({ headed, storageState }) {
  const { chromium } = await import('playwright');
  const launchOptions = { headless: !headed };
  const browser = await chromium.launch(launchOptions);
  const contextOptions = {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  };
  if (storageState && existsSync(storageState)) contextOptions.storageState = storageState;
  const context = await browser.newContext(contextOptions);
  return { browser, context };
}

function dryRunSignals(query, city, topic, limit) {
  const token = `${city.slug}-${topic.slug}-${query.searchKind}`.replace(/[^a-z0-9-]/gi, '').slice(0, 42);
  return Array.from({ length: Math.min(limit, 3) }, (_, index) => ({
    sourceUrl: `https://www.instagram.com/p/${token}${index}/`,
    caption: `${city.name_ko} ${topic.label_ko} dry-run signal ${index + 1} ${query.query}`,
    authorHandle: `datanode_${city.slug}_${index + 1}`,
    sourcePublishedAt: null,
    hashtags: [city.slug, topic.slug, 'dryrun'],
    extractionMode: 'dry-run',
  }));
}

async function insertQuery(client, { runId, city, topic, query, resultCount, dryRun }) {
  if (dryRun) {
    return { id: `dry-${city.slug}-${topic.slug}-${query.searchKind}-${query.query}` };
  }
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
    platform: 'instagram',
    source_url: signal.sourceUrl,
    canonical_url: signal.sourceUrl,
    city_id: city.id,
    topic_id: topic.id,
    crawl_query_id: dryRun ? null : crawlQueryId,
    author_handle: signal.authorHandle,
    caption: signal.caption,
    source_published_at: signal.sourcePublishedAt,
    status: 'candidate',
    score: 0.5,
    metadata: {
      collector: 'instagram-city-agent',
      extraction_mode: signal.extractionMode,
      hashtags: signal.hashtags,
    },
  }));

  if (dryRun || rows.length === 0) return rows;
  return client.upsert('social_posts', rows, { onConflict: 'source_url' });
}

export async function runCollector(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const citySlugs = options.cities ?? args.list('cities', args.value('city') ? [args.value('city')] : ['toronto']);
  const topicSlugs = options.topics ?? args.list('topics', args.value('topic') ? [args.value('topic')] : ['food']);
  const queryLimit = options.queryLimit ?? args.int('queries', 6);
  const perQueryLimit = options.perQueryLimit ?? args.int('per-query', 8);
  const timeoutMs = options.timeoutMs ?? args.int('timeout-ms', 20000);
  const concurrency = options.concurrency ?? args.int('concurrency', 2);
  const headed = options.headed ?? args.flag('headed');
  const storageState = resolve(args.value('storage-state', process.env.INSTAGRAM_PLAYWRIGHT_STORAGE_STATE ?? 'agents/.instagram-storage-state.json'));
  if (!dryRun) assertWritableSupabase();
  const client = options.client ?? new SupabaseRestClient();
  const cities = await fetchCities(client, citySlugs);
  const topics = await fetchTopics(client, topicSlugs);
  const segments = cities.flatMap((city) => topics.map((topic) => ({ city, topic })));
  const browserBundle = dryRun ? null : await createBrowser({ headed, storageState });
  const summary = [];

  try {
    await mapLimit(segments, concurrency, async ({ city, topic }) => {
      const queries = buildSeedQueries(city, topic, queryLimit);
      const run = dryRun
        ? { id: `dry-${city.slug}-${topic.slug}` }
        : await createCrawlRun(client, {
            cityId: city.id,
            topicId: topic.id,
            metadata: { city: city.slug, topic: topic.slug, dryRun },
          });

      let discovered = 0;
      let inserted = 0;
      try {
        for (const query of queries) {
          const page = browserBundle ? await browserBundle.context.newPage() : null;
          let signals = [];
          try {
            signals = dryRun ? dryRunSignals(query, city, topic, perQueryLimit) : await collectSignalsFromSearchGrid(page, query.url, perQueryLimit, timeoutMs);
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
            metadata: { city: city.slug, topic: topic.slug, discovered, inserted },
          });
        }
        summary.push({ city: city.slug, topic: topic.slug, queries: queries.length, discovered, inserted, dryRun });
      } catch (error) {
        if (!dryRun) {
          await completeCrawlRun(client, run.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: { city: city.slug, topic: topic.slug, discovered, inserted },
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
  runCollector()
    .then((summary) => {
      console.log(JSON.stringify({ ok: true, summary }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
