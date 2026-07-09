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
  { slug: "rent-real-estate", ko: "렌트/부동산", en: "Rent / Real Estate", terms: ["렌트", "부동산", "월세", "집구하기", "콘도", "room", "rent", "lease", "housing"] },
  { slug: "immigration", ko: "이민", en: "Immigration", terms: ["이민", "영주권", "비자", "워크퍼밋", "pr", "immigration", "visa", "permit"] },
  { slug: "jobs", ko: "일자리/커리어", en: "Jobs / Career", terms: ["일자리", "취업", "커리어", "구인", "알바", "job", "career", "resume"] },
  { slug: "finance", ko: "금융/생활비", en: "Finance / Cost of Living", terms: ["금융", "생활비", "세금", "은행", "크레딧", "finance", "cost", "tax", "bank"] },
  { slug: "food", ko: "맛집/카페", en: "Food / Cafes", terms: ["맛집", "카페", "브런치", "식당", "라멘", "디저트", "food", "cafe", "restaurant", "brunch"] },
  { slug: "events", ko: "이벤트", en: "Events", terms: ["이벤트", "행사", "축제", "모임", "event", "festival", "popup"] },
  { slug: "education", ko: "교육/유학", en: "Education", terms: ["교육", "유학", "학교", "컬리지", "대학교", "study", "college", "university"] },
  { slug: "transportation", ko: "교통/차", en: "Transportation", terms: ["교통", "차", "자동차", "운전", "보험", "transit", "car", "driver"] },
  { slug: "healthcare", ko: "의료", en: "Healthcare", terms: ["의료", "병원", "약국", "클리닉", "health", "clinic", "hospital", "pharmacy"] },
  { slug: "travel-outdoors", ko: "여행/아웃도어", en: "Travel / Outdoors", terms: ["여행", "하이킹", "캠핑", "근교", "travel", "hiking", "camping", "trip"] },
];

const fallbackPosts = [
  {
    id: "ramen",
    sourceUrl: "https://www.instagram.com/explore/tags/torontoramen/",
    handle: "toronto.foodmap",
    caption: "Downtown ramen spot with evening demand and wait-time signals.",
    query: "#torontofood",
    hashtags: ["torontofood", "torontoramen", "downtown", "ramen"],
    score: 86,
    status: "approved",
    publishedAt: "2026-06-18T12:00:00Z",
  },
  {
    id: "brunch",
    sourceUrl: "https://www.instagram.com/explore/tags/torontobrunch/",
    handle: "queenwest.table",
    caption: "Queen West brunch cafe with weekend reservation and dessert mentions.",
    query: "Toronto brunch",
    hashtags: ["torontobrunch", "queenwest", "cafe", "dessert"],
    score: 78,
    status: "approved",
    publishedAt: "2026-06-20T12:00:00Z",
  },
  {
    id: "koreanbbq",
    sourceUrl: "https://www.instagram.com/explore/tags/koreanbbq/",
    handle: "kfood.to",
    caption: "North York Korean BBQ post connected to group dining, parking, and side dish signals.",
    query: "Toronto Korean BBQ",
    hashtags: ["koreanbbq", "northyork", "torontofood"],
    score: 82,
    status: "approved",
    publishedAt: "2026-06-21T12:00:00Z",
  },
  {
    id: "dessert",
    sourceUrl: "https://www.instagram.com/explore/tags/torontodessert/",
    handle: "sweetspots.ca",
    caption: "Dessert and bakery signal that can expand into cafe-tour nodes.",
    query: "#canadadessert",
    hashtags: ["torontodessert", "bakery", "cafe", "canadadessert"],
    score: 74,
    status: "approved",
    publishedAt: "2026-06-22T12:00:00Z",
  },
  {
    id: "sushi",
    sourceUrl: "https://www.instagram.com/explore/tags/vancouverfood/",
    handle: "westcoast.bites",
    caption: "Sushi, izakaya, and late-night dining keywords appear together.",
    query: "#vancouverfood",
    hashtags: ["vancouverfood", "sushi", "izakaya", "datenight"],
    score: 80,
    status: "approved",
    publishedAt: "2026-06-19T12:00:00Z",
  },
];

