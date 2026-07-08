export function canonicalThreadsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl, 'https://www.threads.com');
  } catch {
    return null;
  }

  if (!['www.threads.com', 'threads.com', 'www.threads.net', 'threads.net'].includes(url.hostname)) {
    return null;
  }

  const match = url.pathname.match(/^\/@([^/?#]+)\/post\/([^/?#]+)\/?/);
  if (!match) return null;
  return `https://www.threads.com/@${match[1]}/post/${match[2]}`;
}

export function buildThreadsSearchUrl(query) {
  return `https://www.threads.com/search?q=${encodeURIComponent(query)}`;
}

export function extractThreadsTags(text) {
  const hashtags = (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((tag) => tag.replace(/^#/, ''));
  const cashtags = (text.match(/\$[A-Z]{2,6}\b/g) ?? []).map((tag) => tag.replace(/^\$/, '').toLowerCase());
  return Array.from(new Set([...hashtags, ...cashtags]));
}

export function buildThreadsSeedQueries(city, topic, limit = 8) {
  const cityTerms = [city.name_en, city.slug, city.name_ko, ...(city.aliases ?? [])].filter(Boolean).slice(0, 5);
  const topicTerms = [topic.label_en, topic.label_ko, ...(topic.keywords ?? []), ...(topic.seed_hashtags ?? [])]
    .filter(Boolean)
    .map((term) => String(term).replace(/^#/, ''))
    .slice(0, 8);
  const intentTerms = ['recommendation', 'review', 'question', '고민', '질문', '후기', '추천', '정보'];
  const queries = [];

  cityTerms.forEach((cityTerm) => {
    topicTerms.forEach((topicTerm) => {
      queries.push(`${cityTerm} ${topicTerm}`);
    });
  });

  cityTerms.slice(0, 2).forEach((cityTerm) => {
    topicTerms.slice(0, 3).forEach((topicTerm) => {
      intentTerms.slice(0, 3).forEach((intent) => {
        queries.push(`${cityTerm} ${topicTerm} ${intent}`);
      });
    });
  });

  return Array.from(new Set(queries))
    .slice(0, limit)
    .map((query) => ({
      query,
      searchKind: 'keyword',
      url: buildThreadsSearchUrl(query),
    }));
}
