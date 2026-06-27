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
];

const topics = [
  { slug: "rent-real-estate", ko: "렌트/부동산" },
  { slug: "immigration", ko: "이민" },
  { slug: "jobs", ko: "일자리/커리어" },
  { slug: "finance", ko: "금융/생활비" },
  { slug: "food", ko: "맛집/카페" },
  { slug: "events", ko: "이벤트" },
  { slug: "education", ko: "교육/유학" },
  { slug: "transportation", ko: "교통/차" },
  { slug: "healthcare", ko: "의료" },
  { slug: "travel-outdoors", ko: "여행/아웃도어" },
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
  topic: "food",
  selected: "root",
  query: "토론토 맛집",
  source: "mock data",
};

let basePosts = fallbackPosts;

const postPositions = [
  [23, 67],
  [39, 82],
  [61, 82],
  [77, 67],
  [18, 48],
  [82, 48],
  [34, 20],
  [66, 20],
  [50, 90],
  [10, 60],
  [90, 60],
  [50, 12],
];

const tagPositions = [
  [10, 24],
  [90, 24],
  [12, 78],
  [88, 78],
  [30, 10],
  [70, 10],
  [30, 94],
  [70, 94],
];

function activeCity() {
  return cities.find((city) => city.slug === state.city) || cities[0];
}

function activeTopic() {
  return topics.find((topic) => topic.slug === state.topic) || topics[4];
}

