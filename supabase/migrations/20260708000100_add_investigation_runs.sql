begin;

create table if not exists public.investigation_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  query text not null,
  normalized_query text not null,
  city_id uuid references public.cities(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  crawl_run_id uuid references public.crawl_runs(id) on delete set null,
  platform text not null default 'all' check (platform in ('all', 'instagram', 'threads', 'tiktok', 'youtube', 'x', 'web')),
  date_range text not null default '90' check (date_range = 'all' or date_range ~ '^[0-9]+$'),
  window_start timestamptz,
  window_end timestamptz not null default now(),
  status text not null default 'completed' check (status in ('queued', 'running', 'completed', 'failed')),
  source text not null default 'datanode_ui',
  result_count integer not null default 0 check (result_count >= 0),
  graph_node_count integer not null default 0 check (graph_node_count >= 0),
  graph_edge_count integer not null default 0 check (graph_edge_count >= 0),
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investigation_run_posts (
  run_id uuid not null references public.investigation_runs(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  rank integer not null check (rank > 0),
  relevance_score numeric(8,4) not null default 0,
  match_reasons text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  primary key (run_id, post_id)
);

create index if not exists idx_investigation_runs_created_at
  on public.investigation_runs(created_at desc);

create index if not exists idx_investigation_runs_scope
  on public.investigation_runs(normalized_query, platform, date_range, window_end desc);

create index if not exists idx_investigation_runs_city_topic
  on public.investigation_runs(city_id, topic_id, created_at desc);

create index if not exists idx_investigation_run_posts_post_id
  on public.investigation_run_posts(post_id);

create index if not exists idx_investigation_run_posts_rank
  on public.investigation_run_posts(run_id, rank asc);

drop trigger if exists trg_investigation_runs_updated_at on public.investigation_runs;
create trigger trg_investigation_runs_updated_at
  before update on public.investigation_runs
  for each row execute function public.set_updated_at();

alter table public.investigation_runs enable row level security;
alter table public.investigation_run_posts enable row level security;

grant select on table public.investigation_runs, public.investigation_run_posts to anon, authenticated;
grant select, insert, update, delete on table public.investigation_runs, public.investigation_run_posts to service_role;

drop policy if exists "Public read public investigation runs" on public.investigation_runs;
create policy "Public read public investigation runs"
  on public.investigation_runs for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Public read public investigation run posts" on public.investigation_run_posts;
create policy "Public read public investigation run posts"
  on public.investigation_run_posts for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.investigation_runs run
      where run.id = investigation_run_posts.run_id
        and run.is_public = true
    )
  );

commit;