const state = {
  city: "hamilton",
  topic: null,
  selected: "root",
  expandedPost: null,
  query: "Hamilton",
  source: "Mock data",
  view: window.location.hash === "#feed" ? "feed" : "graph",
  feedSort: "rank",
  dateRange: "90",
  platform: "all",
  runStartedAt: new Date().toISOString(),
  runRecord: null,
  runStatus: "preview",
  runError: null,
  recentRuns: [],
  runsStatus: "loading",
  runsError: null,
  activeRunId: null,
  activeRunPosts: null,
  activeRunEntities: null,
  expansionQueue: [],
  expansionStatus: "idle",
  expansionError: null,
  expansionMessage: null,
  lineage: null,
  lineageStatus: "idle",
  lineageError: null,
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
  return String(value ?? "")
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
  if (state.activeRunPosts) {
    return state.activeRunPosts
      .slice(0, 16)
      .sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || Number(b.score || 0) - Number(a.score || 0));
  }
  const runScopedPosts = basePosts.filter(postMatchesRunScope);
  const tokens = queryTokens(state.query);
  const genericAllQuery =
    !explicitCity &&
    !explicitTopic &&
    (tokens.length === 0 || tokens.every((token) => ["캐나다", "canada", "전체", "all", "social", "소셜"].includes(token)));
  if (genericAllQuery) return runScopedPosts.slice(0, 16).sort((a, b) => b.score - a.score);

  const scoredPosts = runScopedPosts
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

  return runScopedPosts.map((post) => ({
    ...post,
    id: `${city.slug}-${state.topic || "all"}-${post.id}`,
    cityName: city.slug === allCity.slug ? post.cityName || "Toronto" : city.en,
    topicName: activeTopic()?.en || post.topicName || "Social Signals",
    handle: city.slug === allCity.slug || city.slug === "toronto" ? post.handle : `${city.slug}.${post.handle.split(".")[0]}`,
    query: city.slug === allCity.slug ? post.query : post.query.replace("Toronto", city.en),
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
    "status",
    "source_published_at",
    "discovered_at",
    "metadata",
    "cities(slug,name_ko,name_en)",
    "topics(slug,label_ko,label_en)",
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
      cityName: city.name_en || city.slug,
      topicName: topic.label_en || topic.slug,
      handle: row.author_handle || "instagram",
      caption: row.caption || row.source_url,
      query: row.metadata?.query || topic.label_en || "Instagram",
      hashtags,
      score: Math.round(Number(row.score || 0) * 100),
      status: row.status || "approved",
      publishedAt: row.source_published_at || row.discovered_at || null,
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
  { id: "housing-cost", label: "Cost / Pricing", terms: ["렌트", "월세", "가격", "비용", "rent", "cost", "deposit", "fee"] },
  { id: "area", label: "Area / Neighborhood", terms: ["다운타운", "노스욕", "North York", "Scarborough", "지역", "동네", "주차", "parking"] },
  { id: "recommendation", label: "Recommendations / Reviews", terms: ["추천", "후기", "맛집", "카페", "브런치", "restaurant", "cafe", "popular"] },
  { id: "risk", label: "Risks / Issues", terms: ["사기", "주의", "계약", "문제", "어렵", "scam", "lease", "issue"] },
  { id: "community", label: "Questions / Community", terms: ["질문", "고민", "찾", "구해", "모임", "정보", "question", "looking"] },
];

function clusterForPost(post) {
  const text = `${post.caption} ${post.query} ${post.hashtags.join(" ")}`.toLowerCase();
  return (
    clusterRules.find((cluster) => cluster.terms.some((term) => text.includes(term.toLowerCase()))) || {
      id: "signals",
      label: "Related Signals",
      terms: [],
    }
  );
}

function truncate(text, limit = 120) {
  const value = (text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeApiPost(post) {
  const score = Number(post.score || post.relevanceScore || 0);
  return {
    ...post,
    sourceUrl: post.sourceUrl || post.source_url,
    thumbnailUrl: post.thumbnailUrl || post.thumbnail_url,
    cityName: post.cityName || post.citySlug || "Unknown city",
    topicName: post.topicName || post.topicSlug || "Signal",
    handle: post.handle || post.authorHandle || post.author_handle || "post",
    hashtags: post.hashtags || [],
    score: score <= 1 ? Math.round(score * 100) : Math.round(score),
    status: post.status || "approved",
    publishedAt: post.publishedAt || post.source_published_at || post.discovered_at || null,
  };
}

function normalizeApiEntity(entity) {
  return {
    id: entity.id || `${entity.type}:${entity.normalizedKey || entity.label}`,
    type: entity.type || entity.entity_type || "keyword",
    label: entity.label || entity.normalizedKey || "Entity",
    normalizedKey: entity.normalizedKey || entity.normalized_key || normalizeText(entity.label || "entity"),
    rank: Number(entity.rank || 9999),
    weight: Number(entity.weight || 0),
    postCount: Number(entity.postCount || entity.post_count || 0),
    postIds: (entity.postIds || entity.evidence_post_ids || []).map(String),
    evidence: entity.evidence || {},
  };
}

function normalizeQueueItem(item) {
  return {
    id: item.id,
    sourceRunId: item.sourceRunId,
    sourceEntityId: item.sourceEntityId,
    query: item.query || "Untitled expansion",
    platform: item.platform || "all",
    dateRange: item.dateRange || "90",
    depth: Number(item.depth || 1),
    priority: Number(item.priority || 0),
    status: item.status || "queued",
    reason: item.reason || "manual_entity_expansion",
    resultRunId: item.resultRunId || null,
    createdAt: item.createdAt,
    entity: item.entity || null,
  };
}

function normalizeRunSummary(run) {
  if (!run) return null;
  return {
    id: run.id,
    runKey: run.runKey || run.run_key,
    query: run.query || "Untitled run",
    platform: run.platform || "all",
    dateRange: run.dateRange || run.date_range || "90",
    status: run.status || "completed",
    resultCount: Number(run.resultCount ?? run.result_count ?? 0),
    graphNodeCount: Number(run.graphNodeCount ?? run.graph_node_count ?? 0),
    graphEdgeCount: Number(run.graphEdgeCount ?? run.graph_edge_count ?? 0),
    createdAt: run.createdAt || run.created_at || null,
    metadata: run.metadata || {},
  };
}

function normalizeLineage(payload) {
  return {
    current: normalizeRunSummary(payload.current),
    ancestors: (payload.ancestors || []).map(normalizeRunSummary).filter(Boolean),
    inbound: payload.inbound ? normalizeQueueItem(payload.inbound) : null,
    children: (payload.children || [])
      .map((child) => ({
        queue: child.queue ? normalizeQueueItem(child.queue) : null,
        run: normalizeRunSummary(child.run),
      }))
      .filter((child) => child.run),
  };
}

function sortedFeedPosts(posts) {
  const copy = [...posts];
  if (state.feedSort === "rank") {
    return copy.sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || Number(b.score || 0) - Number(a.score || 0));
  }
  if (state.feedSort === "score") {
    return copy.sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }
  return copy.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0) || Number(b.score || 0) - Number(a.score || 0));
}

function dateRangeLabel() {
  if (state.dateRange === "all") return "All time";
  return `Last ${state.dateRange} days`;
}

function runDateRangeLabel(dateRange) {
  if (dateRange === "all") return "All time";
  return `Last ${dateRange || 90} days`;
}

function platformLabel() {
  if (state.platform === "all") return "All platforms";
  return state.platform.charAt(0).toUpperCase() + state.platform.slice(1);
}

function platformLabelForRun(platform) {
  if (!platform || platform === "all") return "All platforms";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function runRecordLabel() {
  if (state.runStatus === "recording") return "Recording";
  if (state.runStatus === "failed") return "Preview only";
  if (state.runRecord?.id) return `Saved ${String(state.runRecord.id).slice(0, 8)}`;
  return "Preview only";
}

function clearActiveRun() {
  state.activeRunId = null;
  state.activeRunPosts = null;
  state.activeRunEntities = null;
  state.expansionQueue = [];
  state.expansionStatus = "idle";
  state.expansionError = null;
  state.expansionMessage = null;
  state.lineage = null;
  state.lineageStatus = "idle";
  state.lineageError = null;
  state.runRecord = null;
  state.runStatus = "preview";
  state.runError = null;
}

function syncRunControls() {
  const searchInput = document.getElementById("searchInput");
  const dateRangeSelect = document.getElementById("dateRangeSelect");
  const platformSelect = document.getElementById("platformSelect");
  if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
  if (dateRangeSelect && dateRangeSelect.value !== state.dateRange) dateRangeSelect.value = state.dateRange;
  if (platformSelect && platformSelect.value !== state.platform) platformSelect.value = state.platform;
}

function postMatchesRunScope(post) {
  if (state.platform !== "all" && post.platform !== state.platform) return false;
  if (state.dateRange === "all") return true;
  if (!post.publishedAt) return true;
  const publishedAt = new Date(post.publishedAt);
  if (!Number.isFinite(publishedAt.getTime())) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(state.dateRange || 90));
  return publishedAt >= cutoff;
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
  "ontario",
  "with",
  "from",
  "that",
  "this",
  "the",
  "and",
  "for",
  "to",
  "in",
  "you",
  "your",
  "are",
  "any",
  "anyone",
  "have",
  "has",
  "had",
  "need",
  "some",
  "want",
  "get",
  "into",
  "real",
  "area",
  "today",
  "together",
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
      body: `${entries.length} posts are connected by the stored ${sub} edge.`,
      relatedIds: entries.sort((a, b) => b.weight - a.weight).map((entry) => entry.postId),
      query,
    });
  };

  addStoredBranch("similar_caption", "Similar Context", "similar caption", selectedPost.query || selectedPost.topicName);

  const sameAuthor = posts.filter((post) => post.id !== selectedPost.id && post.handle === selectedPost.handle);
  addBranch({
    id: `branch:author:${selectedPost.handle}`,
    label: `@${selectedPost.handle}`,
    sub: "same author",
    body: `${sameAuthor.length} posts are connected to the same author.`,
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
      body: `${related.length} posts share this hashtag.`,
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
    body: `${Math.max(sameCity.length, storedSameCityIds.length)} posts are in the same city scope.`,
    relatedIds: Array.from(new Set([...storedSameCityIds, ...sameCity.map((post) => post.id)])),
    query: selectedPost.cityName || selectedPost.citySlug,
  });

  const storedSameTopicIds = (storedRelations.get("same_topic") || []).map((entry) => entry.postId);
  const sameTopic = posts.filter((post) => post.id !== selectedPost.id && post.topicSlug === selectedPost.topicSlug);
  addBranch({
    id: `branch:topic:${selectedPost.topicSlug}`,
    label: selectedPost.topicName || selectedPost.topicSlug,
    sub: "same signal class",
    body: `${Math.max(sameTopic.length, storedSameTopicIds.length)} posts are grouped under the same topic.`,
    relatedIds: Array.from(new Set([...storedSameTopicIds, ...sameTopic.map((post) => post.id)])),
    query: selectedPost.topicName || selectedPost.topicSlug,
  });

  topCaptionKeywords(selectedPost, posts).forEach(({ token, count }) => {
    const related = posts.filter((post) => post.id !== selectedPost.id && normalizeText(postText(post)).includes(token));
    addBranch({
      id: `branch:keyword:${token}`,
      label: token,
      sub: "context keyword",
      body: `${count} posts contain the same context keyword.`,
      relatedIds: related.map((post) => post.id),
      query: token,
    });
  });

  if (branches.length === 0 && relatedByScore.length > 0) {
    addBranch({
      id: `branch:nearest:${selectedPost.id}`,
      label: "Closest Signals",
      sub: "nearest posts",
      body: "Connection score combines hashtags, city, topic, and context overlap.",
      relatedIds: relatedByScore.slice(0, 3).map((entry) => entry.post.id),
      query: selectedPost.query || selectedPost.topicName,
    });
  }

  return branches.slice(0, 5);
}

