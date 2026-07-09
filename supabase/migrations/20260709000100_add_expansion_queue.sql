begin;

create table if not exists public.expansion_queue (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid not null references public.investigation_runs(id) on delete cascade,
  source_entity_id uuid references public.entities(id) on delete set null,
  parent_queue_id uuid references public.expansion_queue(id) on delete set null,
  query text not null,
  normalized_query text not null,
  platform text not null default 'all' check (platform in ('all', 'instagram', 'threads', 'tiktok', 'youtube', 'x', 'web')),
  date_range text not null default '90' check (date_range = 'all' or date_range ~ '^[0-9]+$'),
  depth integer not null default 1 check (depth >= 1),
  priority numeric(10,4) not null default 0,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'skipped')),
  reason text,
  result_run_id uuid references public.investigation_runs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_run_id, source_entity_id, normalized_query)
);

create index if not exists idx_expansion_queue_source_run
  on public.expansion_queue(source_run_id, status, priority desc, created_at desc);

create index if not exists idx_expansion_queue_source_entity
  on public.expansion_queue(source_entity_id);

create index if not exists idx_expansion_queue_result_run
  on public.expansion_queue(result_run_id);

drop trigger if exists trg_expansion_queue_updated_at on public.expansion_queue;
create trigger trg_expansion_queue_updated_at
  before update on public.expansion_queue
  for each row execute function public.set_updated_at();

alter table public.expansion_queue enable row level security;

grant select on table public.expansion_queue to anon, authenticated;
grant select, insert, update, delete on table public.expansion_queue to service_role;

drop policy if exists "Public read public expansion queue" on public.expansion_queue;
create policy "Public read public expansion queue"
  on public.expansion_queue for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.investigation_runs run
      where run.id = expansion_queue.source_run_id
        and run.is_public = true
    )
  );

commit;
