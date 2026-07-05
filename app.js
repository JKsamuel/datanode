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
  return cities.find((city) => city.slug === state.city) || cities[0];
}

function activeTopic() {
  return topics.find((topic) => topic.slug === state.topic) || topics[4];
}

function cleanTag(tag) {
  return tag.replace(/^#+/, "").trim();
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
    { id: "root", kind: "root", label: `${city.ko} ${topic.ko}`, sub: "Search root", x: 50, y: 50, size: 92 },
    { id: `city:${city.slug}`, kind: "city", label: city.ko, sub: city.en, x: 24, y: 28, size: 96 },
    { id: `topic:${topic.slug}`, kind: "topic", label: topic.ko, sub: topic.slug, x: 76, y: 28, size: 96 },
  ];
  const edges = [
    { id: "root-city", from: "root", to: `city:${city.slug}`, tone: "primary" },
    { id: "root-topic", from: "root", to: `topic:${topic.slug}`, tone: "primary" },
  ];

  posts.slice(0, 12).forEach((post, index) => {
    const id = `post:${post.id}`;
    nodes.push({ id, kind: "post", label: `@${post.handle}`, sub: post.query, size: 58, post });
    edges.push({ id: `root-${id}`, from: "root", to: id, tone: "primary" });
    edges.push({ id: `topic-${id}`, from: `topic:${topic.slug}`, to: id, tone: "muted" });
  });

  tags.forEach((tag, index) => {
    const id = `tag:${tag}`;
    nodes.push({ id, kind: "tag", label: `#${tag}`, sub: "hashtag", size: 44 });
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
  assignSpherePoints(graph);
  graph.gridLines = buildSphereGridLines();
  currentGraph = graph;
  const related = relatedIds(state.selected, graph.edges);

  graph.gridLines.forEach((gridLine) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("fill", "none");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.classList.add("sphere-grid", gridLine.kind);
    gridLine.element = line;
    edgeLayer.appendChild(line);
  });

  graph.edges.forEach((edge) => {
    const from = graph.nodes.find((node) => node.id === edge.from);
    const to = graph.nodes.find((node) => node.id === edge.to);
    if (!from || !to) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    const isRootEdge = edge.from === "root" || edge.to === "root";
    line.setAttribute("fill", "none");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.setAttribute("stroke-width", related.has(from.id) && related.has(to.id) ? "2" : "1");
    line.dataset.baseOpacity = isRootEdge ? "0.16" : related.has(from.id) && related.has(to.id) ? "0.78" : "0.28";
    line.setAttribute("stroke", edge.tone === "primary" ? "#f6c85f" : edge.tone === "tag" ? "#5bb7d5" : "#62748d");
    line.classList.add("edge", isRootEdge ? "radial" : "surface");
    edge.element = line;
    edge.surfacePoints = interpolateSurfacePoints(from, to);
    edgeLayer.appendChild(line);
  });

  graph.nodes.forEach((node) => {
    const button = document.createElement("button");
    button.className = `node ${node.kind} ${state.selected === node.id ? "selected" : ""} ${related.has(node.id) ? "" : "dimmed"}`;
    button.innerHTML =
      node.kind === "post"
        ? `<span class="node-thumb"></span><span class="node-title">${node.label}</span>`
        : `<span class="node-title">${node.label}</span>${node.sub ? `<span class="node-sub">${node.sub}</span>` : ""}`;
    const thumb = button.querySelector(".node-thumb");
    if (thumb) thumb.style.backgroundImage = `url("${thumbnailForPost(node.post)}")`;
    button.addEventListener("click", () => {
      if (sphere.suppressClick) return;
      state.selected = node.id;
      render();
    });
    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      sphere.draggingNode = node.id;
      sphere.nodeMoved = false;
      sphere.lastX = event.clientX;
      sphere.lastY = event.clientY;
      state.selected = node.id;
      button.setPointerCapture(event.pointerId);
    });
    node.element = button;
    nodeLayer.appendChild(button);
  });
  installSphereControls();
  startAnimationLoop();
  updateSphereFrame();
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