function radialPoint(index, total, radiusX, radiusY, startAngle = -Math.PI / 2) {
  const count = Math.max(total, 1);
  const angle = startAngle + (Math.PI * 2 * index) / count;
  return {
    x: 50 + Math.cos(angle) * radiusX,
    y: 50 + Math.sin(angle) * radiusY,
  };
}

function buildGraph() {
  const posts = postsForState();
  const city = activeCity();
  const topic = activeTopic();
  const scopeLabel = topic ? `${city.en} ${topic.en || topic.ko}` : `${city.en} Social Signals`;
  const scopeBody = topic
    ? `Organizes ${topic.en || topic.ko} social signals in ${city.en} by cluster.`
    : `Organizes collected social posts in ${city.en} by hashtag, author, and context.`;
  const tags = topTags(posts);
  const keywords = interestingKeywords(posts, city, topic);
  const postIdSet = new Set(posts.map((post) => String(post.id)));
  const savedEntities = (state.activeRunEntities || [])
    .filter((entity) => (entity.postIds || []).some((postId) => postIdSet.has(String(postId))))
    .sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || Number(b.weight || 0) - Number(a.weight || 0));
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
      y: 50,
      z: 60,
      w: 176,
      h: 78,
      body: posts.length > 0 ? scopeBody : "No approved collected data is available for this city yet.",
    },
    { id: `city:${city.slug}`, kind: "city", label: city.en, sub: city.slug.toUpperCase(), x: 50, y: 18, z: -20, w: 128, h: 48 },
  ];
  const edges = [
    { id: "root-city", from: "root", to: `city:${city.slug}`, tone: "primary" },
  ];

  let postNodeIndex = 0;
  const visiblePostTotal = posts.slice(0, 12).length;
  clusters.forEach((cluster, index) => {
    const clusterPoint = radialPoint(index, Math.max(clusters.length, 1), 18, 16, -Math.PI / 2.2);
    const clusterX = clusterPoint.x;
    const clusterY = clusterPoint.y;
    const clusterId = `cluster:${cluster.id}`;
    nodes.push({
      id: clusterId,
      kind: "cluster",
      label: cluster.label,
      sub: `${cluster.posts.length} posts`,
      body: cluster.posts.map((post) => post.hashtags.slice(0, 2).map(cleanTag).join(" · ")).filter(Boolean).slice(0, 2).join(" / "),
      x: clusterX,
      y: clusterY,
      z: 20 - index * 8,
      w: 134,
      h: 54,
      cluster,
    });
    edges.push({ id: `root-${clusterId}`, from: "root", to: clusterId, tone: "primary" });

    cluster.posts.slice(0, 4).forEach((post, postIndex) => {
      const postId = `post:${post.id}`;
      const postPoint = radialPoint(postNodeIndex, Math.max(visiblePostTotal, 1), 31, 28, -Math.PI / 1.65);
      postNodeIndex += 1;
      nodes.push({
        id: postId,
        kind: "post",
        label: `@${post.handle}`,
        sub: post.query || post.topicName || "SNS post",
        body: truncate(post.caption, 132),
        x: postPoint.x,
        y: postPoint.y,
        z: -40 - postIndex * 10,
        w: 156,
        h: 60,
        post,
      });
      edges.push({ id: `${clusterId}-${postId}`, from: clusterId, to: postId, tone: "muted" });
    });
  });

  if (savedEntities.length > 0) {
    savedEntities.slice(0, 18).forEach((entity, index) => {
      const id = `entity:${entity.type}:${entity.normalizedKey}`;
      const point = radialPoint(index, Math.max(savedEntities.length, 1), 39, 36, -Math.PI / 2);
      nodes.push({
        id,
        kind: "entity",
        label: entity.label,
        sub: `${entity.type} · ${entity.postCount} posts`,
        body: "Extracted from the saved investigation run.",
        x: point.x,
        y: point.y,
        z: -90,
        w: 128,
        h: 50,
        entity,
      });
      edges.push({ id: `root-${id}`, from: "root", to: id, tone: "entity" });
      entity.postIds.forEach((postId) => {
        if (postIdSet.has(String(postId))) {
          edges.push({ id: `${id}-${postId}`, from: id, to: `post:${postId}`, tone: "entity" });
        }
      });
    });
  } else {
    keywords.forEach((keyword, index) => {
      const id = `keyword:${keyword.query}`;
      const point = radialPoint(index, Math.max(keywords.length, 1), 39, 36, -Math.PI / 2);
      nodes.push({
        id,
        kind: "keyword",
        label: keyword.kind === "hashtag" ? `#${keyword.label}` : keyword.label,
        sub: `${keyword.postIds.length} related posts`,
        body: "Search this keyword again to expand the next branch.",
        x: point.x,
        y: point.y,
        z: -90,
        w: 118,
        h: 48,
        keyword,
      });
      edges.push({ id: `root-${id}`, from: "root", to: id, tone: "keyword" });
      keyword.postIds.forEach((postId) => {
        if (postIdSet.has(String(postId))) {
          edges.push({ id: `${id}-${postId}`, from: id, to: `post:${postId}`, tone: "keyword" });
        }
      });
    });
  }

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
        w: 142,
        h: 54,
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
      rootNode.w = 170;
      rootNode.h = 70;
    }
    if (cityNode) {
      cityNode.x = 20;
      cityNode.y = 16;
    }
    selectedPostNode.x = 24;
    selectedPostNode.y = 44;
    selectedPostNode.w = 180;
    selectedPostNode.h = 76;
    selectedPostNode.z = 80;

    const relatedPostNodes = nodes.filter((node) => node.kind === "post" && branchRelatedIds.has(String(node.post?.id)) && node.id !== selectedPostNode.id);
    relatedPostNodes.slice(0, 4).forEach((node, index) => {
      node.x = 78;
      node.y = 28 + index * 16;
      node.w = 172;
      node.h = 68;
      node.z = 46 - index * 6;
    });

    nodes.forEach((node) => {
      if (node.kind === "cluster" || node.kind === "keyword" || node.kind === "entity") node.hidden = true;
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
  if (selected.kind === "entity") {
    return posts.filter((post) => selected.entity.postIds.includes(String(post.id))).slice(0, 5);
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
    button.textContent = city.slug === allCity.slug ? "All" : city.en;
    button.addEventListener("click", () => {
      state.city = city.slug;
      state.selected = "root";
      state.expandedPost = null;
      state.topic = null;
      clearActiveRun();
      document.getElementById("searchInput").value = city.slug === allCity.slug ? "Canada" : city.en;
      render();
    });
    cityButtons.appendChild(button);
  });
}

