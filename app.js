const allCity = { slug: "all", ko: "전체 지역", en: "All Cities" };

const cities = [
  { slug: "toronto", ko: "토론토", en: "Toronto" },
  { slug: "vancouver", ko: "밴쿠버", en: "Vancouver" },
  { slug: "montreal", ko: "몬트리올", en: "Montreal" },
  { slug: "calgary", ko: "캘거리", en: "Calgary" },
  { slug: "edmonton", ko: "에드먼턴", en: "Edmonton" },
  { slug: "ottawa", ko: "오타와", en: "Ottawa" },
  { slug: "winnipeg", ko: "위니펙", en: "Winnipeg" },
  { slug: "halifax", ko: "핼리팩스", en: "Halifax" },
  { slug: "victoria", ko: "빅토리아", en: "Victoria" },
  { slug: "waterloo-kitchener", ko: "워털루/키치너", en: "Waterloo/Kitchener" },
  { slug: "hamilton", ko: "해밀턴", en: "Hamilton" },
  { slug: "burlington", ko: "벌링턴", en: "Burlington" },
  { slug: "oakville", ko: "오크빌", en: "Oakville" },
];

const cityFilters = [allCity, ...cities];

const topics = [
  { slug: "rent-real-estate", ko: "렌트/부동산", terms: ["렌트", "부동산", "월세", "집구하기", "콘도", "room", "rent", "lease", "housing"] },
  { slug: "immigration", ko: "이민", terms: ["이민", "영주권", "비자", "워크퍼밋", "pr", "immigration", "visa", "permit"] },
  { slug: "jobs", ko: "일자리/커리어", terms: ["일자리", "취업", "커리어", "구인", "알바", "job", "career", "resume"] },
  { slug: "finance", ko: "금융/생활비", terms: ["금융", "생활비", "세금", "은행", "크레딧", "finance", "cost", "tax", "bank"] },
  { slug: "food", ko: "맛집/카페", terms: ["맛집", "카페", "브런치", "식당", "라멘", "디저트", "food", "cafe", "restaurant", "brunch"] },
  { slug: "events", ko: "이벤트", terms: ["이벤트", "행사", "축제", "모임", "event", "festival", "popup"] },
  { slug: "education", ko: "교육/유학", terms: ["교육", "유학", "학교", "컬리지", "대학교", "study", "college", "university"] },
  { slug: "transportation", ko: "교통/차", terms: ["교통", "차", "자동차", "운전", "보험", "transit", "car", "driver"] },
  { slug: "healthcare", ko: "의료", terms: ["의료", "병원", "약국", "클리닉", "health", "clinic", "hospital", "pharmacy"] },
  { slug: "travel-outdoors", ko: "여행/아웃도어", terms: ["여행", "하이킹", "캠핑", "근교", "travel", "hiking", "camping", "trip"] },
];

const fallbackPosts = [
  {
    id: "ramen",
    sourceUrl: "https://www.instagram.com/explore/tags/torontoramen/",
    handle: "toronto.foodmap",
    caption: "다운타운 라멘, 웨이팅 있는 일본식 라멘집, 늦은 저녁에도 인기.",
    query: "#토론토맛집",
    hashtags: ["토론토맛집", "torontoramen", "downtown", "ramen"],
    score: 86,
  },
  {
    id: "brunch",
    sourceUrl: "https://www.instagram.com/explore/tags/torontobrunch/",
    handle: "queenwest.table",
    caption: "Queen West 브런치 카페. 주말 예약과 디저트 메뉴 언급이 많은 포스트.",
    query: "Toronto brunch",
    hashtags: ["torontobrunch", "queenwest", "cafe", "dessert"],
    score: 78,
  },
  {
    id: "koreanbbq",
    sourceUrl: "https://www.instagram.com/explore/tags/koreanbbq/",
    handle: "kfood.to",
    caption: "North York 한식 고깃집. 단체 모임, 주차, 반찬 키워드와 연결.",
    query: "토론토 한식",
    hashtags: ["한식맛집", "koreanbbq", "northyork", "토론토맛집"],
    score: 82,
  },
  {
    id: "dessert",
    sourceUrl: "https://www.instagram.com/explore/tags/torontodessert/",
    handle: "sweetspots.ca",
    caption: "디저트와 베이커리 중심 포스트. 카페 투어 노드로 확장 가능.",
    query: "#캐나다디저트",
    hashtags: ["torontodessert", "bakery", "cafe", "캐나다디저트"],
    score: 74,
  },
  {
    id: "sushi",
    sourceUrl: "https://www.instagram.com/explore/tags/vancouverfood/",
    handle: "westcoast.bites",
    caption: "스시, 이자카야, 늦은 저녁 식사 키워드가 함께 등장하는 포스트.",
    query: "#vancouverfood",
    hashtags: ["vancouverfood", "sushi", "izakaya", "datenight"],
    score: 80,
  },
];

const state = {
  city: "toronto",
  topic: null,
  selected: "root",
  expandedPost: null,
  query: "토론토",
  source: "mock data",
};

let basePosts = fallbackPosts;
let baseEdges = [];
let currentGraph = null;
let animationStarted = false;
const sphereLatitudes = [-60, -40, -20, 0, 20, 40, 60];
const sphereLongitudes = Array.from({ length: 12 }, (_, index) => index * 30);

const sphere = {
  rotX: -0.22,
  rotY: 0.36,
  velocityX: 0.0007,
  velocityY: 0.0015,
  zoom: 1,
  draggingCanvas: false,
  draggingNode: null,
  nodeMoved: false,
  suppressClick: false,
  lastX: 0,
  lastY: 0,
  nodePoints: new Map(),
};

function activeCity() {
  if (state.city === allCity.slug) return allCity;
  return cities.find((city) => city.slug === state.city) || cities[0];
}

function activeTopic() {
  if (!state.topic) return null;
  return topics.find((topic) => topic.slug === state.topic) || null;
}

