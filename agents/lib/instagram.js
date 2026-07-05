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

export function buildInstagramProfileUrl(handle) {
  return `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
}

export function extractHashtags(text) {
  return Array.from(new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((tag) => tag.replace(/^#/, ''))));
}

const BROAD_KOREAN_LOCAL_TOPICS = [
  'rent-real-estate',
  'immigration',
  'jobs',
  'finance',
  'food',
  'events',
  'education',
  'transportation',
  'healthcare',
  'travel-outdoors',
];

const HOTPLACE_TOPICS = ['food', 'events', 'travel-outdoors'];
const COMMUNITY_TOPICS = ['events', 'education', 'immigration', 'jobs', 'healthcare'];

export const instagramProfileSeeds = [
  {
    handle: 'explorecanada_kr',
    citySlugs: ['canada'],
    topicSlugs: ['events', 'travel-outdoors'],
    label: '캐나다관광청 한국어 공식',
  },
  {
    handle: 'kbang.canada',
    citySlugs: ['canada'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '캐나다 한인 생활 플랫폼',
  },
  {
    handle: 'hanin.canada',
    citySlugs: ['canada'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '캐나다 한인 뉴스/생활 정보',
  },
  {
    handle: 'missycanada.ca',
    citySlugs: ['canada'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '캐나다 한인 포털',
  },
  {
    handle: 'parantours',
    citySlugs: ['canada'],
    topicSlugs: ['events', 'travel-outdoors'],
    label: '캐나다 한인 여행사',
  },
  {
    handle: 'cbm_vancouver',
    citySlugs: ['vancouver'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '밴쿠버 한인 생활 정보',
  },
  {
    handle: 'hotplace_vancouver',
    citySlugs: ['vancouver'],
    topicSlugs: HOTPLACE_TOPICS,
    label: '밴쿠버 핫플/맛집',
  },
  {
    handle: 'foodie1004_',
    citySlugs: ['vancouver'],
    topicSlugs: ['food'],
    label: '밴쿠버 맛집 리뷰',
  },
  {
    handle: 'vanpick_',
    citySlugs: ['vancouver'],
    topicSlugs: HOTPLACE_TOPICS,
    label: '밴쿠버 카페/데이트/여행',
  },
  {
    handle: 'koreansocietyofbc',
    citySlugs: ['vancouver'],
    topicSlugs: COMMUNITY_TOPICS,
    label: 'BC 밴쿠버 한인회',
  },
  {
    handle: 'cbm_toronto',
    citySlugs: ['toronto'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '토론토 한인 생활 정보',
  },
  {
    handle: 'hotplace_toronto',
    citySlugs: ['toronto'],
    topicSlugs: HOTPLACE_TOPICS,
    label: '토론토 핫플/맛집',
  },
  {
    handle: 'torontofoodiefattie',
    citySlugs: ['toronto'],
    topicSlugs: ['food'],
    label: '토론토 맛집/라이프스타일',
  },
  {
    handle: 'kcca_toronto',
    citySlugs: ['toronto'],
    topicSlugs: COMMUNITY_TOPICS,
    label: '토론토 한인회',
  },
  {
    handle: 'miga_bbq',
    citySlugs: ['mississauga', 'toronto'],
    topicSlugs: ['food', 'events'],
    label: '미시사가 한식/로컬 이벤트',
  },
  {
    handle: 'ottawa_korean',
    citySlugs: ['ottawa'],
    topicSlugs: COMMUNITY_TOPICS,
    label: '오타와 한인회',
  },
  {
    handle: 'uo.ksa',
    citySlugs: ['ottawa'],
    topicSlugs: ['events', 'education', 'jobs'],
    label: '오타와대 한인학생회',
  },
  {
    handle: 'uwaterloo_ksa',
    citySlugs: ['waterloo-kitchener'],
    topicSlugs: ['events', 'education', 'jobs'],
    label: '워털루 한인학생회',
  },
  {
    handle: 'hancatimes_',
    citySlugs: ['montreal'],
    topicSlugs: BROAD_KOREAN_LOCAL_TOPICS,
    label: '퀘벡 한인 포털',
  },
  {
    handle: 'ksmontreal',
    citySlugs: ['montreal'],
    topicSlugs: ['events', 'education'],
    label: '몬트리올 한인학교',
  },
  {
    handle: 'moinonia',
    citySlugs: ['montreal'],
    topicSlugs: ['events', 'education'],
    label: '몬트리올 한인 청년 모임',
  },
  {
    handle: 'akcse_mcgill',
    citySlugs: ['montreal'],
    topicSlugs: ['events', 'education', 'jobs'],
    label: '퀘벡 한인 학생 네트워크',
  },
  {
    handle: 'calgarykoreanculturalcentre',
    citySlugs: ['calgary'],
    topicSlugs: COMMUNITY_TOPICS,
    label: '캘거리 한인 문화센터',
  },
  {
    handle: 'kssc_ab',
    citySlugs: ['calgary', 'edmonton'],
    topicSlugs: ['immigration', 'jobs', 'finance', 'education', 'healthcare', 'events'],
    label: '알버타 한인사회복지센터',
  },
  {
    handle: 'j1eun2_table',
    citySlugs: ['calgary'],
    topicSlugs: ['food'],
    label: '캘거리 한식/로컬 푸드',
  },
  {
    handle: 'calgarykoreanorchestra',
    citySlugs: ['calgary'],
    topicSlugs: ['events'],
    label: '캘거리 한인 공연/문화',
  },
  {
    handle: 'yegkim',
    citySlugs: ['edmonton'],
    topicSlugs: ['food', 'events', 'travel-outdoors'],
    label: '에드먼턴 생활/맛집',
  },
  {
    handle: 'korean_society_of_manitoba',
    citySlugs: ['winnipeg'],
    topicSlugs: COMMUNITY_TOPICS,
    label: '매니토바 한인회',
  },
  {
    handle: 'uofmksa',
    citySlugs: ['winnipeg'],
    topicSlugs: ['events', 'education', 'jobs'],
    label: '매니토바대 한인학생회',
  },
  {
    handle: 'winnipeg_dducksarang',
    citySlugs: ['winnipeg'],
    topicSlugs: ['food'],
    label: '위니펙 한식/로컬 푸드',
  },
  {
    handle: 'st.thomas.more.parish',
    citySlugs: ['winnipeg'],
    topicSlugs: ['events'],
    label: '위니펙 한인성당',
  },
  {
    handle: 'saskatoonkoreans',
    citySlugs: ['saskatoon'],
    topicSlugs: COMMUNITY_TOPICS,
    label: '사스카툰 한인회',
  },
  {
    handle: 'saskatoon_koreanchurch',
    citySlugs: ['saskatoon'],
    topicSlugs: ['events', 'education'],
    label: '사스카툰 한인교회',
  },
  {
    handle: 'saskatoon_vision_korean_church',
    citySlugs: ['saskatoon'],
    topicSlugs: ['events', 'education'],
    label: '사스카툰 비전 한인교회',
  },
  {
    handle: 'halikorean',
    citySlugs: ['halifax'],
    topicSlugs: ['food', 'events', 'travel-outdoors'],
    label: '핼리팩스 한인/한식 정보',
  },
  {
    handle: 'hkc_teenager',
    citySlugs: ['halifax'],
    topicSlugs: ['events', 'education'],
    label: '핼리팩스 한인 커뮤니티',
  },
  {
    handle: 'beaute_lia_hairsalon',
    citySlugs: ['halifax'],
    topicSlugs: ['jobs', 'events'],
    label: '핼리팩스 한인 비즈니스',
  },
];

export function buildInstagramProfileQueries(city, topic, limit = 4) {
  return instagramProfileSeeds
    .filter((seed) => seed.citySlugs.includes(city.slug) && seed.topicSlugs.includes(topic.slug))
    .slice(0, limit)
    .map((seed) => ({
      query: `@${seed.handle}`,
      searchKind: 'profile',
      url: buildInstagramProfileUrl(seed.handle),
      profileHandle: seed.handle,
      profileLabel: seed.label,
    }));
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
  const profileQueries = buildInstagramProfileQueries(city, topic, Math.max(2, Math.ceil(limit / 2)));
  const hashtagBudget = Math.max(1, Math.min(2, limit - profileQueries.length));
  const baseQueries = [...hashtagQueries.slice(0, hashtagBudget), ...profileQueries, ...keywordQueries];
  return baseQueries.slice(0, limit);
}
