begin;

with toronto as (
  select id as city_id from public.cities where slug = 'toronto'
),
food as (
  select id as topic_id from public.topics where slug = 'food'
),
posts as (
  insert into public.social_posts (
    platform,
    source_url,
    canonical_url,
    city_id,
    topic_id,
    author_handle,
    caption,
    language,
    status,
    score,
    source_published_at,
    metadata
  )
  select
    'instagram',
    item.source_url,
    item.source_url,
    toronto.city_id,
    food.topic_id,
    item.author_handle,
    item.caption,
    'ko',
    'approved',
    item.score,
    item.source_published_at::timestamptz,
    jsonb_build_object('query', item.query)
  from toronto, food,
  (
    values
      ('https://www.instagram.com/explore/tags/torontoramen/', 'toronto.foodmap', '다운타운 라멘, 웨이팅 있는 일본식 라멘집, 늦은 저녁에도 인기.', '#토론토맛집', 0.86, '2026-06-18T12:00:00Z'),
      ('https://www.instagram.com/explore/tags/torontobrunch/', 'queenwest.table', 'Queen West 브런치 카페. 주말 예약과 디저트 메뉴 언급이 많은 포스트.', 'Toronto brunch', 0.78, '2026-06-20T12:00:00Z'),
      ('https://www.instagram.com/explore/tags/koreanbbq/', 'kfood.to', 'North York 한식 고깃집. 단체 모임, 주차, 반찬 키워드와 연결.', '토론토 한식', 0.82, '2026-06-21T12:00:00Z'),
      ('https://www.instagram.com/explore/tags/torontodessert/', 'sweetspots.ca', '디저트와 베이커리 중심 포스트. 카페 투어 노드로 확장 가능.', '#캐나다디저트', 0.74, '2026-06-22T12:00:00Z')
  ) as item(source_url, author_handle, caption, query, score, source_published_at)
  on conflict (source_url) do update set
    author_handle = excluded.author_handle,
    caption = excluded.caption,
    status = excluded.status,
    score = excluded.score,
    metadata = excluded.metadata
  returning id, source_url
)
insert into public.hashtags (tag, normalized_tag)
values
  ('토론토맛집', '토론토맛집'),
  ('torontoramen', 'torontoramen'),
  ('downtown', 'downtown'),
  ('ramen', 'ramen'),
  ('torontobrunch', 'torontobrunch'),
  ('queenwest', 'queenwest'),
  ('cafe', 'cafe'),
  ('dessert', 'dessert'),
  ('한식맛집', '한식맛집'),
  ('koreanbbq', 'koreanbbq'),
  ('northyork', 'northyork'),
  ('torontodessert', 'torontodessert'),
  ('bakery', 'bakery'),
  ('캐나다디저트', '캐나다디저트')
on conflict (normalized_tag) do nothing;

with post_tags as (
  select p.id as post_id, unnest(tags.tags) as normalized_tag
  from public.social_posts p
  join (
    values
      ('https://www.instagram.com/explore/tags/torontoramen/', array['토론토맛집', 'torontoramen', 'downtown', 'ramen']),
      ('https://www.instagram.com/explore/tags/torontobrunch/', array['torontobrunch', 'queenwest', 'cafe', 'dessert']),
      ('https://www.instagram.com/explore/tags/koreanbbq/', array['한식맛집', 'koreanbbq', 'northyork', '토론토맛집']),
      ('https://www.instagram.com/explore/tags/torontodessert/', array['torontodessert', 'bakery', 'cafe', '캐나다디저트'])
  ) as tags(source_url, tags)
    on tags.source_url = p.source_url
)
insert into public.post_hashtags (post_id, hashtag_id)
select post_tags.post_id, h.id
from post_tags
join public.hashtags h
  on h.normalized_tag = post_tags.normalized_tag
on conflict do nothing;

commit;
