begin;

create extension if not exists pgcrypto;
create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  name_en text not null,
  province_code text,
  country_code text not null default 'CA',
  aliases text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_ko text not null,
  label_en text,
  keywords text[] not null default array[]::text[],
  seed_hashtags text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crawl_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'instagram_playwright',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  city_id uuid references public.cities(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crawl_queries (
  id uuid primary key default gen_random_uuid(),
  crawl_run_id uuid references public.crawl_runs(id) on delete cascade,
  city_id uuid references public.cities(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  query text not null,
  search_kind text not null default 'keyword' check (search_kind in ('keyword', 'hashtag', 'profile', 'location')),
  source_url text,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram' check (platform in ('instagram', 'tiktok', 'youtube', 'x', 'web')),
  source_url text not null unique,
  canonical_url text,
  city_id uuid references public.cities(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  crawl_query_id uuid references public.crawl_queries(id) on delete set null,
  author_name text,
  author_handle text,
  caption text,
  language text not null default 'ko' check (language in ('ko', 'en', 'fr', 'other')),
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'rejected', 'expired')),
  score numeric(6,4) not null default 0,
  source_published_at timestamptz,
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'embed', 'unknown')),
  width integer,
  height integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique,
  normalized_tag text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.post_hashtags (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, hashtag_id)
);

create table if not exists public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_type text not null check (from_type in ('search', 'city', 'topic', 'post', 'hashtag', 'author')),
  from_key text not null,
  to_type text not null check (to_type in ('search', 'city', 'topic', 'post', 'hashtag', 'author')),
  to_key text not null,
  edge_type text not null check (edge_type in ('contains', 'matched', 'tagged', 'same_author', 'similar_caption', 'same_city', 'same_topic')),
  weight numeric(8,4) not null default 1,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (from_type, from_key, to_type, to_key, edge_type)
);

create table if not exists public.post_embeddings (
  post_id uuid primary key references public.social_posts(id) on delete cascade,
  embedding vector(1536),
  embedding_model text,
  embedded_at timestamptz not null default now()
);

create index if not exists idx_social_posts_status_city_topic
  on public.social_posts(status, city_id, topic_id, source_published_at desc nulls last, discovered_at desc);

create index if not exists idx_social_posts_author_handle
  on public.social_posts(author_handle);

create index if not exists idx_crawl_queries_city_topic
  on public.crawl_queries(city_id, topic_id, created_at desc);

create index if not exists idx_graph_edges_from
  on public.graph_edges(from_type, from_key, edge_type);

create index if not exists idx_graph_edges_to
  on public.graph_edges(to_type, to_key, edge_type);

create index if not exists idx_post_embeddings_embedding
  on public.post_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

drop trigger if exists trg_topics_updated_at on public.topics;
create trigger trg_topics_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

drop trigger if exists trg_crawl_runs_updated_at on public.crawl_runs;
create trigger trg_crawl_runs_updated_at
  before update on public.crawl_runs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_social_posts_updated_at on public.social_posts;
create trigger trg_social_posts_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

alter table public.cities enable row level security;
alter table public.topics enable row level security;
alter table public.crawl_runs enable row level security;
alter table public.crawl_queries enable row level security;
alter table public.social_posts enable row level security;
alter table public.post_media enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.graph_edges enable row level security;
alter table public.post_embeddings enable row level security;

grant select on table
  public.cities,
  public.topics,
  public.social_posts,
  public.post_media,
  public.hashtags,
  public.post_hashtags,
  public.graph_edges
to anon, authenticated;

grant select on table
  public.crawl_runs,
  public.crawl_queries
to authenticated;

drop policy if exists "Public read cities" on public.cities;
create policy "Public read cities"
  on public.cities for select
  using (true);

drop policy if exists "Public read topics" on public.topics;
create policy "Public read topics"
  on public.topics for select
  using (true);

drop policy if exists "Public read approved posts" on public.social_posts;
create policy "Public read approved posts"
  on public.social_posts for select
  using (status = 'approved');

drop policy if exists "Public read media for approved posts" on public.post_media;
create policy "Public read media for approved posts"
  on public.post_media for select
  using (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_media.post_id
        and p.status = 'approved'
    )
  );

drop policy if exists "Public read hashtags" on public.hashtags;
create policy "Public read hashtags"
  on public.hashtags for select
  using (true);

drop policy if exists "Public read hashtags for approved posts" on public.post_hashtags;
create policy "Public read hashtags for approved posts"
  on public.post_hashtags for select
  using (
    exists (
      select 1
      from public.social_posts p
      where p.id = post_hashtags.post_id
        and p.status = 'approved'
    )
  );

drop policy if exists "Public read graph edges" on public.graph_edges;
create policy "Public read graph edges"
  on public.graph_edges for select
  using (true);

drop policy if exists "Authenticated read crawl runs" on public.crawl_runs;
create policy "Authenticated read crawl runs"
  on public.crawl_runs for select
  to authenticated
  using (true);

drop policy if exists "Authenticated read crawl queries" on public.crawl_queries;
create policy "Authenticated read crawl queries"
  on public.crawl_queries for select
  to authenticated
  using (true);

commit;
