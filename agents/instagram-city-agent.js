import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from './lib/args.js';
import { assessPostRelevance } from './lib/content-filter.js';
import { mapLimit } from './lib/concurrency.js';
import { createCrawlRun, completeCrawlRun, fetchCities, fetchTopics } from './lib/db.js';
import { loadEnv } from './lib/env.js';
import { buildSeedQueries, canonicalInstagramUrl, extractHashtags } from './lib/instagram.js';
import { SupabaseRestClient, assertWritableSupabase } from './lib/supabase-rest.js';

loadEnv();

const defaultCitySignalSeeds = [
  'food',
  'rent-real-estate',
  'jobs',
  'events',
  'immigration',
  'finance',
  'education',
  'transportation',
  'healthcare',
  'travel-outdoors',
];

function compactText(text, limit = 700) {
  return (text ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function looksLikePostUrl(url) {
  return Boolean(canonicalInstagramUrl(url));
}

function jitteredDelayMs(baseMs, jitterRatio) {
  return Math.round(baseMs * (1 + Math.random() * Math.max(0, jitterRatio)));
}

function cutoffDateFromMonths(months) {
  if (!months || months <= 0) return null;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

function dateRangeMeta(sourcePublishedAt, cutoffDate, recentMonths) {
  if (!cutoffDate) return null;
  const publishedAt = sourcePublishedAt ? new Date(sourcePublishedAt) : null;
  const publishedAtKnown = Boolean(publishedAt && Number.isFinite(publishedAt.getTime()));
  return {
    recent_months: recentMonths,
    cutoff: cutoffDate.toISOString(),
    published_at_known: publishedAtKnown,
    within_range: publishedAtKnown ? publishedAt >= cutoffDate : true,
  };
}

function isLikelyRateLimitError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|ERR_HTTP_RESPONSE_CODE_FAILURE|Too Many Requests|rate/i.test(message);
}

async function extractOpenPostSignal(page, fallbackUrl) {
  return page.evaluate((fallback) => {
    const canonical =
      document.querySelector('meta[property="og:url"]')?.getAttribute('content') ??
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      location.href ??
      fallback;
    const article = document.querySelector('article');
    const description =
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
      document.querySelector('meta[name="description"]')?.getAttribute('content') ??
      '';
    const text = [description, article?.innerText ?? document.body.innerText ?? ''].filter(Boolean).join('\n');
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

async function collectPermalinksFromPage(page, url, timeoutMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(2200);
  const loginGate = await page.evaluate(() => {
    const text = document.body.innerText ?? '';
    return location.pathname.startsWith('/accounts/login') || /Log into Instagram|Log in with Facebook|Create new account/.test(text);
  });
  if (loginGate) {
    throw new Error('Instagram login required. Create a storage state with `npm run agent:login:instagram`, then rerun the collector.');
  }

  for (let index = 0; index < 3; index += 1) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(900);
  }

  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    return Array.from(
      new Set(
        anchors
          .map((anchor) => anchor.href || anchor.getAttribute('href') || '')
          .filter(Boolean),
      ),
    );
  });
}

async function returnToSearchPage(page, searchUrl) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(350);

  if (looksLikePostUrl(page.url())) {
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
  }

  const gridLinks = await page.locator('a[href*="/p/"], a[href*="/reel/"]').count().catch(() => 0);
  if (gridLinks === 0) {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function clickPermalinkFromSearchPage(page, sourceUrl, timeoutMs) {
  const clicked = await page.evaluate((targetUrl) => {
    const target = new URL(targetUrl);
    const targetPath = target.pathname.replace(/\/$/, '');
    const anchors = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    const anchor = anchors.find((item) => {
      const href = item.href || item.getAttribute('href') || '';
      try {
        return new URL(href, location.origin).pathname.replace(/\/$/, '') === targetPath;
      } catch {
        return false;
      }
    });
    if (!anchor) return false;
    anchor.click();
    return true;
  }, sourceUrl);

  if (!clicked) return null;
  await page.waitForTimeout(1500);
  const openSignal = await extractOpenPostSignal(page, sourceUrl);
  const canonicalUrl = canonicalInstagramUrl(openSignal.canonical) ?? sourceUrl;
  return {
    sourceUrl: canonicalUrl,
    caption: compactText(openSignal.text),
    authorHandle: openSignal.authorHandle,
    sourcePublishedAt: openSignal.publishedAt,
    hashtags: extractHashtags(openSignal.text),
    extractionMode: 'search-permalink-grid-click',
  };
}

async function collectSignalsFromSearchPage(page, url, limit, timeoutMs, options = {}) {
  const postOpenDelayMs = options.postOpenDelayMs ?? 7000;
  const delayJitterRatio = options.delayJitterRatio ?? 0.6;
  const maxPostInspections = options.maxPostInspections ?? Math.max(limit * 2, 6);
  const maxConsecutivePostOpenFailures = options.maxConsecutivePostOpenFailures ?? 2;
  const signals = [];
  const seen = new Set();
  const hrefs = await collectPermalinksFromPage(page, url, timeoutMs);
  let inspected = 0;
  let consecutivePostOpenFailures = 0;

  for (const href of hrefs) {
    if (signals.length >= limit || inspected >= maxPostInspections) break;
    const sourceUrl = canonicalInstagramUrl(href);
    if (!sourceUrl || seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);

    try {
      inspected += 1;
      if (postOpenDelayMs > 0) await page.waitForTimeout(jitteredDelayMs(postOpenDelayMs, delayJitterRatio));
      const signal = await clickPermalinkFromSearchPage(page, sourceUrl, timeoutMs);
      if (signal) signals.push(signal);
      consecutivePostOpenFailures = 0;
    } catch (error) {
      consecutivePostOpenFailures += 1;
      if (isLikelyRateLimitError(error) || consecutivePostOpenFailures >= maxConsecutivePostOpenFailures) break;
    } finally {
      await returnToSearchPage(page, url);
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
  const token = `${city.slug}-${topic.slug}-${query.searchKind}-${query.profileHandle ?? ''}`.replace(/[^a-z0-9-]/gi, '').slice(0, 42);
  return Array.from({ length: Math.min(limit, 3) }, (_, index) => ({
    sourceUrl: `https://www.instagram.com/p/${token}${index}/`,
    caption: `${city.name_ko} ${topic.label_ko} dry-run signal ${index + 1} ${query.query}`,
    authorHandle: query.profileHandle ?? `datanode_${city.slug}_${index + 1}`,
    sourcePublishedAt: null,
    hashtags: [city.slug, topic.slug, 'dryrun'],
    extractionMode: 'dry-run',
    sourceProfileHandle: query.profileHandle,
    sourceProfileLabel: query.profileLabel,
    sourceQuery: query.query,
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

async function upsertPosts(client, { city, topic, crawlQueryId, signals, dryRun, cutoffDate, recentMonths }) {
  const rows = signals
    .map((signal) => {
      const rangeMeta = dateRangeMeta(signal.sourcePublishedAt, cutoffDate, recentMonths);
      if (rangeMeta && !rangeMeta.within_range) return null;
      const relevance = assessPostRelevance({
        text: [signal.caption, ...(signal.hashtags ?? []).map((tag) => `#${tag}`)].join(' '),
        city,
        topic,
        sourceProfileHandle: signal.sourceProfileHandle,
        sourceQuery: signal.sourceQuery,
      });
      if (!relevance.accepted) return null;
      return {
        platform: 'instagram',
        source_url: signal.sourceUrl,
        canonical_url: signal.sourceUrl,
        city_id: city.id,
        topic_id: topic.id,
        crawl_query_id: dryRun ? null : crawlQueryId,
        author_handle: signal.authorHandle,
        caption: signal.caption,
        language: relevance.language,
        source_published_at: signal.sourcePublishedAt,
        status: relevance.status,
        score: relevance.score,
        metadata: {
          collector: 'instagram-city-agent',
          extraction_mode: signal.extractionMode,
          hashtags: signal.hashtags,
          source_query: signal.sourceQuery,
          source_profile_handle: signal.sourceProfileHandle,
          source_profile_label: signal.sourceProfileLabel,
          relevance_filter: relevance,
          date_range: rangeMeta,
        },
      };
    })
    .filter(Boolean);

  if (dryRun || rows.length === 0) return rows;
  return client.upsert('social_posts', rows, { onConflict: 'source_url' });
}

export async function runCollector(options = {}) {
  const args = options.args ?? parseArgs();
  const dryRun = options.dryRun ?? args.flag('dry-run');
  const citySlugs = options.cities ?? args.list('cities', args.value('city') ? [args.value('city')] : ['toronto']);
  const topicSlugs = options.topics ?? args.list('topics', args.value('topic') ? [args.value('topic')] : defaultCitySignalSeeds);
  const queryLimit = options.queryLimit ?? args.int('queries', 8);
  const perQueryLimit = options.perQueryLimit ?? args.int('per-query', 8);
  const timeoutMs = options.timeoutMs ?? args.int('timeout-ms', 20000);
  const concurrency = options.concurrency ?? args.int('concurrency', 2);
  const postOpenDelayMs = options.postOpenDelayMs ?? args.int('post-open-delay-ms', 7000);
  const queryDelayMs = options.queryDelayMs ?? args.int('query-delay-ms', 3000);
  const delayJitterRatio = options.delayJitterRatio ?? Number.parseFloat(args.value('delay-jitter-ratio', '0.6'));
  const maxPostInspectionsPerQuery = options.maxPostInspectionsPerQuery ?? args.int('max-post-inspections-per-query', Math.max(perQueryLimit * 2, 6));
  const maxConsecutivePostOpenFailures = options.maxConsecutivePostOpenFailures ?? args.int('max-consecutive-post-open-failures', 2);
  const recentMonths = options.recentMonths ?? (args.value('recent-months') ? args.int('recent-months', null) : null);
  const cutoffDate = cutoffDateFromMonths(recentMonths);
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
            metadata: { collection_mode: 'city_keyword_graph', city: city.slug, seed_topic: topic.slug, recent_months: recentMonths, cutoff: cutoffDate?.toISOString() ?? null, dryRun },
          });

      let discovered = 0;
      let inserted = 0;
      try {
        for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
          const query = queries[queryIndex];
          if (!dryRun && queryIndex > 0 && queryDelayMs > 0) {
            await new Promise((resolveDelay) => setTimeout(resolveDelay, jitteredDelayMs(queryDelayMs, delayJitterRatio)));
          }
          const page = browserBundle ? await browserBundle.context.newPage() : null;
          let signals = [];
          try {
            signals = dryRun
              ? dryRunSignals(query, city, topic, perQueryLimit)
              : await collectSignalsFromSearchPage(page, query.url, perQueryLimit, timeoutMs, {
                  postOpenDelayMs,
                  delayJitterRatio,
                  maxPostInspections: maxPostInspectionsPerQuery,
                  maxConsecutivePostOpenFailures,
                });
          } finally {
            await page?.close();
          }
          const annotatedSignals = signals.map((signal) => ({
            ...signal,
            sourceProfileHandle: query.profileHandle,
            sourceProfileLabel: query.profileLabel,
            sourceQuery: query.query,
          }));
          const uniqueSignals = Array.from(new Map(annotatedSignals.map((signal) => [signal.sourceUrl, signal])).values()).slice(0, perQueryLimit);
          discovered += uniqueSignals.length;
          const crawlQuery = await insertQuery(client, { runId: run.id, city, topic, query, resultCount: uniqueSignals.length, dryRun });
          const postRows = await upsertPosts(client, { city, topic, crawlQueryId: crawlQuery.id, signals: uniqueSignals, dryRun, cutoffDate, recentMonths });
          inserted += postRows.length;
        }
        if (!dryRun) {
          await completeCrawlRun(client, run.id, {
            status: 'completed',
            metadata: { collection_mode: 'city_keyword_graph', city: city.slug, seed_topic: topic.slug, recent_months: recentMonths, cutoff: cutoffDate?.toISOString() ?? null, discovered, inserted },
          });
        }
        summary.push({ platform: 'instagram', collectionMode: 'city_keyword_graph', city: city.slug, seedTopic: topic.slug, recentMonths, queries: queries.length, discovered, inserted, dryRun });
      } catch (error) {
        if (!dryRun) {
          await completeCrawlRun(client, run.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: { collection_mode: 'city_keyword_graph', city: city.slug, seed_topic: topic.slug, recent_months: recentMonths, cutoff: cutoffDate?.toISOString() ?? null, discovered, inserted },
          });
        }
        throw error;
      }
    });
  } finally {
    await browserBundle?.browser.close();
  }

  return summary.sort((a, b) => `${a.city}:${a.seedTopic}`.localeCompare(`${b.city}:${b.seedTopic}`));
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