function renderRunSummary(graph) {
  const container = document.getElementById("runSummary");
  if (!container) return;
  const city = activeCity();
  const topic = activeTopic();
  const platformCounts = graph.posts.reduce((acc, post) => {
    const key = post.platform || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const platformText = Object.entries(platformCounts)
    .map(([platform, count]) => `${platform}: ${count}`)
    .join(" · ") || "No matching posts";

  container.innerHTML = `
    <div class="run-row">
      <span>Query</span>
      <strong>${escapeHtml(state.query || "Untitled")}</strong>
    </div>
    <div class="run-row">
      <span>Scope</span>
      <strong>${escapeHtml(city.en)}${topic ? ` · ${escapeHtml(topic.en || topic.slug)}` : ""}</strong>
    </div>
    <div class="run-row">
      <span>Window</span>
      <strong>${escapeHtml(dateRangeLabel())}</strong>
    </div>
    <div class="run-row">
      <span>Platform</span>
      <strong>${escapeHtml(platformLabel())}</strong>
    </div>
    <div class="run-row">
      <span>Data Source</span>
      <strong>${escapeHtml(state.source)}</strong>
    </div>
    <div class="run-row">
      <span>Record</span>
      <strong>${escapeHtml(runRecordLabel())}</strong>
    </div>
    <div class="run-row">
      <span>Matched</span>
      <strong>${escapeHtml(graph.posts.length)} posts</strong>
    </div>
    <div class="run-row">
      <span>Breakdown</span>
      <strong>${escapeHtml(platformText)}</strong>
    </div>
    ${
      state.runError
        ? `<div class="run-row">
            <span>API</span>
            <strong>${escapeHtml(truncate(state.runError, 96))}</strong>
          </div>`
        : ""
    }
  `;
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
    const curve = edge.tone === "tag" || edge.tone === "keyword" || edge.tone === "entity" ? 9 : 5;
    const midY = (from.y + to.y) / 2 - curve;
    path.setAttribute("d", `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("stroke-width", related.has(from.id) && related.has(to.id) ? "0.34" : "0.18");
    path.setAttribute("opacity", related.has(from.id) && related.has(to.id) ? "0.84" : "0.24");
    path.setAttribute("stroke", edge.tone === "primary" ? "#f6c85f" : edge.tone === "entity" ? "#d9aa45" : edge.tone === "tag" || edge.tone === "keyword" ? "#5bb7d5" : edge.tone === "branch" ? "#8fe7c9" : "#62748d");
    path.classList.add("edge", edge.tone);
    edgeLayer.appendChild(path);
  });

  graph.nodes.filter((node) => !node.hidden).forEach((node) => {
    const button = document.createElement("button");
    button.className = `node card-node ${node.kind} ${state.selected === node.id ? "selected" : ""} ${related.has(node.id) || state.selected === "root" ? "" : "dimmed"}`;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.style.width = `${node.w}px`;
    button.style.height = `${node.h}px`;
    button.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${node.z || 0}px)`;

    if (node.kind === "post") {
      button.innerHTML = `
        <span class="node-dot"></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        <span class="card-sub">${escapeHtml(node.post.platform || "post")} · ${escapeHtml(node.post.score)}</span>
      `;
    } else if (node.kind === "keyword" || node.kind === "entity") {
      button.innerHTML = `
        <span class="node-dot"></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        <span class="card-sub">${escapeHtml(node.sub || "related posts")}</span>
      `;
    } else if (node.kind === "cluster") {
      button.innerHTML = `
        <span class="node-dot"></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        ${node.sub ? `<span class="card-sub">${escapeHtml(node.sub)}</span>` : ""}
      `;
    } else if (node.kind === "branch") {
      button.innerHTML = `
        <span class="node-dot"></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        ${node.sub ? `<span class="card-sub">${escapeHtml(node.sub)}</span>` : ""}
      `;
    } else {
      button.innerHTML = `
        <span class="node-dot"></span>
        <span class="card-title">${escapeHtml(node.label)}</span>
        ${node.sub ? `<span class="card-sub">${escapeHtml(node.sub)}</span>` : ""}
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
        ${escapeHtml(selected.body || "Shows posts related by the selected connection rule.")}
        <div class="tag-list">
          <button class="tag-button" data-query="${escapeHtml(selected.branch.query || selected.label)}">Search this rule</button>
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
    const nextQuery = city.slug === allCity.slug ? selected.keyword.query : `${city.en} ${selected.keyword.query}`;
    selectedBody.innerHTML = `
      <div class="post-detail">
        This interest keyword appears across ${escapeHtml(selected.keyword.postIds.length)} posts.
        <div class="tag-list">
          <button class="tag-button" data-query="${escapeHtml(nextQuery)}">Explore this keyword</button>
        </div>
      </div>
    `;
    selectedBody.querySelector("[data-query]")?.addEventListener("click", (event) => {
      document.getElementById("searchInput").value = event.currentTarget.dataset.query;
      state.selected = "root";
      state.expandedPost = null;
      render();
    });
  } else if (selected.entity) {
    const city = activeCity();
    const nextQuery = city.slug === allCity.slug ? selected.entity.label : `${city.en} ${selected.entity.label}`;
    selectedBody.innerHTML = `
      <div class="post-detail">
        ${escapeHtml(selected.entity.type)} entity extracted from ${escapeHtml(selected.entity.postCount)} evidence posts.
        <div class="tag-list">
          <button class="tag-button" data-query="${escapeHtml(nextQuery)}">Explore this entity</button>
          ${state.activeRunId ? `<button class="tag-button" data-queue-entity="${escapeHtml(selected.entity.id)}">Queue expansion</button>` : ""}
        </div>
      </div>
    `;
    selectedBody.querySelector("[data-query]")?.addEventListener("click", (event) => {
      document.getElementById("searchInput").value = event.currentTarget.dataset.query;
      state.selected = "root";
      state.expandedPost = null;
      clearActiveRun();
      render();
    });
    selectedBody.querySelector("[data-queue-entity]")?.addEventListener("click", () => {
      queueExpansionForEntity(selected.entity);
    });
  } else {
    selectedBody.textContent = "Select a post, hashtag, or city node to inspect the next branch of the graph.";
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

function renderFeed(graph) {
  const feedView = document.getElementById("feedView");
  const feedList = document.getElementById("feedList");
  const feedTitle = document.getElementById("feedTitle");
  if (!feedView || !feedList || !feedTitle) return;

  const city = activeCity();
  const topic = activeTopic();
  const posts = sortedFeedPosts(graph.posts);
  feedTitle.textContent = topic ? `${city.en} ${topic.en || topic.slug} Feed` : `${city.en} Feed`;
  feedList.innerHTML = "";

  if (posts.length === 0) {
    feedList.innerHTML = `
      <div class="feed-empty">
        <div class="section-title">No Signals</div>
        <p>No approved collected posts match the current query.</p>
      </div>
    `;
    return;
  }

  posts.forEach((post) => {
    const selected = state.selected === `post:${post.id}`;
    const item = document.createElement("article");
    item.className = `feed-item ${selected ? "selected" : ""}`;
    item.innerHTML = `
      <button class="feed-main" type="button" data-post-id="${escapeHtml(post.id)}">
        <div class="feed-meta">
          <span>@${escapeHtml(post.handle)}</span>
          <span>${escapeHtml((post.platform || "post").toUpperCase())}</span>
          ${post.rank ? `<span>RANK ${escapeHtml(post.rank)}</span>` : ""}
          <span>${escapeHtml(post.status || "approved")}</span>
          <span>${escapeHtml(formatDate(post.publishedAt))}</span>
        </div>
        <div class="feed-caption">${escapeHtml(post.caption)}</div>
        <div class="feed-tags">
          <span>${escapeHtml(post.cityName || post.citySlug || "Unknown city")}</span>
          <span>${escapeHtml(post.topicName || post.topicSlug || "Signal")}</span>
          ${(post.hashtags || []).slice(0, 5).map((tag) => `<span>#${escapeHtml(cleanTag(tag))}</span>`).join("")}
        </div>
      </button>
      <div class="feed-side">
        <span class="feed-score">${escapeHtml(post.score)}</span>
        ${post.sourceUrl ? `<a class="feed-link" href="${escapeHtml(post.sourceUrl)}" target="_blank" rel="noreferrer">Open Source</a>` : ""}
      </div>
    `;
    item.querySelector(".feed-main")?.addEventListener("click", () => {
      state.selected = `post:${post.id}`;
      state.expandedPost = String(post.id);
      render();
    });
    feedList.appendChild(item);
  });
}

function renderViewChrome() {
  const isFeed = state.view === "feed";
  document.getElementById("feedView").hidden = !isFeed;
  document.getElementById("graphCanvas").hidden = isFeed;
  document.getElementById("feedNav").classList.toggle("active", isFeed);
  document.getElementById("graphNav").classList.toggle("active", !isFeed);
  document.querySelector(".hint").textContent = isFeed ? "SOURCE REVIEW ONLINE" : "ENTITY RESOLUTION ONLINE";
}

function renderSeeds() {
  const city = activeCity();
  const topic = activeTopic();
  const entitySeeds = (state.activeRunEntities || [])
    .filter((entity) => ["concern", "event", "business", "place", "keyword"].includes(entity.type))
    .slice(0, 8)
    .map((entity) => entity.label);
  const seeds = entitySeeds.length > 0
    ? entitySeeds
    : topic
    ? city.slug === allCity.slug
      ? [`#canada${topic.slug}`, `Canada ${topic.en || topic.slug}`, `${topic.en || topic.slug} Threads`, `Instagram ${topic.en || topic.slug}`, `${topic.slug} social`]
      : [`#${city.slug}${topic.slug}`, `${city.en} ${topic.en || topic.slug}`, `${topic.en || topic.slug} Threads`, `Instagram ${topic.en || topic.slug}`, `${city.en} social`]
    : city.slug === allCity.slug
      ? ["#canada", "Canada social", "Canada Threads", "Instagram Canada", "Canadian communities"]
      : [`#${city.slug}`, `${city.en} life`, `${city.en} social`, `Instagram ${city.en}`, `${city.en} Threads`];
  document.getElementById("seedList").innerHTML = seeds.map((seed) => `<span class="seed">${seed}</span>`).join("");
}

function renderRunHistory() {
  const container = document.getElementById("runHistory");
  if (!container) return;

  if (state.runsStatus === "loading") {
    container.innerHTML = `<div class="run-history-empty">Loading saved runs</div>`;
    return;
  }

  if (state.runsError) {
    container.innerHTML = `<div class="run-history-empty">${escapeHtml(truncate(state.runsError, 96))}</div>`;
    return;
  }

  if (state.recentRuns.length === 0) {
    container.innerHTML = `<div class="run-history-empty">No saved runs yet</div>`;
    return;
  }

  container.innerHTML = "";
  state.recentRuns.forEach((run) => {
    const button = document.createElement("button");
    button.className = `run-history-item ${state.activeRunId === run.id ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="run-history-title">${escapeHtml(run.query || "Untitled")}</span>
      <span class="run-history-meta">
        ${escapeHtml(platformLabelForRun(run.platform))} · ${escapeHtml(runDateRangeLabel(run.dateRange))} · ${escapeHtml(run.resultCount ?? 0)} posts
      </span>
      <span class="run-history-time">${escapeHtml(formatDateTime(run.createdAt))}</span>
    `;
    button.addEventListener("click", () => {
      loadSavedRun(run.id);
    });
    container.appendChild(button);
  });
}

function renderLineage() {
  const container = document.getElementById("runLineage");
  if (!container) return;

  if (!state.activeRunId) {
    container.innerHTML = `<div class="run-history-empty">Select a saved run</div>`;
    return;
  }

  if (state.lineageStatus === "loading") {
    container.innerHTML = `<div class="run-history-empty">Loading path</div>`;
    return;
  }

  if (state.lineageError) {
    container.innerHTML = `<div class="run-history-empty">${escapeHtml(truncate(state.lineageError, 96))}</div>`;
    return;
  }

  if (!state.lineage?.current) {
    container.innerHTML = `<div class="run-history-empty">No lineage data</div>`;
    return;
  }

  const path = [...state.lineage.ancestors, state.lineage.current];
  container.innerHTML = "";

  const pathGroup = document.createElement("div");
  pathGroup.className = "lineage-path";
  path.forEach((run, index) => {
    const button = document.createElement("button");
    button.className = `lineage-node ${run.id === state.activeRunId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="lineage-index">${escapeHtml(index + 1)}</span>
      <span class="lineage-copy">
        <span class="lineage-title">${escapeHtml(run.query)}</span>
        <span class="lineage-meta">${escapeHtml(run.resultCount)} posts · ${escapeHtml(platformLabelForRun(run.platform))}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      if (run.id !== state.activeRunId) loadSavedRun(run.id);
    });
    pathGroup.appendChild(button);
  });
  container.appendChild(pathGroup);

  if (state.lineage.inbound) {
    const inbound = document.createElement("div");
    inbound.className = "lineage-context";
    inbound.textContent = `Expanded from: ${state.lineage.inbound.query}`;
    container.appendChild(inbound);
  }

  const children = state.lineage.children || [];
  const childGroup = document.createElement("div");
  childGroup.className = "lineage-children";
  const title = document.createElement("div");
  title.className = "queue-meta";
  title.textContent = children.length > 0 ? "Child branches" : "No completed child branches";
  childGroup.appendChild(title);
  children.forEach((child) => {
    const button = document.createElement("button");
    button.className = "lineage-child";
    button.type = "button";
    button.innerHTML = `
      <span class="lineage-title">${escapeHtml(child.run.query)}</span>
      <span class="lineage-meta">${escapeHtml(child.run.resultCount)} posts · ${escapeHtml(child.queue?.status || "completed")}</span>
    `;
    button.addEventListener("click", () => loadSavedRun(child.run.id));
    childGroup.appendChild(button);
  });
  container.appendChild(childGroup);
}

function renderExpansionQueue() {
  const container = document.getElementById("expansionQueue");
  if (!container) return;

  if (!state.activeRunId) {
    container.innerHTML = `<div class="queue-empty">Select a saved run</div>`;
    return;
  }

  if (state.expansionStatus === "loading" || state.expansionStatus === "saving") {
    container.innerHTML = `<div class="queue-empty">${state.expansionStatus === "saving" ? "Queueing expansion" : "Loading queue"}</div>`;
    return;
  }

  container.innerHTML = "";
  const queuedCount = state.expansionQueue.filter((item) => item.status === "queued" || item.status === "failed").length;
  const isBusy = ["planning", "running"].includes(state.expansionStatus);
  const toolbar = document.createElement("div");
  toolbar.className = "queue-toolbar";
  toolbar.innerHTML = `
    <button class="queue-action" type="button" data-plan-expansions ${isBusy ? "disabled" : ""}>Suggest</button>
    <button class="queue-action primary" type="button" data-run-next-expansion ${queuedCount > 0 && !isBusy ? "" : "disabled"}>Run next</button>
  `;
  toolbar.querySelector("[data-plan-expansions]")?.addEventListener("click", () => {
    planExpansionsForRun();
  });
  toolbar.querySelector("[data-run-next-expansion]")?.addEventListener("click", () => {
    runNextQueuedExpansion();
  });
  container.appendChild(toolbar);

  if (state.expansionMessage) {
    const message = document.createElement("div");
    message.className = "queue-empty";
    message.textContent = state.expansionMessage;
    container.appendChild(message);
  }

  if (state.expansionError) {
    const error = document.createElement("div");
    error.className = "queue-empty";
    error.textContent = truncate(state.expansionError, 96);
    container.appendChild(error);
    return;
  }

  if (state.expansionQueue.length === 0) {
    const empty = document.createElement("div");
    empty.className = "queue-empty";
    empty.textContent = "No queued expansions";
    container.appendChild(empty);
    return;
  }

  state.expansionQueue.forEach((item) => {
    const element = document.createElement("div");
    const canRun = ["queued", "failed"].includes(item.status);
    const canOpenResult = item.status === "completed" && item.resultRunId;
    element.className = `queue-item status-${item.status}`;
    element.innerHTML = `
      <button class="queue-main" type="button">
        <span class="queue-title">${escapeHtml(item.query)}</span>
        <span class="queue-meta">${escapeHtml(item.status)} · depth ${escapeHtml(item.depth)} · ${escapeHtml(platformLabelForRun(item.platform))}</span>
      </button>
      <div class="queue-actions">
        ${
          canOpenResult
            ? `<button class="queue-action" type="button" data-open-run="${escapeHtml(item.resultRunId)}">Open</button>`
            : `<button class="queue-action primary" type="button" data-run-queue="${escapeHtml(item.id)}" ${canRun && !isBusy ? "" : "disabled"}>Run</button>`
        }
      </div>
    `;
    element.querySelector(".queue-main")?.addEventListener("click", () => {
      document.getElementById("searchInput").value = item.query;
      clearActiveRun();
      runSearch();
    });
    element.querySelector("[data-run-queue]")?.addEventListener("click", () => {
      runQueuedExpansion(item.id);
    });
    element.querySelector("[data-open-run]")?.addEventListener("click", (event) => {
      loadSavedRun(event.currentTarget.dataset.openRun);
    });
    container.appendChild(element);
  });
}

function render() {
  const city = activeCity();
  state.query = document.getElementById("searchInput").value.trim() || (city.slug === allCity.slug ? "Canada" : city.en);
  const graph = buildGraph();
  const visibleNodeIds = new Set(graph.nodes.filter((node) => !node.hidden).map((node) => node.id));
  const visibleEdgeCount = graph.edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)).length;
  document.getElementById("queryBadge").textContent = state.query;
  document.getElementById("nodeCount").textContent = state.view === "feed" ? `${graph.posts.length} posts` : `${visibleNodeIds.size} nodes`;
  document.getElementById("edgeCount").textContent = state.view === "feed" ? dateRangeLabel() : `${visibleEdgeCount} links`;
  document.querySelector(".badge.green").textContent = state.source;
  renderViewChrome();
  renderFilters();
  renderRunSummary(graph);
  renderGraph(graph);
  renderFeed(graph);
  renderDetail(graph);
  renderSeeds();
  renderRunHistory();
  renderLineage();
  renderExpansionQueue();
}

async function loadRecentRuns({ renderAfter = true } = {}) {
  state.runsStatus = "loading";
  state.runsError = null;
  if (renderAfter) render();

  try {
    const response = await fetch("/api/investigation-runs?limit=10");
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Run history API failed: ${response.status}`);
    }
    state.recentRuns = payload.runs || [];
    state.runsStatus = "ready";
  } catch (error) {
    state.runsStatus = "failed";
    state.runsError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Run history unavailable:", state.runsError);
  } finally {
    if (renderAfter) render();
  }
}

async function loadExpansionQueue(runId = state.activeRunId, { renderAfter = true } = {}) {
  if (!runId) return;
  state.expansionStatus = "loading";
  state.expansionError = null;
  if (renderAfter) render();

  try {
    const response = await fetch(`/api/expansion-queue?runId=${encodeURIComponent(runId)}&limit=20`);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Expansion queue API failed: ${response.status}`);
    }
    state.expansionQueue = (payload.queue || []).map(normalizeQueueItem);
    state.expansionStatus = "ready";
  } catch (error) {
    state.expansionStatus = "failed";
    state.expansionError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Expansion queue unavailable:", state.expansionError);
  } finally {
    if (renderAfter) render();
  }
}

async function loadRunLineage(runId = state.activeRunId, { renderAfter = true } = {}) {
  if (!runId) return;
  state.lineageStatus = "loading";
  state.lineageError = null;
  if (renderAfter) render();

  try {
    const response = await fetch(`/api/investigation-runs/${encodeURIComponent(runId)}/lineage?childLimit=20`);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Lineage API failed: ${response.status}`);
    }
    state.lineage = normalizeLineage(payload);
    state.lineageStatus = "ready";
  } catch (error) {
    state.lineageStatus = "failed";
    state.lineageError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Run lineage unavailable:", state.lineageError);
  } finally {
    if (renderAfter) render();
  }
}

function expansionQueryForEntity(entity) {
  const city = activeCity();
  if (city.slug === allCity.slug) return entity.label;
  return `${city.en} ${entity.label}`;
}

async function queueExpansionForEntity(entity) {
  if (!state.activeRunId || !entity?.id) return;
  state.expansionStatus = "saving";
  state.expansionError = null;
  state.expansionMessage = null;
  render();

  try {
    const response = await fetch("/api/expansion-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceRunId: state.activeRunId,
        sourceEntityId: entity.id,
        query: expansionQueryForEntity(entity),
        platform: state.platform,
        dateRange: state.dateRange,
        depth: 1,
        priority: Number(entity.weight || entity.postCount || 0),
        metadata: {
          entity_type: entity.type,
          entity_label: entity.label,
          entity_post_count: entity.postCount,
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Queue API failed: ${response.status}`);
    }
    state.expansionMessage = `Queued ${payload.item?.query || entity.label}`;
    await loadExpansionQueue(state.activeRunId, { renderAfter: false });
  } catch (error) {
    state.expansionStatus = "failed";
    state.expansionError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Expansion could not be queued:", state.expansionError);
  } finally {
    render();
  }
}

async function planExpansionsForRun() {
  if (!state.activeRunId) return;
  state.expansionStatus = "planning";
  state.expansionError = null;
  state.expansionMessage = "Suggesting expansion candidates";
  render();

  try {
    const response = await fetch(`/api/investigation-runs/${encodeURIComponent(state.activeRunId)}/plan-expansions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxItems: 8 }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Expansion planner API failed: ${response.status}`);
    }
    await loadExpansionQueue(state.activeRunId, { renderAfter: false });
    state.expansionStatus = "ready";
    state.expansionMessage = `Suggested ${payload.plannedCount || 0} expansion candidates`;
  } catch (error) {
    state.expansionStatus = "failed";
    state.expansionError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Expansion planner failed:", state.expansionError);
  } finally {
    render();
  }
}

async function runQueuedExpansion(queueId) {
  if (!queueId) return;
  const parentRunId = state.activeRunId;
  state.expansionStatus = "running";
  state.expansionError = null;
  state.expansionMessage = "Running queued expansion";
  render();

  try {
    const response = await fetch(`/api/expansion-queue/${encodeURIComponent(queueId)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultLimit: 80 }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Expansion worker API failed: ${response.status}`);
    }
    await loadRecentRuns({ renderAfter: false });
    const resultRunId = payload.run?.id || payload.item?.resultRunId;
    if (resultRunId) {
      await loadSavedRun(resultRunId, { renderAfter: false });
      state.expansionMessage = payload.skipped ? "Opened existing child run" : "Child investigation run created";
    } else if (parentRunId) {
      await loadExpansionQueue(parentRunId, { renderAfter: false });
      state.expansionMessage = "Expansion completed";
    }
    state.expansionStatus = "ready";
  } catch (error) {
    state.expansionStatus = "failed";
    state.expansionError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Queued expansion could not run:", state.expansionError);
  } finally {
    render();
  }
}

async function runNextQueuedExpansion() {
  if (!state.activeRunId) return;
  const parentRunId = state.activeRunId;
  state.expansionStatus = "running";
  state.expansionError = null;
  state.expansionMessage = "Running next queued expansion";
  render();

  try {
    const response = await fetch("/api/expansion-queue/run-next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: parentRunId, resultLimit: 80 }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Expansion worker API failed: ${response.status}`);
    }
    await loadRecentRuns({ renderAfter: false });
    const resultRunId = payload.run?.id || payload.item?.resultRunId;
    if (resultRunId) {
      await loadSavedRun(resultRunId, { renderAfter: false });
      state.expansionMessage = payload.skipped ? "Opened existing child run" : "Child investigation run created";
    } else {
      await loadExpansionQueue(parentRunId, { renderAfter: false });
      state.expansionMessage = "Expansion completed";
    }
    state.expansionStatus = "ready";
  } catch (error) {
    state.expansionStatus = "failed";
    state.expansionError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Next queued expansion could not run:", state.expansionError);
  } finally {
    render();
  }
}