function normalizeText(text) {
  return (text || "").toLowerCase().replace(/[#@]/g, " ").replace(/[^\p{L}\p{N}\s/-]/gu, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(query) {
  return Array.from(new Set(normalizeText(query).split(" ").filter((token) => token.length >= 2)));
}

function includesTerm(normalizedText, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (/^[a-z0-9/-]+$/i.test(normalizedTerm)) {
    return normalizedText.split(" ").includes(normalizedTerm);
  }
  return normalizedText.includes(normalizedTerm);
}

function queryMentionsCity(query, city) {
  const normalized = normalizeText(query);
  return [city.slug, city.ko, city.en].some((term) => includesTerm(normalized, term));
}

function queryMentionsTopic(query, topic) {
  const normalized = normalizeText(query);
  return [topic.slug, topic.ko, ...(topic.terms || [])].some((term) => includesTerm(normalized, term));
}

function detectCity(query) {
  const normalized = normalizeText(query);
  return cities.find((city) => queryMentionsCity(normalized, city)) || null;
}

function inferTopic(query) {
  const normalized = normalizeText(query);
  return topics.find((topic) => queryMentionsTopic(normalized, topic)) || null;
}

function cleanTag(tag) {
  return tag.replace(/^#+/, "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function thumbnailForPost(post) {
  if (post.thumbnailUrl) return post.thumbnailUrl;
  const caption = encodeURIComponent((post.caption || post.handle || "DataNode").slice(0, 80));
  const hue = Array.from(post.id || post.handle || "post").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='hsl(${hue},55%25,28%25)'/%3E%3Cstop offset='1' stop-color='hsl(${(hue + 52) % 360},58%25,18%25)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' fill='url(%23g)'/%3E%3Ccircle cx='90' cy='24' r='24' fill='rgba(255,255,255,.18)'/%3E%3Cpath d='M16 82 42 54l20 19 13-13 29 32v16H16z' fill='rgba(255,255,255,.28)'/%3E%3Ctext x='12' y='22' fill='white' font-family='Arial' font-size='9' font-weight='700'%3E${caption}%3C/text%3E%3C/svg%3E`;
}

function pointFromLatLng(lat, lng) {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  const ringRadius = Math.cos(phi);
  return {
    x: Math.cos(theta) * ringRadius,
    y: Math.sin(phi),
    z: Math.sin(theta) * ringRadius,
  };
}

function gridIntersectionPoint(index, total) {
  const lat = sphereLatitudes[index % sphereLatitudes.length];
  const lng = sphereLongitudes[(index * 5 + Math.floor(index / sphereLatitudes.length) * 2) % sphereLongitudes.length];
  return pointFromLatLng(lat, lng + (total > sphereLongitudes.length ? 0 : 15));
}

function normalizePoint(point) {
  const length = Math.hypot(point.x, point.y, point.z) || 1;
  return { x: point.x / length, y: point.y / length, z: point.z / length };
}

function postsForState() {
  const detectedCity = detectCity(state.query);
  const city = detectedCity || allCity;
  const topic = inferTopic(state.query);
  const explicitCity = Boolean(detectedCity);
  const explicitTopic = Boolean(topic);
  state.city = city.slug;
  state.topic = topic?.slug || null;
  const tokens = queryTokens(state.query);
  const genericAllQuery =
    !explicitCity &&
    !explicitTopic &&
    (tokens.length === 0 || tokens.every((token) => ["캐나다", "canada", "전체", "all", "social", "소셜"].includes(token)));
  if (genericAllQuery) return basePosts.slice(0, 16).sort((a, b) => b.score - a.score);

  const scoredPosts = basePosts
    .map((post) => {
      if (explicitCity && post.citySlug !== city.slug) return null;
      if (explicitTopic && post.topicSlug !== topic.slug) return null;
      const haystack = normalizeText([post.cityName, post.citySlug, post.topicName, post.topicSlug, post.handle, post.caption, post.query, ...(post.hashtags || [])].join(" "));
      let relevance = 0;
      if (explicitCity && post.citySlug === city.slug) relevance += 5;
      if (explicitTopic && post.topicSlug === topic.slug) relevance += 5;
      tokens.forEach((token) => {
        if (explicitCity && (token === normalizeText(city.ko) || token === normalizeText(city.en) || token === city.slug)) return;
        if (haystack.includes(token)) relevance += token.length > 3 ? 2 : 1;
      });
      return { ...post, relevance };
    })
    .filter(Boolean)
    .filter((post) => post.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.score - a.score);

  if (scoredPosts.length > 0) return scoredPosts.slice(0, 16);
  if (state.source === "Supabase connected") return [];

  return basePosts.map((post) => ({
    ...post,
    id: `${city.slug}-${state.topic || "all"}-${post.id}`,
    cityName: city.slug === allCity.slug ? post.cityName || "Toronto" : city.ko,
    topicName: activeTopic()?.ko || post.topicName || "소셜 신호",
    handle: city.slug === allCity.slug || city.slug === "toronto" ? post.handle : `${city.slug}.${post.handle.split(".")[0]}`,
    query: city.slug === allCity.slug ? post.query : post.query.replace("토론토", city.ko),
    hashtags: Array.from(new Set([city.slug === allCity.slug ? "canada" : city.slug, ...post.hashtags])),
  }));
}

async function fetchSupabaseRows(path) {
  const config = window.DATANODE_SUPABASE;
  if (!config?.url || !config?.publishableKey) return null;

  const response = await fetch(`${config.url.replace(/\/+$/, "")}/rest/v1/${path}`, {
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase REST failed: ${response.status}`);
  }

  return response.json();
}

async function loadSupabasePosts() {
  const select = [
    "id",
    "platform",
    "source_url",
    "author_handle",
    "caption",
    "score",
    "metadata",
    "cities(slug,name_ko,name_en)",
    "topics(slug,label_ko)",
    "post_media(media_url)",
    "post_hashtags(hashtags(normalized_tag))",
  ].join(",");
  const rows = await fetchSupabaseRows(
    `social_posts?select=${encodeURIComponent(select)}&status=eq.approved&order=source_published_at.desc.nullslast&limit=100`,
  );

  if (!Array.isArray(rows) || rows.length === 0) return null;

  return rows.map((row) => {
    const city = row.cities || {};
    const topic = row.topics || {};
    const hashtags = (row.post_hashtags || [])
      .map((entry) => entry?.hashtags?.normalized_tag)
      .filter(Boolean);
    const media = row.post_media || [];

    return {
      id: row.id,
      platform: row.platform || "instagram",
      sourceUrl: row.source_url,
      thumbnailUrl: media[0]?.media_url,
      citySlug: city.slug,
      topicSlug: topic.slug,
      cityName: city.name_ko || city.slug,
      topicName: topic.label_ko || topic.slug,
      handle: row.author_handle || "instagram",
      caption: row.caption || row.source_url,
      query: row.metadata?.query || topic.label_ko || "Instagram",
      hashtags,
      score: Math.round(Number(row.score || 0) * 100),
    };
  });
}

async function loadSupabaseEdges() {
  const rows = await fetchSupabaseRows(
    "graph_edges?select=from_type,from_key,to_type,to_key,edge_type,weight,evidence&order=created_at.desc&limit=1000",
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    fromType: row.from_type,
    fromKey: row.from_key,
    toType: row.to_type,
    toKey: row.to_key,
    edgeType: row.edge_type,
    weight: Number(row.weight || 0),
    evidence: row.evidence || {},
  }));
}

