const CANADA_TERMS = [
  'canada',
  'canadian',
  '캐나다',
  '온타리오',
  'ontario',
  'bc',
  'british columbia',
  '브리티시컬럼비아',
  'quebec',
  '퀘벡',
  'alberta',
  '알버타',
  'manitoba',
  '매니토바',
  'saskatchewan',
  '서스캐처원',
  'nova scotia',
  '노바스코샤',
  'gta',
  'greater toronto',
  'metro vancouver',
  'toronto',
  '토론토',
  'vancouver',
  '밴쿠버',
  'montreal',
  '몬트리올',
  'calgary',
  '캘거리',
  'edmonton',
  '에드먼턴',
  'ottawa',
  '오타와',
  'winnipeg',
  '위니펙',
  'halifax',
  '핼리팩스',
  'victoria',
  '빅토리아',
  'waterloo',
  '워털루',
  'kitchener',
  '키치너',
  'mississauga',
  '미시사가',
  'saskatoon',
  '사스카툰',
  'hamilton',
  '해밀턴',
  'burlington',
  '벌링턴',
  'oakville',
  '오크빌',
];

const FOREIGN_EXCLUSION_PATTERNS = [
  /\b(australia|aussie|sydney|melbourne|brisbane|perth)\b/i,
  /(호주|시드니|멜버른|브리즈번|퍼스)/,
  /\b(uk|england|britain|british)\b/i,
  /(영국|잉글랜드|브리튼)/,
  /\b(bali|ubud|canggu|indonesia)\b/i,
  /(발리|우붓|짱구맛집|인도네시아)/,
  /\b(boston|massachusetts|harvard|mit)\b/i,
  /(보스턴|매사추세츠)/,
  /\b(new zealand|nz|waikato|auckland|wellington)\b/i,
  /(뉴질랜드|와이카토|오클랜드|웰링턴)/,
  /\blondon\b(?!\s*,?\s*(on|ontario|canada)\b)/i,
  /런던(?!\s*(온타리오|캐나다))/,
];

const KOREA_ONLY_PATTERNS = [
  /(한국\s*생활|한국에서\s*살|한국\s*일상|한국\s*맛집|한국\s*카페|한국\s*여행)/,
  /(서울\s*맛집|서울\s*카페|서울\s*핫플|부산\s*맛집|제주\s*여행|대한민국|강원|원주|정자동|오크밸리|경기도|분당|판교)/,
  /\b(seoul|busan|jeju|korea life|living in korea|wonju|gangwon|bundang|pangyo)\b/i,
];

function normalizeText(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function includesTerm(text, term) {
  const normalizedTerm = term.toLowerCase();
  if (/^[a-z0-9\s-]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(normalizedTerm);
}

function detectLanguage(text) {
  const koCount = (text.match(/[\u3131-\u318e\uac00-\ud7a3]/g) ?? []).length;
  const latinCount = (text.match(/[a-z]/gi) ?? []).length;
  if (koCount >= 8 || koCount >= latinCount * 0.25) return 'ko';
  if (latinCount > 0) return 'en';
  return 'other';
}

export function assessPostRelevance({ text, city, topic, sourceProfileHandle, sourceQuery }) {
  const compact = normalizeText(text);
  const lower = compact.toLowerCase();
  const reasons = [];
  const cityTerms = [city?.slug, city?.name_ko, city?.name_en, ...(city?.aliases ?? [])].filter(Boolean);
  const topicTerms = [topic?.label_ko, topic?.label_en, ...(topic?.keywords ?? []), ...(topic?.seed_hashtags ?? [])].filter(Boolean);
  const queryTerms = [sourceQuery, sourceProfileHandle].filter(Boolean);
  const textForSignals = lower;

  if (compact.length < 8) {
    return { accepted: false, status: 'rejected', score: 0.05, language: 'other', reasons: ['caption_too_short'] };
  }

  const hasForeignExclusion = FOREIGN_EXCLUSION_PATTERNS.some((pattern) => pattern.test(compact));
  if (hasForeignExclusion) reasons.push('foreign_geo_exclusion');

  const canadaMatches = CANADA_TERMS.filter((term) => includesTerm(textForSignals, term));
  const cityMatches = cityTerms.filter((term) => includesTerm(textForSignals, String(term)));
  const topicMatches = topicTerms.filter((term) => includesTerm(textForSignals, String(term).replace(/^#/, '')));
  const hasTrustedLocalSource = Boolean(sourceProfileHandle);
  const isCountrySegment = city?.slug === 'canada';
  const hasCanadaContext = canadaMatches.length > 0 || hasTrustedLocalSource;
  const hasCityContext = isCountrySegment || cityMatches.length > 0 || hasTrustedLocalSource;
  const hasKoreaOnlySignal = KOREA_ONLY_PATTERNS.some((pattern) => pattern.test(compact)) && canadaMatches.length === 0 && cityMatches.length === 0;

  if (!hasCanadaContext) reasons.push('missing_canada_context');
  if (!hasCityContext) reasons.push('missing_city_context');
  if (hasKoreaOnlySignal) reasons.push('korea_only_context');

  const rejectedReasons = new Set(['foreign_geo_exclusion', 'missing_canada_context', 'missing_city_context', 'korea_only_context']);
  const accepted = !reasons.some((reason) => rejectedReasons.has(reason));
  const language = detectLanguage(compact);
  const score = Math.min(
    0.95,
    0.35 +
      Math.min(canadaMatches.length, 3) * 0.12 +
      Math.min(cityMatches.length, 2) * 0.12 +
      Math.min(topicMatches.length, 2) * 0.08 +
      (hasTrustedLocalSource ? 0.1 : 0) +
      (language === 'ko' ? 0.08 : 0),
  );

  return {
    accepted,
    status: accepted ? 'candidate' : 'rejected',
    score: accepted ? score : Math.min(score, 0.2),
    language,
    reasons,
    signals: {
      canada_matches: canadaMatches,
      city_matches: cityMatches,
      topic_matches: topicMatches,
      source_terms: queryTerms,
    },
  };
}