async function loadSavedRun(runId, { renderAfter = true } = {}) {
  state.runStatus = "recording";
  state.runError = null;
  if (renderAfter) render();

  try {
    const response = await fetch(`/api/investigation-runs/${encodeURIComponent(runId)}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Saved run API failed: ${response.status}`);
    }
    state.activeRunId = payload.run.id;
    state.activeRunPosts = (payload.posts || []).map(normalizeApiPost);
    state.activeRunEntities = (payload.entities || []).map(normalizeApiEntity);
    state.runRecord = payload.run;
    state.runStatus = "saved";
    state.query = payload.run.query || state.query;
    state.dateRange = String(payload.run.dateRange || state.dateRange);
    state.platform = payload.run.platform || state.platform;
    state.selected = "root";
    state.expandedPost = null;
    syncRunControls();
    await Promise.all([
      loadExpansionQueue(payload.run.id, { renderAfter: false }),
      loadRunLineage(payload.run.id, { renderAfter: false }),
    ]);
  } catch (error) {
    state.runStatus = "failed";
    state.runError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Saved run could not be loaded:", state.runError);
  } finally {
    if (renderAfter) render();
  }
}

async function recordInvestigationRun() {
  state.runStatus = "recording";
  state.runError = null;
  state.runRecord = null;
  render();

  try {
    const response = await fetch("/api/investigation-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: state.query,
        dateRange: state.dateRange,
        platform: state.platform,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || `Investigation API failed: ${response.status}`);
    }
    state.runRecord = payload.run;
    state.runStatus = "saved";
    await loadRecentRuns({ renderAfter: false });
    await loadSavedRun(payload.run.id, { renderAfter: false });
  } catch (error) {
    state.runStatus = "failed";
    state.runError = error instanceof Error ? error.message : String(error);
    console.warn("[DataNode] Investigation run was not recorded:", state.runError);
  } finally {
    render();
  }
}

