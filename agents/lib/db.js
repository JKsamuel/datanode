const fallbackCities = [
  { id: 'local-city-canada', slug: 'canada', name_ko: '캐나다', name_en: 'Canada', province_code: null, aliases: ['canada', '캐나다'] },
  { id: 'local-city-toronto', slug: 'toronto', name_ko: '토론토', name_en: 'Toronto', province_code: 'ON', aliases: ['GTA', 'toronto', '토론토'] },
  { id: 'local-city-vancouver', slug: 'vancouver', name_ko: '밴쿠버', name_en: 'Vancouver', province_code: 'BC', aliases: ['metro vancouver', 'vancouver', '밴쿠버'] },
  { id: 'local-city-montreal', slug: 'montreal', name_ko: '몬트리올', name_en: 'Montreal', province_code: 'QC', aliases: ['montréal', 'mtl', '몽트리올'] },
  { id: 'local-city-calgary', slug: 'calgary', name_ko: '캘거리', name_en: 'Calgary', province_code: 'AB', aliases: ['yyc', 'calgary'] },
  { id: 'local-city-edmonton', slug: 'edmonton', name_ko: '에드먼턴', name_en: 'Edmonton', province_code: 'AB', aliases: ['yeg', 'edmonton'] },
  { id: 'local-city-ottawa', slug: 'ottawa', name_ko: '오타와', name_en: 'Ottawa', province_code: 'ON', aliases: ['ottawa'] },
  { id: 'local-city-winnipeg', slug: 'winnipeg', name_ko: '위니펙', name_en: 'Winnipeg', province_code: 'MB', aliases: ['wpg', 'winnipeg'] },
  { id: 'local-city-halifax', slug: 'halifax', name_ko: '핼리팩스', name_en: 'Halifax', province_code: 'NS', aliases: ['yhz', 'halifax'] },
  { id: 'local-city-victoria', slug: 'victoria', name_ko: '빅토리아', name_en: 'Victoria', province_code: 'BC', aliases: ['yyj', 'victoria bc'] },
  { id: 'local-city-waterloo-kitchener', slug: 'waterloo-kitchener', name_ko: '워털루/키치너', name_en: 'Waterloo/Kitchener', province_code: 'ON', aliases: ['waterloo', 'kitchener', 'kw', 'kwc'] },
  { id: 'local-city-mississauga', slug: 'mississauga', name_ko: '미시사가', name_en: 'Mississauga', province_code: 'ON', aliases: ['mississauga', '미시사가', 'GTA'] },
];

const fallbackTopics = [
  { id: 'local-topic-rent-real-estate', slug: 'rent-real-estate', label_ko: '렌트/부동산', label_en: 'Rent and real estate', keywords: ['렌트', '월세', '콘도 렌트', 'room rent', 'lease'], seed_hashtags: ['캐나다렌트', '캐나다집구하기', 'canadarent'] },
  { id: 'local-topic-immigration', slug: 'immigration', label_ko: '이민', label_en: 'Immigration', keywords: ['이민', '영주권', '워크퍼밋', 'study permit', 'PR'], seed_hashtags: ['캐나다이민', '캐나다영주권', 'canadaimmigration'] },
  { id: 'local-topic-jobs', slug: 'jobs', label_ko: '일자리/커리어', label_en: 'Jobs and career', keywords: ['일자리', '구인', '취업', 'part time job', 'resume'], seed_hashtags: ['캐나다취업', '캐나다구인', 'canadajobs'] },
  { id: 'local-topic-finance', slug: 'finance', label_ko: '금융/생활비', label_en: 'Finance and cost of living', keywords: ['세금', '크레딧', '은행', 'cost of living'], seed_hashtags: ['캐나다세금', '캐나다생활비', 'canadatax'] },
  { id: 'local-topic-food', slug: 'food', label_ko: '맛집/카페', label_en: 'Food and cafes', keywords: ['맛집', '카페', '브런치', 'restaurant', 'cafe'], seed_hashtags: ['캐나다맛집', '캐나다카페', 'canadafood', 'canadacafe'] },
  { id: 'local-topic-events', slug: 'events', label_ko: '이벤트', label_en: 'Events', keywords: ['이벤트', '주말 행사', 'festival', 'popup'], seed_hashtags: ['캐나다이벤트', 'canadaevents', 'weekendevents'] },
  { id: 'local-topic-education', slug: 'education', label_ko: '교육/유학', label_en: 'Education', keywords: ['유학', '컬리지', '대학교', 'ESL'], seed_hashtags: ['캐나다유학', 'studyincanada'] },
  { id: 'local-topic-transportation', slug: 'transportation', label_ko: '교통/차', label_en: 'Transportation', keywords: ['교통', '운전면허', '자동차 보험', 'transit'], seed_hashtags: ['캐나다교통', 'driverlicense'] },
  { id: 'local-topic-healthcare', slug: 'healthcare', label_ko: '의료', label_en: 'Healthcare', keywords: ['병원', '워크인 클리닉', '약국', 'health card'], seed_hashtags: ['캐나다병원', 'canadahealthcare'] },
  { id: 'local-topic-travel-outdoors', slug: 'travel-outdoors', label_ko: '여행/아웃도어', label_en: 'Travel and outdoors', keywords: ['근교 여행', '하이킹', '캠핑', 'road trip'], seed_hashtags: ['캐나다여행', 'canadatravel'] },
];

function filterBySlugs(rows, slugs) {
  if (!slugs.length) return rows;
  const wanted = new Set(slugs);
  return rows.filter((row) => wanted.has(row.slug));
}

export async function fetchCities(client, slugs = []) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,name_ko,name_en,province_code,aliases');
  params.set('order', 'slug.asc');
  if (slugs.length > 0) params.set('slug', `in.(${slugs.join(',')})`);
  try {
    return await client.select('cities', params);
  } catch (error) {
    console.warn(`[DataNode] Using local city fallback: ${error.message}`);
    return filterBySlugs(fallbackCities, slugs);
  }
}

export async function fetchTopics(client, slugs = []) {
  const params = new URLSearchParams();
  params.set('select', 'id,slug,label_ko,label_en,keywords,seed_hashtags');
  params.set('order', 'slug.asc');
  if (slugs.length > 0) params.set('slug', `in.(${slugs.join(',')})`);
  try {
    return await client.select('topics', params);
  } catch (error) {
    console.warn(`[DataNode] Using local topic fallback: ${error.message}`);
    return filterBySlugs(fallbackTopics, slugs);
  }
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
