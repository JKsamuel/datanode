begin;

insert into public.cities (slug, name_ko, name_en, province_code, aliases)
values
  ('canada', '캐나다', 'Canada', null, array['canada', '캐나다']),
  ('toronto', '토론토', 'Toronto', 'ON', array['GTA', 'toronto', '토론토']),
  ('vancouver', '밴쿠버', 'Vancouver', 'BC', array['metro vancouver', 'vancouver', '밴쿠버']),
  ('montreal', '몬트리올', 'Montreal', 'QC', array['montréal', 'mtl', '몽트리올']),
  ('calgary', '캘거리', 'Calgary', 'AB', array['yyc', 'calgary']),
  ('edmonton', '에드먼턴', 'Edmonton', 'AB', array['yeg', 'edmonton']),
  ('ottawa', '오타와', 'Ottawa', 'ON', array['ottawa']),
  ('winnipeg', '위니펙', 'Winnipeg', 'MB', array['wpg', 'winnipeg']),
  ('halifax', '핼리팩스', 'Halifax', 'NS', array['yhz', 'halifax']),
  ('victoria', '빅토리아', 'Victoria', 'BC', array['yyj', 'victoria bc']),
  ('waterloo-kitchener', '워털루/키치너', 'Waterloo/Kitchener', 'ON', array['waterloo', 'kitchener', 'kw', 'kwc']),
  ('mississauga', '미시사가', 'Mississauga', 'ON', array['mississauga', '미시사가', 'GTA']),
  ('saskatoon', '사스카툰', 'Saskatoon', 'SK', array['saskatoon', '사스카툰']),
  ('hamilton', '해밀턴', 'Hamilton', 'ON', array['hamilton', '해밀턴', 'hamilton ontario', '해밀턴 온타리오']),
  ('burlington', '벌링턴', 'Burlington', 'ON', array['burlington', '벌링턴', 'burlington ontario', '벌링턴 온타리오']),
  ('oakville', '오크빌', 'Oakville', 'ON', array['oakville', '오크빌', 'oakville ontario', '오크빌 온타리오'])
on conflict (slug) do update set
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  province_code = excluded.province_code,
  aliases = excluded.aliases;

insert into public.topics (slug, label_ko, label_en, keywords, seed_hashtags)
values
  ('rent-real-estate', '렌트/부동산', 'Rent and real estate', array['렌트', '월세', '콘도 렌트', 'room rent', 'lease'], array['캐나다렌트', '캐나다집구하기', 'canadarent']),
  ('immigration', '이민', 'Immigration', array['이민', '영주권', '워크퍼밋', 'study permit', 'PR'], array['캐나다이민', '캐나다영주권', 'canadaimmigration']),
  ('jobs', '일자리/커리어', 'Jobs and career', array['일자리', '구인', '취업', 'part time job', 'resume'], array['캐나다취업', '캐나다구인', 'canadajobs']),
  ('finance', '금융/생활비', 'Finance and cost of living', array['세금', '크레딧', '은행', 'cost of living'], array['캐나다세금', '캐나다생활비', 'canadatax']),
  ('food', '맛집/카페', 'Food and cafes', array['맛집', '카페', '브런치', 'restaurant', 'cafe'], array['캐나다맛집', '캐나다카페', 'canadafood', 'canadacafe']),
  ('events', '이벤트', 'Events', array['이벤트', '주말 행사', 'festival', 'popup'], array['캐나다이벤트', 'canadaevents', 'weekendevents']),
  ('education', '교육/유학', 'Education', array['유학', '컬리지', '대학교', 'ESL'], array['캐나다유학', 'studyincanada']),
  ('transportation', '교통/차', 'Transportation', array['교통', '운전면허', '자동차 보험', 'transit'], array['캐나다교통', 'driverlicense']),
  ('healthcare', '의료', 'Healthcare', array['병원', '워크인 클리닉', '약국', 'health card'], array['캐나다병원', 'canadahealthcare']),
  ('travel-outdoors', '여행/아웃도어', 'Travel and outdoors', array['근교 여행', '하이킹', '캠핑', 'road trip'], array['캐나다여행', 'canadatravel'])
on conflict (slug) do update set
  label_ko = excluded.label_ko,
  label_en = excluded.label_en,
  keywords = excluded.keywords,
  seed_hashtags = excluded.seed_hashtags;

commit;