function cleanTag(tag) {
  return tag.replace(/^#+/, "").trim();
}

function postsForState() {
  const city = activeCity();
  const dbPosts = basePosts.filter((post) => post.citySlug === state.city && post.topicSlug === state.topic);
  if (dbPosts.length > 0) return dbPosts;

  return basePosts.map((post) => ({
    ...post,
    id: `${city.slug}-${state.topic}-${post.id}`,
    cityName: city.ko,
    topicName: activeTopic().ko,
    handle: city.slug === "toronto" ? post.handle : `${city.slug}.${post.handle.split(".")[0]}`,
    query: post.query.replace("토론토", city.ko),
    hashtags: Array.from(new Set([city.slug, ...post.hashtags])),
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
    "source_url",
    "author_handle",
    "caption",
    "score",
    "metadata",
    "cities(slug,name_ko,name_en)",
    "topics(slug,label_ko)",
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

    return {
      id: row.id,
      sourceUrl: row.source_url,
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

function buildGraph() {
  const city = activeCity();
  const topic = activeTopic();
  const posts = postsForState();
  const tags = topTags(posts);
  const nodes = [
    { id: "root", kind: "root", label: `${city.ko} ${topic.ko}`, sub: "Search root", x: 50, y: 50, size: 132 },
    { id: `city:${city.slug}`, kind: "city", label: city.ko, sub: city.en, x: 24, y: 28, size: 96 },
    { id: `topic:${topic.slug}`, kind: "topic", label: topic.ko, sub: topic.slug, x: 76, y: 28, size: 96 },
  ];
  const edges = [
    { id: "root-city", from: "root", to: `city:${city.slug}`, tone: "primary" },
    { id: "root-topic", from: "root", to: `topic:${topic.slug}`, tone: "primary" },
  ];

  posts.slice(0, 12).forEach((post, index) => {
    const [x, y] = postPositions[index] || [50, 50];
    const id = `post:${post.id}`;
    nodes.push({ id, kind: "post", label: `@${post.handle}`, sub: post.query, x, y, size: 84, post });
    edges.push({ id: `root-${id}`, from: "root", to: id, tone: "primary" });
    edges.push({ id: `topic-${id}`, from: `topic:${topic.slug}`, to: id, tone: "muted" });
  });

  tags.forEach((tag, index) => {
    const [x, y] = tagPositions[index] || [50, 50];
    const id = `tag:${tag}`;
    nodes.push({ id, kind: "tag", label: `#${tag}`, sub: "hashtag", x, y, size: 68 });
    edges.push({ id: `root-${id}`, from: "root", to: id, tone: "tag" });
    posts.forEach((post) => {
      if (post.hashtags.map(cleanTag).includes(tag)) {
        edges.push({ id: `${id}-${post.id}`, from: id, to: `post:${post.id}`, tone: "tag" });
      }
    });
  });

  return { nodes, edges, posts, tags };
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
  if (selected.kind === "post") {
    const tags = new Set(selected.post.hashtags.map(cleanTag));
    return posts
      .filter((post) => post.id !== selected.post.id)
      .filter((post) => post.hashtags.some((tag) => tags.has(cleanTag(tag))))
      .slice(0, 5);
  }
  return posts.slice(0, 5);
}

function renderFilters() {
  const cityButtons = document.getElementById("cityButtons");
  const topicButtons = document.getElementById("topicButtons");
  cityButtons.innerHTML = "";
  topicButtons.innerHTML = "";

  cities.forEach((city) => {
    const button = document.createElement("button");
    button.className = `filter-button ${city.slug === state.city ? "active" : ""}`;
    button.textContent = city.ko;
    button.addEventListener("click", () => {
      state.city = city.slug;
      state.selected = "root";
      render();
    });
    cityButtons.appendChild(button);
  });

  topics.forEach((topic) => {
    const button = document.createElement("button");
    button.className = `filter-button topic ${topic.slug === state.topic ? "active" : ""}`;
    button.textContent = topic.ko;
    button.addEventListener("click", () => {
      state.topic = topic.slug;
      state.selected = "root";
      render();
    });
    topicButtons.appendChild(button);
  });
}

function renderGraph(graph) {
  const edgeLayer = document.getElementById("edgeLayer");
  const nodeLayer = document.getElementById("nodeLayer");
  edgeLayer.innerHTML = "";
  nodeLayer.innerHTML = "";
  const related = relatedIds(state.selected, graph.edges);

  graph.edges.forEach((edge) => {
    const from = graph.nodes.find((node) => node.id === edge.from);
    const to = graph.nodes.find((node) => node.id === edge.to);
    if (!from || !to) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.setAttribute("stroke-width", related.has(from.id) && related.has(to.id) ? "2" : "1");
    line.setAttribute("opacity", related.has(from.id) && related.has(to.id) ? "0.9" : "0.2");
    line.setAttribute("stroke", edge.tone === "primary" ? "#f6c85f" : edge.tone === "tag" ? "#5bb7d5" : "#62748d");
    line.classList.add("edge");
    edgeLayer.appendChild(line);
  });

  graph.nodes.forEach((node) => {
    const button = document.createElement("button");
    button.className = `node ${node.kind} ${state.selected === node.id ? "selected" : ""} ${related.has(node.id) ? "" : "dimmed"}`;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.style.width = `${node.size}px`;
    button.style.height = `${node.size}px`;
    button.innerHTML = `<span class="node-title">${node.label}</span>${node.sub ? `<span class="node-sub">${node.sub}</span>` : ""}`;
    button.addEventListener("click", () => {
      state.selected = node.id;
      render();
    });
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
        ${selected.post.caption}
        <div class="tag-list">
          ${selected.post.hashtags
            .slice(0, 10)
            .map((tag) => `<button class="tag-button" data-tag="${cleanTag(tag)}">#${cleanTag(tag)}</button>`)
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
  } else {
    selectedBody.textContent = "연결된 포스트, 해시태그, 도시/토픽 노드를 선택해 그래프의 다음 가지를 확인합니다.";
  }

  const related = relatedPosts(selected, graph.posts);
  relatedCount.textContent = String(related.length);
  relatedList.innerHTML = "";
  related.forEach((post) => {
    const button = document.createElement("button");
    button.className = "related-item";
    button.innerHTML = `
      <div class="related-title"><span>@${post.handle}</span><span class="related-score">${post.score}</span></div>
      <div class="related-caption">${post.caption}</div>
    `;
    button.addEventListener("click", () => {
      state.selected = `post:${post.id}`;
      render();
    });
    relatedList.appendChild(button);
  });
}

function renderSeeds() {
  const city = activeCity();
  const topic = activeTopic();
  const seeds = [
    `#${city.slug}${topic.slug}`,
    `#${city.ko}${topic.ko.replace("/", "")}`,
    `${city.en} ${topic.ko}`,
    `${city.ko} 인스타`,
    `${city.en} social`,
  ];
  document.getElementById("seedList").innerHTML = seeds.map((seed) => `<span class="seed">${seed}</span>`).join("");
}

function render() {
  state.query = document.getElementById("searchInput").value.trim() || `${activeCity().ko} ${activeTopic().ko}`;
  const graph = buildGraph();
  document.getElementById("queryBadge").textContent = state.query;
  document.getElementById("nodeCount").textContent = `${graph.nodes.length} nodes`;
  document.getElementById("edgeCount").textContent = `${graph.edges.length} links`;
  document.querySelector(".badge.green").textContent = state.source;
  renderFilters();
  renderGraph(graph);
  renderDetail(graph);
  renderSeeds();
}

document.getElementById("searchInput").addEventListener("input", render);

(async function init() {
  try {
    const posts = await loadSupabasePosts();
    if (posts) {
      basePosts = posts;
      state.source = "Supabase connected";
    }
  } catch (error) {
    console.warn("[DataNode] Supabase fallback:", error);
  }
  render();
})();