function topTags(posts) {
  const counts = new Map();
  posts.forEach((post) => {
    post.hashtags.forEach((raw) => {
      const tag = cleanTag(raw);
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([tag]) => tag);
}

const clusterRules = [
  { id: "housing-cost", label: "비용/가격", terms: ["렌트", "월세", "가격", "비용", "rent", "cost", "deposit", "fee"] },
  { id: "area", label: "지역/동네", terms: ["다운타운", "노스욕", "North York", "Scarborough", "지역", "동네", "주차", "parking"] },
  { id: "recommendation", label: "추천/후기", terms: ["추천", "후기", "맛집", "카페", "브런치", "restaurant", "cafe", "popular"] },
  { id: "risk", label: "주의/문제", terms: ["사기", "주의", "계약", "문제", "어렵", "scam", "lease", "issue"] },
  { id: "community", label: "질문/커뮤니티", terms: ["질문", "고민", "찾", "구해", "모임", "정보", "question", "looking"] },
];

function clusterForPost(post) {
  const text = `${post.caption} ${post.query} ${post.hashtags.join(" ")}`.toLowerCase();
  return (
    clusterRules.find((cluster) => cluster.terms.some((term) => text.includes(term.toLowerCase()))) || {
      id: "signals",
      label: "관련 신호",
      terms: [],
    }
  );
}

function truncate(text, limit = 120) {
  const value = (text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

const keywordStopwords = new Set([
  "있는",
  "많은",
  "관련",
  "중심",
  "포스트",
  "instagram",
  "threads",
  "toronto",
  "vancouver",
  "canada",
  "with",
  "from",
  "that",
  "this",
]);

function postText(post) {
  return [post.cityName, post.citySlug, post.topicName, post.topicSlug, post.handle, post.caption, post.query, ...(post.hashtags || [])].join(" ");
}

function sharedPostScore(source, target) {
  if (!source || !target || source.id === target.id) return 0;
  const sourceTags = new Set((source.hashtags || []).map(cleanTag).map((tag) => normalizeText(tag)));
  const targetTags = new Set((target.hashtags || []).map(cleanTag).map((tag) => normalizeText(tag)));
  let score = 0;
  sourceTags.forEach((tag) => {
    if (tag && targetTags.has(tag)) score += 4;
  });
  if (source.citySlug && source.citySlug === target.citySlug) score += 2;
  if (source.topicSlug && source.topicSlug === target.topicSlug) score += 2;
  if (source.handle && source.handle === target.handle) score += 3;

  const sourceTokens = queryTokens(source.caption).filter((token) => !keywordStopwords.has(token));
  const targetText = normalizeText(postText(target));
  sourceTokens.slice(0, 12).forEach((token) => {
    if (targetText.includes(token)) score += 1;
  });
  return score;
}

function topCaptionKeywords(post, posts) {
  const counts = new Map();
  const tokens = queryTokens(`${post.caption} ${(post.hashtags || []).join(" ")}`)
    .filter((token) => token.length >= 3)
    .filter((token) => !keywordStopwords.has(token))
    .filter((token) => ![post.citySlug, post.topicSlug, normalizeText(post.cityName), normalizeText(post.topicName)].includes(token));

  tokens.forEach((token) => {
    const relatedCount = posts.filter((candidate) => candidate.id !== post.id && normalizeText(postText(candidate)).includes(token)).length;
    if (relatedCount > 0) counts.set(token, relatedCount);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 3)
    .map(([token, count]) => ({ token, count }));
}

function interestingKeywords(posts, city, topic) {
  const cityTerms = new Set([city.slug, normalizeText(city.ko), normalizeText(city.en), "캐나다", "canada", "전체", "지역"]);
  const topicTerms = new Set(topic ? [topic.slug, normalizeText(topic.ko), ...(topic.terms || []).map(normalizeText)] : []);
  const keywordMap = new Map();

  const addKeyword = (label, post, boost, kind = "keyword") => {
    const normalized = normalizeText(label);
    if (!normalized || normalized.length < 2) return;
    if (keywordStopwords.has(normalized) || cityTerms.has(normalized) || topicTerms.has(normalized)) return;
    if (/^\d+$/.test(normalized)) return;
    const current = keywordMap.get(normalized) || { label: cleanTag(label), query: cleanTag(label), kind, score: 0, postIds: new Set() };
    current.score += boost + Math.max(0, Number(post.score || 0)) / 100;
    current.postIds.add(String(post.id));
    keywordMap.set(normalized, current);
  };

  posts.forEach((post) => {
    (post.hashtags || []).forEach((tag) => addKeyword(cleanTag(tag), post, 5, "hashtag"));
    queryTokens(`${post.caption} ${post.query || ""}`)
      .filter((token) => token.length >= 2)
      .forEach((token) => addKeyword(token, post, token.length > 3 ? 2.2 : 1.4));
  });

  return Array.from(keywordMap.values())
    .map((entry) => ({ ...entry, postIds: Array.from(entry.postIds) }))
    .filter((entry) => entry.postIds.length > 0)
    .sort((a, b) => b.postIds.length - a.postIds.length || b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 7);
}

function storedPostRelations(selectedPost, posts, edges) {
  const postIds = new Set(posts.map((post) => String(post.id)));
  const relatedByType = new Map();
  edges.forEach((edge) => {
    if (edge.fromType !== "post" || edge.toType !== "post") return;
    let otherId = null;
    if (String(edge.fromKey) === String(selectedPost.id)) otherId = String(edge.toKey);
    if (String(edge.toKey) === String(selectedPost.id)) otherId = String(edge.fromKey);
    if (!otherId || !postIds.has(otherId)) return;
    if (!relatedByType.has(edge.edgeType)) relatedByType.set(edge.edgeType, []);
    relatedByType.get(edge.edgeType).push({ postId: otherId, weight: edge.weight, evidence: edge.evidence });
  });
  return relatedByType;
}

function buildExpansionBranches(selectedPost, posts, edges = []) {
  if (!selectedPost) return [];
  const storedRelations = storedPostRelations(selectedPost, posts, edges);
  const relatedByScore = posts
    .filter((post) => post.id !== selectedPost.id)
    .map((post) => ({ post, score: sharedPostScore(selectedPost, post) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.score - a.post.score);

  const branches = [];
  const addBranch = (branch) => {
    const relatedIds = Array.from(new Set(branch.relatedIds || []));
    if (relatedIds.length === 0) return;
    if (branches.some((entry) => entry.id === branch.id)) return;
    branches.push({ ...branch, relatedIds });
  };

  const addStoredBranch = (edgeType, label, sub, query) => {
    const entries = storedRelations.get(edgeType) || [];
    addBranch({
      id: `branch:edge:${edgeType}`,
      label,
      sub,
      body: `${entries.length}개 포스트가 저장된 ${sub} edge로 연결됩니다.`,
      relatedIds: entries.sort((a, b) => b.weight - a.weight).map((entry) => entry.postId),
      query,
    });
  };

  addStoredBranch("similar_caption", "유사 문맥", "similar caption", selectedPost.query || selectedPost.topicName);

  const sameAuthor = posts.filter((post) => post.id !== selectedPost.id && post.handle === selectedPost.handle);
  addBranch({
    id: `branch:author:${selectedPost.handle}`,
    label: `@${selectedPost.handle}`,
    sub: "same author",
    body: `${sameAuthor.length}개 포스트가 같은 작성자와 연결됩니다.`,
    relatedIds: sameAuthor.map((post) => post.id),
    query: `@${selectedPost.handle}`,
  });

  (selectedPost.hashtags || []).slice(0, 5).forEach((tag) => {
    const clean = cleanTag(tag);
    const related = posts.filter((post) => post.id !== selectedPost.id && post.hashtags.map(cleanTag).includes(clean));
    addBranch({
      id: `branch:tag:${clean}`,
      label: `#${clean}`,
      sub: "shared hashtag",
      body: `${related.length}개 포스트가 이 해시태그를 공유합니다.`,
      relatedIds: related.map((post) => post.id),
      query: `#${clean}`,
    });
  });

  const storedSameCityIds = (storedRelations.get("same_city") || []).map((entry) => entry.postId);
  const sameCity = posts.filter((post) => post.id !== selectedPost.id && post.citySlug === selectedPost.citySlug);
  addBranch({
    id: `branch:city:${selectedPost.citySlug}`,
    label: selectedPost.cityName || selectedPost.citySlug,
    sub: "same city",
    body: `${Math.max(sameCity.length, storedSameCityIds.length)}개 포스트가 같은 도시 범위에 있습니다.`,
    relatedIds: Array.from(new Set([...storedSameCityIds, ...sameCity.map((post) => post.id)])),
    query: selectedPost.cityName || selectedPost.citySlug,
  });

  const storedSameTopicIds = (storedRelations.get("same_topic") || []).map((entry) => entry.postId);
  const sameTopic = posts.filter((post) => post.id !== selectedPost.id && post.topicSlug === selectedPost.topicSlug);
  addBranch({
    id: `branch:topic:${selectedPost.topicSlug}`,
    label: selectedPost.topicName || selectedPost.topicSlug,
    sub: "same signal class",
    body: `${Math.max(sameTopic.length, storedSameTopicIds.length)}개 포스트가 같은 토픽으로 묶입니다.`,
    relatedIds: Array.from(new Set([...storedSameTopicIds, ...sameTopic.map((post) => post.id)])),
    query: selectedPost.topicName || selectedPost.topicSlug,
  });

  topCaptionKeywords(selectedPost, posts).forEach(({ token, count }) => {
    const related = posts.filter((post) => post.id !== selectedPost.id && normalizeText(postText(post)).includes(token));
    addBranch({
      id: `branch:keyword:${token}`,
      label: token,
      sub: "context keyword",
      body: `${count}개 포스트가 같은 문맥 키워드를 포함합니다.`,
      relatedIds: related.map((post) => post.id),
      query: token,
    });
  });

  if (branches.length === 0 && relatedByScore.length > 0) {
    addBranch({
      id: `branch:nearest:${selectedPost.id}`,
      label: "가장 가까운 신호",
      sub: "nearest posts",
      body: "해시태그, 도시, 토픽, 문맥 점수를 합산한 연결입니다.",
      relatedIds: relatedByScore.slice(0, 3).map((entry) => entry.post.id),
      query: selectedPost.query || selectedPost.topicName,
    });
  }

  return branches.slice(0, 5);
}

function buildGraph() {
  const posts = postsForState();
  const city = activeCity();
  const topic = activeTopic();
  const scopeLabel = topic ? `${city.ko} ${topic.ko}` : `${city.ko} 소셜 신호`;
  const scopeBody = topic
    ? `${city.ko}에서 ${topic.ko} 관련 SNS 신호를 클러스터별로 정리합니다.`
    : `${city.ko}에서 수집된 SNS 포스트를 해시태그, 작성자, 문맥 기준으로 정리합니다.`;
  const tags = topTags(posts);
  const keywords = interestingKeywords(posts, city, topic);
  const groupedPosts = new Map();
  posts.slice(0, 12).forEach((post) => {
    const cluster = clusterForPost(post);
    if (!groupedPosts.has(cluster.id)) groupedPosts.set(cluster.id, { ...cluster, posts: [] });
    groupedPosts.get(cluster.id).posts.push(post);
  });
  const clusters = Array.from(groupedPosts.values());
  const clusterCount = Math.max(clusters.length, 1);
  const nodes = [
    {
      id: "root",
      kind: "root",
      label: scopeLabel,
      sub: `${posts.length} collected signals`,
      x: 50,
      y: 48,
      z: 60,
      w: 230,
      h: 132,
      body: posts.length > 0 ? scopeBody : "이 도시에는 아직 승인된 수집 데이터가 없습니다.",
    },
    { id: `city:${city.slug}`, kind: "city", label: city.ko, sub: city.en, x: 18, y: 15, z: -20, w: 150, h: 74 },
  ];
  const edges = [
    { id: "root-city", from: "root", to: `city:${city.slug}`, tone: "primary" },
  ];

  clusters.forEach((cluster, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    const clusterX = 50 + side * 18;
    const clusterY = 29 + lane * 23;
    const clusterId = `cluster:${cluster.id}`;
    nodes.push({
      id: clusterId,
      kind: "cluster",
      label: cluster.label,
      sub: `${cluster.posts.length} posts`,
      body: cluster.posts.map((post) => post.hashtags.slice(0, 2).map(cleanTag).join(" · ")).filter(Boolean).slice(0, 2).join(" / "),
      x: clusterX,
      y: clusterY,
      z: 20 - lane * 18,
      w: 180,
      h: 96,
      cluster,
    });
    edges.push({ id: `root-${clusterId}`, from: "root", to: clusterId, tone: "primary" });

    cluster.posts.slice(0, 4).forEach((post, postIndex) => {
      const postId = `post:${post.id}`;
      const offset = postIndex - (cluster.posts.length - 1) / 2;
      nodes.push({
        id: postId,
        kind: "post",
        label: `@${post.handle}`,
        sub: post.query || post.topicName || "SNS post",
        body: truncate(post.caption, 132),
        x: clusterX + side * 14,
        y: clusterY + offset * 13 + 3,
        z: -40 - postIndex * 10,
        w: 240,
        h: 124,
        post,
      });
      edges.push({ id: `${clusterId}-${postId}`, from: clusterId, to: postId, tone: "muted" });
    });
  });

  keywords.forEach((keyword, index) => {
    const id = `keyword:${keyword.query}`;
    nodes.push({
      id,
      kind: "keyword",
      label: keyword.kind === "hashtag" ? `#${keyword.label}` : keyword.label,
      sub: `${keyword.postIds.length} related posts`,
      body: "이 키워드로 다시 검색해 다음 가지를 확장할 수 있습니다.",
      x: 18 + index * 12,
      y: 84 + (index % 2) * 7,
      z: -90,
      w: 132,
      h: 64,
      keyword,
    });
    edges.push({ id: `root-${id}`, from: "root", to: id, tone: "keyword" });
    keyword.postIds.forEach((postId) => {
      if (posts.some((post) => String(post.id) === String(postId))) {
        edges.push({ id: `${id}-${postId}`, from: id, to: `post:${postId}`, tone: "keyword" });
      }
    });
  });

  const selectedPostId = state.expandedPost || (state.selected.startsWith("post:") ? state.selected.replace(/^post:/, "") : null);
  const selectedPost = posts.find((post) => String(post.id) === selectedPostId);
  const selectedPostNode = selectedPost ? nodes.find((node) => node.id === `post:${selectedPost.id}`) : null;
  if (!selectedPost) state.expandedPost = null;
  if (selectedPost && selectedPostNode) {
    const branches = buildExpansionBranches(selectedPost, posts, baseEdges);
    const branchRelatedIds = new Set();
    branches.forEach((branch, index) => {
      const branchId = branch.id;
      branch.relatedIds.forEach((id) => branchRelatedIds.add(String(id)));
      nodes.push({
        id: branchId,
        kind: "branch",
        label: branch.label,
        sub: branch.sub,
        body: branch.body,
        x: 50,
        y: 24 + index * 12,
        z: 18 - index * 6,
        w: 178,
        h: 82,
        branch,
      });
      edges.push({ id: `${selectedPostNode.id}-${branchId}`, from: selectedPostNode.id, to: branchId, tone: "branch" });
      branch.relatedIds.slice(0, 4).forEach((postId) => {
        const targetId = `post:${postId}`;
        if (nodes.some((node) => node.id === targetId)) {
          edges.push({ id: `${branchId}-${targetId}`, from: branchId, to: targetId, tone: "branch" });
        }
      });
    });

    const rootNode = nodes.find((node) => node.id === "root");
    const cityNode = nodes.find((node) => node.id.startsWith("city:"));
    if (rootNode) {
      rootNode.x = 50;
      rootNode.y = 83;
      rootNode.w = 220;
      rootNode.h = 112;
    }
    if (cityNode) {
      cityNode.x = 20;
      cityNode.y = 16;
    }
    selectedPostNode.x = 24;
    selectedPostNode.y = 44;
    selectedPostNode.w = 260;
    selectedPostNode.h = 142;
    selectedPostNode.z = 80;

    const relatedPostNodes = nodes.filter((node) => node.kind === "post" && branchRelatedIds.has(String(node.post?.id)) && node.id !== selectedPostNode.id);
    relatedPostNodes.slice(0, 4).forEach((node, index) => {
      node.x = 78;
      node.y = 28 + index * 16;
      node.w = 252;
      node.h = 122;
      node.z = 46 - index * 6;
    });

    nodes.forEach((node) => {
      if (node.kind === "cluster" || node.kind === "keyword") node.hidden = true;
      if (node.kind === "post" && node.id !== selectedPostNode.id && !branchRelatedIds.has(String(node.post?.id))) node.hidden = true;
    });
  }

  return { nodes, edges, posts, tags, keywords, clusters };
}

function relatedIds(selectedId, edges) {
  const ids = new Set([selectedId]);
  edges.forEach((edge) => {
    if (edge.from === selectedId) ids.add(edge.to);
    if (edge.to === selectedId) ids.add(edge.from);
  });
  return ids;
}

function relatedPosts(selected, posts) {
  if (!selected || selected.id === "root") return posts.slice(0, 5);
  if (selected.kind === "tag") {
    const tag = selected.label.replace(/^#/, "");
    return posts.filter((post) => post.hashtags.map(cleanTag).includes(tag)).slice(0, 5);
  }
  if (selected.kind === "keyword") {
    return posts.filter((post) => selected.keyword.postIds.includes(String(post.id))).slice(0, 5);
  }
  if (selected.kind === "post") {
    const selectedPost = selected.post;
    return posts
      .filter((post) => post.id !== selectedPost.id)
      .map((post) => ({ post, score: sharedPostScore(selectedPost, post) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.post.score - a.post.score)
      .map((entry) => entry.post)
      .slice(0, 5);
  }
  if (selected.kind === "branch") {
    return posts.filter((post) => selected.branch.relatedIds.includes(post.id)).slice(0, 5);
  }
  return posts.slice(0, 5);
}

function renderFilters() {
  const cityButtons = document.getElementById("cityButtons");
  cityButtons.innerHTML = "";

  cityFilters.forEach((city) => {
    const button = document.createElement("button");
    button.className = `filter-button ${city.slug === state.city ? "active" : ""}`;
    button.textContent = city.slug === allCity.slug ? "전체" : city.ko;
    button.addEventListener("click", () => {
      state.city = city.slug;
      state.selected = "root";
      state.expandedPost = null;
      state.topic = null;
      document.getElementById("searchInput").value = city.slug === allCity.slug ? "캐나다" : city.ko;
      render();
    });
    cityButtons.appendChild(button);
  });
}

function assignSpherePoints(graph) {
  const shellNodes = graph.nodes.filter((node) => node.id !== "root");
  shellNodes.forEach((node, index) => {
    const point = gridIntersectionPoint(index, Math.max(shellNodes.length, 1));
    node.point = sphere.nodePoints.get(node.id) || point;
    sphere.nodePoints.set(node.id, node.point);
  });
  const root = graph.nodes.find((node) => node.id === "root");
  if (root) root.point = { x: 0, y: 0, z: 0 };
}

function projectedPoint(node, rect) {
  const projected = projectSpherePoint(node.point || { x: 0, y: 0, z: 0 }, rect);
  return {
    ...projected,
    scale: node.id === "root" ? 1 : Math.max(0.58, projected.perspective),
    alpha: node.id === "root" ? 1 : 0.42 + Math.max(0, projected.z) * 0.42,
  };
}

function projectSpherePoint(base, rect) {
  const radius = Math.min(rect.width, rect.height) * 0.34 * sphere.zoom;
  const sinX = Math.sin(sphere.rotX);
  const cosX = Math.cos(sphere.rotX);
  const sinY = Math.sin(sphere.rotY);
  const cosY = Math.cos(sphere.rotY);
  const y1 = base.y * cosX - base.z * sinX;
  const z1 = base.y * sinX + base.z * cosX;
  const x2 = base.x * cosY + z1 * sinY;
  const z2 = -base.x * sinY + z1 * cosY;
  const perspective = 1.55 / (1.95 - z2);
  return {
    x: rect.width / 2 + x2 * radius * perspective,
    y: rect.height / 2 + y1 * radius * perspective,
    z: z2,
    perspective,
  };
}

function buildSphereGridLines() {
  const lines = [];
  const segmentCount = 96;

  sphereLatitudes.forEach((lat) => {
    const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
      const lng = (index / segmentCount) * 360;
      return pointFromLatLng(lat, lng);
    });
    lines.push({ kind: "latitude", points });
  });

  sphereLongitudes.forEach((lng) => {
    const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
      const lat = -90 + (index / segmentCount) * 180;
      return pointFromLatLng(lat, lng);
    });
    lines.push({ kind: "longitude", points });
  });

  return lines;
}

function interpolateSurfacePoints(from, to, steps = 18) {
  if (!from || !to) return [];
  const fromRoot = from.id === "root";
  const toRoot = to.id === "root";
  if (fromRoot || toRoot) {
    const surface = fromRoot ? to.point : from.point;
    return fromRoot ? [{ x: 0, y: 0, z: 0 }, surface] : [surface, { x: 0, y: 0, z: 0 }];
  }

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    return normalizePoint({
      x: from.point.x * (1 - t) + to.point.x * t,
      y: from.point.y * (1 - t) + to.point.y * t,
      z: from.point.z * (1 - t) + to.point.z * t,
    });
  });
}

function updateSphereFrame() {
  if (!currentGraph) return;
  if (!sphere.draggingCanvas && !sphere.draggingNode) {
    sphere.rotX += sphere.velocityX;
    sphere.rotY += sphere.velocityY;
  }

  const canvas = document.getElementById("graphCanvas");
  const edgeLayer = document.getElementById("edgeLayer");
  const rect = canvas.getBoundingClientRect();
  const projected = new Map(currentGraph.nodes.map((node) => [node.id, projectedPoint(node, rect)]));
  edgeLayer.setAttribute("viewBox", `0 0 ${Math.max(rect.width, 1)} ${Math.max(rect.height, 1)}`);

  currentGraph.gridLines?.forEach((gridLine) => {
    const path = gridLine.points.map((point) => {
      const projectedPoint = projectSpherePoint(point, rect);
      return `${projectedPoint.x.toFixed(1)},${projectedPoint.y.toFixed(1)}`;
    });
    gridLine.element.setAttribute("points", path.join(" "));
  });

  currentGraph.edges.forEach((edge) => {
    const line = edge.element;
    if (!line) return;
    const path = edge.surfacePoints.map((point) => {
      const projectedSurfacePoint = projectSpherePoint(point, rect);
      return `${projectedSurfacePoint.x.toFixed(1)},${projectedSurfacePoint.y.toFixed(1)}`;
    });
    const from = projected.get(edge.from);
    const to = projected.get(edge.to);
    line.setAttribute("points", path.join(" "));
    line.style.opacity = String(Number(line.dataset.baseOpacity || 0.3) * Math.min(from?.alpha ?? 1, to?.alpha ?? 1));
  });

  currentGraph.nodes.forEach((node) => {
    if (!node.element) return;
    const pos = projected.get(node.id);
    const selected = state.selected === node.id;
    const size = node.size * pos.scale;
    node.element.style.width = `${size}px`;
    node.element.style.height = `${size}px`;
    node.element.style.transform = `translate3d(${pos.x - size / 2}px, ${pos.y - size / 2}px, 0) scale(${selected ? 1.06 : 1})`;
    node.element.style.opacity = String(pos.alpha);
    node.element.style.zIndex = String(Math.round(100 + pos.z * 50 + (selected ? 100 : 0)));
  });
}

function startAnimationLoop() {
  if (animationStarted) return;
  animationStarted = true;
  const tick = () => {
    updateSphereFrame();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function installSphereControls() {
  const canvas = document.getElementById("graphCanvas");
  if (canvas.dataset.sphereControls === "ready") return;
  canvas.dataset.sphereControls = "ready";

  canvas.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".node")) return;
    sphere.draggingCanvas = true;
    sphere.lastX = event.clientX;
    sphere.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (sphere.draggingCanvas) {
      const dx = event.clientX - sphere.lastX;
      const dy = event.clientY - sphere.lastY;
      sphere.rotY += dx * 0.006;
      sphere.rotX -= dy * 0.006;
      sphere.velocityY = dx * 0.00008;
      sphere.velocityX = -dy * 0.00008;
      sphere.lastX = event.clientX;
      sphere.lastY = event.clientY;
      return;
    }
    if (sphere.draggingNode && currentGraph) {
      const dx = event.clientX - sphere.lastX;
      const dy = event.clientY - sphere.lastY;
      if (Math.hypot(dx, dy) > 4) sphere.nodeMoved = true;
      const rect = canvas.getBoundingClientRect();
      const node = currentGraph.nodes.find((entry) => entry.id === sphere.draggingNode);
      if (!node || node.id === "root") return;
      const radius = Math.min(rect.width, rect.height) * 0.34 * sphere.zoom;
      const nx = Math.max(-0.92, Math.min(0.92, (event.clientX - rect.left - rect.width / 2) / radius));
      const ny = Math.max(-0.92, Math.min(0.92, (event.clientY - rect.top - rect.height / 2) / radius));
      const z = Math.sqrt(Math.max(0.08, 1 - nx * nx - ny * ny));
      node.point = normalizePoint({ x: nx, y: ny, z });
      sphere.nodePoints.set(node.id, node.point);
    }
  });

  window.addEventListener("pointerup", () => {
    sphere.draggingCanvas = false;
    if (sphere.draggingNode && sphere.nodeMoved) {
      sphere.suppressClick = true;
      setTimeout(() => {
        sphere.suppressClick = false;
      }, 0);
    }
    sphere.draggingNode = null;
    sphere.nodeMoved = false;
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const next = sphere.zoom + (event.deltaY > 0 ? -0.08 : 0.08);
      sphere.zoom = Math.max(0.62, Math.min(1.72, next));
    },
    { passive: false },
  );
}

function renderGraph(graph) {
  const edgeLayer = document.getElementById("edgeLayer");
  const nodeLayer = document.getElementById("nodeLayer");
  edgeLayer.innerHTML = "";
  nodeLayer.innerHTML = "";
  currentGraph = graph;
  const related = relatedIds(state.selected, graph.edges);
  edgeLayer.setAttribute("viewBox", "0 0 100 100");

  graph.edges.forEach((edge) => {
    const from = graph.nodes.find((node) => node.id === edge.from);
    const to = graph.nodes.find((node) => node.id === edge.to);
    if (!from || !to || from.hidden || to.hidden) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const midX = (from.x + to.x) / 2;
    const curve = edge.tone === "tag" || edge.tone === "keyword" ? 9 : 5;
    const midY = (from.y + to.y) / 2 - curve;
    path.setAttribute("d", `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("stroke-width", related.has(from.id) && related.has(to.id) ? "0.34" : "0.18");
    path.setAttribute("opacity", related.has(from.id) && related.has(to.id) ? "0.84" : "0.24");
    path.setAttribute("stroke", edge.tone === "primary" ? "#f6c85f" : edge.tone === "tag" || edge.tone === "keyword" ? "#5bb7d5" : edge.tone === "branch" ? "#8fe7c9" : "#62748d");
    path.classList.add("edge", edge.tone);
    edgeLayer.appendChild(path);
  });

  graph.nodes.filter((node) => !node.hidden).forEach((node) => {
    const button = document.createElement("button");
    button.className = `node card-node ${node.kind} ${state.selected === node.id ? "selected" : ""} ${related.has(node.id) || state.selected === "root" ? "" : "dimmed"}`;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.style.width = `${node.w}px`;
    button.style.minHeight = `${node.h}px`;
    button.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${node.z || 0}px)`;

    if (node.kind === "post") {
      const tags = node.post.hashtags.slice(0, 3).map((tag) => `<span>#${escapeHtml(cleanTag(tag))}</span>`).join("");
      button.innerHTML = `
        <span class="card-meta"><span>${escapeHtml(node.post.platform || "instagram")}</span><span>${escapeHtml(node.post.score)}</span></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        <span class="card-body">${escapeHtml(node.body)}</span>
        <span class="card-tags">${tags}</span>
      `;
    } else {
      button.innerHTML = `
        <span class="card-title">${escapeHtml(node.label)}</span>
        ${node.sub ? `<span class="card-sub">${escapeHtml(node.sub)}</span>` : ""}
        ${node.body ? `<span class="card-body">${escapeHtml(node.body)}</span>` : ""}
      `;
    }

    button.addEventListener("click", () => {
      if (node.kind === "post") {
        state.expandedPost = String(node.post.id);
      } else if (node.kind !== "branch") {
        state.expandedPost = null;
      }
      state.selected = node.id;
      render();
    });
    node.element = button;
    nodeLayer.appendChild(button);
  });
}

function renderDetail(graph) {
  const selected = graph.nodes.find((node) => node.id === state.selected) || graph.nodes[0];
  const selectedTitle = document.getElementById("selectedTitle");
  const selectedKind = document.getElementById("selectedKind");
  const selectedBody = document.getElementById("selectedBody");
  const relatedList = document.getElementById("relatedPosts");
  const relatedCount = document.getElementById("relatedCount");
  selectedTitle.textContent = selected.label;
  selectedKind.textContent = selected.kind;

  if (selected.post) {
    selectedBody.innerHTML = `
      <div class="post-detail">
        ${escapeHtml(selected.post.caption)}
        <div class="tag-list">
          ${selected.post.hashtags
            .slice(0, 10)
            .map((tag) => `<button class="tag-button" data-tag="${escapeHtml(cleanTag(tag))}">#${escapeHtml(cleanTag(tag))}</button>`)
            .join("")}
        </div>
      </div>
    `;
    selectedBody.querySelectorAll("[data-tag]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selected = `tag:${button.dataset.tag}`;
        render();
      });
    });
  } else if (selected.branch) {
    selectedBody.innerHTML = `
      <div class="post-detail">
        ${escapeHtml(selected.body || "선택한 연결 기준으로 관련 포스트를 보여줍니다.")}
        <div class="tag-list">
          <button class="tag-button" data-query="${escapeHtml(selected.branch.query || selected.label)}">이 기준으로 검색</button>
        </div>
      </div>
    `;
    selectedBody.querySelector("[data-query]")?.addEventListener("click", (event) => {
      const query = event.currentTarget.dataset.query;
      document.getElementById("searchInput").value = query;
      state.selected = "root";
      render();
    });
  } else if (selected.keyword) {
    const city = activeCity();
    const nextQuery = city.slug === allCity.slug ? selected.keyword.query : `${city.ko} ${selected.keyword.query}`;
    selectedBody.innerHTML = `
      <div class="post-detail">
        ${escapeHtml(selected.keyword.postIds.length)}개 포스트에서 반복적으로 감지된 관심 키워드입니다.
        <div class="tag-list">
          <button class="tag-button" data-query="${escapeHtml(nextQuery)}">이 키워드로 찾아가기</button>
        </div>
      </div>
    `;
    selectedBody.querySelector("[data-query]")?.addEventListener("click", (event) => {
      document.getElementById("searchInput").value = event.currentTarget.dataset.query;
      state.selected = "root";
      state.expandedPost = null;
      render();
    });
  } else {
    selectedBody.textContent = "연결된 포스트, 해시태그, 도시 노드를 선택해 그래프의 다음 가지를 확인합니다.";
  }

  const related = relatedPosts(selected, graph.posts);
  relatedCount.textContent = String(related.length);
  relatedList.innerHTML = "";
  related.forEach((post) => {
    const button = document.createElement("button");
    button.className = "related-item";
    button.innerHTML = `
      <div class="related-title"><span>@${escapeHtml(post.handle)}</span><span class="related-score">${escapeHtml(post.score)}</span></div>
      <div class="related-caption">${escapeHtml(post.caption)}</div>
    `;
    button.addEventListener("click", () => {
      state.expandedPost = String(post.id);
      state.selected = `post:${post.id}`;
      render();
    });
    relatedList.appendChild(button);
  });
}

function renderSeeds() {
  const city = activeCity();
  const topic = activeTopic();
  const seeds = topic
    ? city.slug === allCity.slug
      ? [`#canada${topic.slug}`, `#캐나다${topic.ko.replace("/", "")}`, `Canada ${topic.ko}`, `${topic.ko} Threads`, `Instagram ${topic.ko}`]
      : [`#${city.slug}${topic.slug}`, `#${city.ko}${topic.ko.replace("/", "")}`, `${city.en} ${topic.ko}`, `${city.ko} 인스타`, `${city.en} social`]
    : city.slug === allCity.slug
      ? ["#canada", "#캐나다생활", "Canada social", "Canada Threads", "Instagram Canada"]
      : [`#${city.slug}`, `#${city.ko}생활`, `${city.en} social`, `${city.ko} 인스타`, `${city.en} Threads`];
  document.getElementById("seedList").innerHTML = seeds.map((seed) => `<span class="seed">${seed}</span>`).join("");
}

function render() {
  const city = activeCity();
  state.query = document.getElementById("searchInput").value.trim() || (city.slug === allCity.slug ? "캐나다" : city.ko);
  const graph = buildGraph();
  const visibleNodeIds = new Set(graph.nodes.filter((node) => !node.hidden).map((node) => node.id));
  const visibleEdgeCount = graph.edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)).length;
  document.getElementById("queryBadge").textContent = state.query;
  document.getElementById("nodeCount").textContent = `${visibleNodeIds.size} nodes`;
  document.getElementById("edgeCount").textContent = `${visibleEdgeCount} links`;
  document.querySelector(".badge.green").textContent = state.source;
  renderFilters();
  renderGraph(graph);
  renderDetail(graph);
  renderSeeds();
}

function runSearch() {
  state.selected = "root";
  state.expandedPost = null;
  render();
}

document.getElementById("searchInput").addEventListener("input", runSearch);
document.getElementById("searchInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});
document.getElementById("searchButton").addEventListener("click", runSearch);

(async function init() {
  try {
    const posts = await loadSupabasePosts();
    if (posts) {
      basePosts = posts;
      try {
        baseEdges = await loadSupabaseEdges();
      } catch (edgeError) {
        console.warn("[DataNode] graph edge fallback:", edgeError);
        baseEdges = [];
      }
      state.source = "Supabase connected";
    }
  } catch (error) {
    console.warn("[DataNode] Supabase fallback:", error);
  }
  render();
})();
