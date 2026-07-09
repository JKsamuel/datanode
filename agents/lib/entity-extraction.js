const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'around',
  'because',
  'been',
  'being',
  'can',
  'could',
  'from',
  'have',
  'into',
  'need',
  'only',
  'people',
  'person',
  'post',
  'real',
  'some',
  'that',
  'this',
  'today',
  'want',
  'with',
  'would',
  'hamilton',
  'ontario',
  'canada',
  'threads',
  'instagram',
]);

const concernRules = [
  {
    label: 'Friendship / social connection',
    terms: ['friends', 'hang around', 'new here', 'who’s in', "who's in", 'get together'],
    weight: 7,
  },
  {
    label: 'Relationship seeking',
    terms: ['relationship', 'real person', 'fans only', 'girls'],
    weight: 6,
  },
  {
    label: 'Short-term work / cash',
    terms: ['extra $$$', 'cash', 'card', 'computer skills', 'interested'],
    weight: 6,
  },
  {
    label: 'Local event participation',
    terms: ['festival', 'canada day', 'party', 'event'],
    weight: 5,
  },
];

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^\p{L}\p{N}\s/$'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedKey(type, label) {
  return `${type}:${normalizeText(label).replace(/\s+/g, '-')}`;
}

function cleanLabel(label) {
  return String(label ?? '')
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSnippet(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

function detectLanguage(label) {
  const value = String(label ?? '');
  const ko = (value.match(/[\u3131-\u318e\uac00-\ud7a3]/g) || []).length;
  const latin = (value.match(/[a-z]/gi) || []).length;
  if (ko > 0 && latin > 0) return 'mixed';
  if (ko > 0) return 'ko';
  if (latin > 0) return 'en';
  return 'other';
}

function titleCaseLike(label) {
  return /\b[A-Z][a-z]+(?:\s+[A-Z][A-Za-z'’]+){0,5}\b/.test(label);
}

function keywordTokens(text) {
  return Array.from(new Set(normalizeText(text).split(' ')))
    .map((token) => token.replace(/^[$'-]+|[$'-]+$/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function addEntity(map, { type, label, post, weight, evidence = {} }) {
  const clean = cleanLabel(label);
  if (!clean || clean.length < 2) return;
  const key = normalizedKey(type, clean);
  if (key.length < 4) return;
  const current =
    map.get(key) || {
      type,
      label: clean,
      normalizedKey: key.replace(`${type}:`, ''),
      language: detectLanguage(clean),
      weight: 0,
      postIds: new Set(),
      evidence: [],
    };
  current.weight += weight;
  current.postIds.add(String(post.id));
  if (current.evidence.length < 4) {
    current.evidence.push({
      post_id: post.id,
      handle: post.handle,
      caption: cleanSnippet(post.caption),
      ...evidence,
    });
  }
  map.set(key, current);
}

function addAuthorEntity(map, post) {
  if (!post.handle) return;
  addEntity(map, {
    type: 'author',
    label: `@${post.handle.replace(/^@/, '')}`,
    post,
    weight: 5,
    evidence: { reason: 'author_handle' },
  });
}

function addHashtagEntities(map, post) {
  (post.hashtags || []).forEach((tag) => {
    addEntity(map, {
      type: 'hashtag',
      label: `#${cleanLabel(tag)}`,
      post,
      weight: 4,
      evidence: { reason: 'hashtag' },
    });
  });
}

function addConcernEntities(map, post) {
  const normalized = normalizeText(`${post.caption} ${post.query || ''}`);
  concernRules.forEach((rule) => {
    const matchedTerms = rule.terms.filter((term) => normalized.includes(normalizeText(term)));
    if (matchedTerms.length === 0) return;
    addEntity(map, {
      type: 'concern',
      label: rule.label,
      post,
      weight: rule.weight + matchedTerms.length,
      evidence: { reason: 'concern_rule', terms: matchedTerms },
    });
  });
}

function addPhraseEntities(map, post) {
  const text = String(post.caption || '');
  const quotedPhrases = Array.from(text.matchAll(/"([^"]{3,70})"/g)).map((match) => match[1]);
  quotedPhrases.forEach((phrase) => {
    const type = /festival|event|day|party/i.test(phrase) ? 'event' : 'business';
    addEntity(map, { type, label: phrase, post, weight: 5, evidence: { reason: 'quoted_phrase' } });
  });

  const eventPhrases = ['Canada Day', "It's Your Festival"];
  eventPhrases.forEach((phrase) => {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      addEntity(map, { type: 'event', label: phrase, post, weight: 6, evidence: { reason: 'known_event_phrase' } });
    }
  });

  Array.from(text.matchAll(/\bat\s+([A-Z][A-Za-z0-9'’& -]{2,60}?)(?:\s+in\b|[.!?,]|$)/g)).forEach((match) => {
    const phrase = cleanLabel(match[1]);
    if (!titleCaseLike(phrase)) return;
    const type = /festival|market|event|party|day/i.test(phrase) ? 'event' : 'place';
    addEntity(map, { type, label: phrase, post, weight: 4, evidence: { reason: 'at_phrase' } });
  });
}

function addKeywordEntities(map, post) {
  keywordTokens(`${post.caption} ${post.query || ''} ${(post.hashtags || []).join(' ')}`)
    .slice(0, 16)
    .forEach((token) => {
      addEntity(map, {
        type: 'keyword',
        label: token,
        post,
        weight: token.length > 6 ? 2 : 1.4,
        evidence: { reason: 'caption_keyword' },
      });
    });
}

export function extractRunEntities(posts, { limit = 28 } = {}) {
  const map = new Map();
  posts.forEach((post) => {
    addAuthorEntity(map, post);
    addHashtagEntities(map, post);
    addConcernEntities(map, post);
    addPhraseEntities(map, post);
    addKeywordEntities(map, post);
  });

  return Array.from(map.values())
    .map((entry) => ({
      type: entry.type,
      label: entry.label,
      normalizedKey: entry.normalizedKey,
      language: entry.language,
      weight: Number(entry.weight.toFixed(4)),
      postIds: Array.from(entry.postIds),
      postCount: entry.postIds.size,
      evidence: entry.evidence,
    }))
    .filter((entry) => entry.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount || b.weight - a.weight || a.label.localeCompare(b.label))
    .slice(0, limit);
}
