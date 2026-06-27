begin;

create schema if not exists extensions;
alter extension vector set schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists idx_crawl_runs_city_id
  on public.crawl_runs(city_id);

create index if not exists idx_crawl_runs_topic_id
  on public.crawl_runs(topic_id);

create index if not exists idx_crawl_queries_crawl_run_id
  on public.crawl_queries(crawl_run_id);

create index if not exists idx_crawl_queries_topic_id
  on public.crawl_queries(topic_id);

create index if not exists idx_social_posts_city_id
  on public.social_posts(city_id);

create index if not exists idx_social_posts_topic_id
  on public.social_posts(topic_id);

create index if not exists idx_social_posts_crawl_query_id
  on public.social_posts(crawl_query_id);

create index if not exists idx_post_media_post_id
  on public.post_media(post_id);

create index if not exists idx_post_hashtags_hashtag_id
  on public.post_hashtags(hashtag_id);

drop policy if exists "Authenticated read post embeddings" on public.post_embeddings;
create policy "Authenticated read post embeddings"
  on public.post_embeddings for select
  to authenticated
  using (true);

commit;
