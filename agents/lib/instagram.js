export function canonicalInstagramUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl, 'https://www.instagram.com');
  } catch {
    return null;
  }

  const match = url.pathname.match(/^\/(p|reel)\/([^/?#]+)\/?/);
  if (!match) return null;
  return `https://www.instagram.com/${match[1]}/${match[2]}/`;
}

export function buildInstagramKeywordUrl(query) {
  return `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(query)}`;
}

export function buildInstagramTagUrl(tag) {
  return `https://www.instagram.com/explore/tags/${encodeURIComponent(tag.replace(/^#/, ''))}/`;
}

export function extractHashtags(text) {
  return Array.from(new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((tag) => tag.replace(/^#/, ''))));
}

export function buildSeedQueries(city, topic, limit = 8) {
  const cityTerms = [city.name_ko, city.name_en, ...(city.aliases ?? [])].filter(Boolean);
  const keywordQueries = cityTerms
    .flatMap((cityTerm) => (topic.keywords ?? []).slice(0, 4).map((keyword) => `${cityTerm} ${keyword}`))
    .map((query) => ({
      query,
      searchKind: 'keyword',
      url: buildInstagramKeywordUrl(query),
    }));
  const hashtagQueries = Array.from(new Set([...(topic.seed_hashtags ?? []), `${city.name_ko}${topic.label_ko}`]))
    .filter(Boolean)
    .map((tag) => ({
      query: `#${tag.replace(/^#/, '').replace(/\s+/g, '')}`,
      searchKind: 'hashtag',
      url: buildInstagramTagUrl(tag),
    }));
  return [...hashtagQueries, ...keywordQueries].slice(0, limit);
}