function runSearch({ record = false } = {}) {
  state.selected = "root";
  state.expandedPost = null;
  clearActiveRun();
  state.runStatus = record ? "recording" : "preview";
  render();
  if (record) recordInvestigationRun();
}

document.getElementById("searchInput").addEventListener("input", () => runSearch());
document.getElementById("searchInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch({ record: true });
});
document.getElementById("searchButton").addEventListener("click", () => runSearch({ record: true }));
document.getElementById("feedNav").addEventListener("click", () => {
  state.view = "feed";
});
document.getElementById("graphNav").addEventListener("click", () => {
  state.view = "graph";
});
window.addEventListener("hashchange", () => {
  state.view = window.location.hash === "#feed" ? "feed" : "graph";
  render();
});
document.querySelectorAll("[data-feed-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    state.feedSort = button.dataset.feedSort || "rank";
    document.querySelectorAll("[data-feed-sort]").forEach((entry) => entry.classList.toggle("active", entry === button));
    render();
  });
});
document.getElementById("dateRangeSelect").addEventListener("change", (event) => {
  state.dateRange = event.currentTarget.value;
  state.runStartedAt = new Date().toISOString();
  state.selected = "root";
  state.expandedPost = null;
  clearActiveRun();
  render();
});
document.getElementById("platformSelect").addEventListener("change", (event) => {
  state.platform = event.currentTarget.value;
  state.runStartedAt = new Date().toISOString();
  state.selected = "root";
  state.expandedPost = null;
  clearActiveRun();
  render();
});

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
  await loadRecentRuns({ renderAfter: false });
  render();
})();
