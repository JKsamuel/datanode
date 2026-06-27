export async function fetchCities(client, slugs = []) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,name_ko,name_en,province_code,aliases');
  params.set('order', 'slug.asc');
  if (slugs.length > 0) params.set('slug', `in.(${slugs.join(',')})`);
  return client.select('cities', params);
}

export async function fetchTopics(client, slugs = []) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,label_ko,label_en,keywords,seed_hashtags');
  params.set('order', 'slug.asc');
  if (slugs.length > 0) params.set('slug', `in.(${slugs.join(',')})`);
  return client.select('topics', params);
}

export async function createCrawlRun(client, { cityId, topicId, metadata }) {
  const rows = await client.insert('crawl_runs', {
    source: 'instagram_playwright',
    status: 'running',
    city_id: cityId,
    topic_id: topicId,
    started_at: new Date().toISOString(),
    metadata,
  });
  return rows[0];
}

export async function completeCrawlRun(client, runId, patch) {
  const params = new URLSearchParams({ id: `eq.${runId}` });
  return client.patch('crawl_runs', params, {
    status: patch.status,
    completed_at: new Date().toISOString(),
    error_message: patch.errorMessage ?? null,
    metadata: patch.metadata ?? {},
  });
}

export async function upsertHashtagsForPost(client, postId, hashtags) {
  const uniqueTags = Array.from(new Set(hashtags.map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean)));
  if (uniqueTags.length === 0) return;

  const hashtagRows = uniqueTags.map((tag) => ({ tag, normalized_tag: tag.toLowerCase() }));
  await client.upsert('hashtags', hashtagRows, { onConflict: 'normalized_tag', returning: 'minimal' });

  const params = new URLSearchParams();
  params.set('select', 'id,normalized_tag');
  params.set('normalized_tag', `in.(${hashtagRows.map((row) => row.normalized_tag).join(',')})`);
  const storedTags = await client.select('hashtags', params);
  await client.upsert(
    'post_hashtags',
    storedTags.map((tag) => ({ post_id: postId, hashtag_id: tag.id })),
    { onConflict: 'post_id,hashtag_id', returning: 'minimal' },
  );
}
