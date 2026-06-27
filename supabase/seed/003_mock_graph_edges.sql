begin;

with toronto as (
  select id::text as city_key from public.cities where slug = 'toronto'
),
food as (
  select id::text as topic_key from public.topics where slug = 'food'
),
approved_posts as (
  select id::text as post_key, author_handle
  from public.social_posts
  where status = 'approved'
),
post_tags as (
  select ph.post_id::text as post_key, h.normalized_tag as tag_key
  from public.post_hashtags ph
  join public.hashtags h on h.id = ph.hashtag_id
)
insert into public.graph_edges (from_type, from_key, to_type, to_key, edge_type, weight, evidence)
select 'search', 'toronto:food', 'city', toronto.city_key, 'contains', 1, '{"source":"seed"}'::jsonb
from toronto
union all
select 'search', 'toronto:food', 'topic', food.topic_key, 'contains', 1, '{"source":"seed"}'::jsonb
from food
union all
select 'search', 'toronto:food', 'post', post_key, 'matched', 0.8, jsonb_build_object('source', 'seed', 'author_handle', author_handle)
from approved_posts
union all
select 'post', post_key, 'hashtag', tag_key, 'tagged', 1, '{"source":"seed"}'::jsonb
from post_tags
on conflict (from_type, from_key, to_type, to_key, edge_type) do update set
  weight = excluded.weight,
  evidence = excluded.evidence;

commit;
