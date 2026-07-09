begin;

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('keyword', 'hashtag', 'author', 'business', 'place', 'event', 'concern', 'topic', 'city')),
  normalized_key text not null,
  label text not null,
  language text not null default 'en' check (language in ('en', 'ko', 'mixed', 'other')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, normalized_key)
);

create table if not exists public.investigation_run_entities (
  run_id uuid not null references public.investigation_runs(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  rank integer not null check (rank > 0),
  weight numeric(10,4) not null default 0,
  post_count integer not null default 0 check (post_count >= 0),
  evidence_post_ids uuid[] not null default array[]::uuid[],
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, entity_id)
);

create index if not exists idx_entities_type_key
  on public.entities(entity_type, normalized_key);

create index if not exists idx_entities_label
  on public.entities(label);

create index if not exists idx_investigation_run_entities_rank
  on public.investigation_run_entities(run_id, rank asc);

create index if not exists idx_investigation_run_entities_entity_id
  on public.investigation_run_entities(entity_id);

drop trigger if exists trg_entities_updated_at on public.entities;
create trigger trg_entities_updated_at
  before update on public.entities
  for each row execute function public.set_updated_at();

alter table public.entities enable row level security;
alter table public.investigation_run_entities enable row level security;

grant select on table public.entities, public.investigation_run_entities to anon, authenticated;
grant select, insert, update, delete on table public.entities, public.investigation_run_entities to service_role;

drop policy if exists "Public read entities" on public.entities;
create policy "Public read entities"
  on public.entities for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read public investigation run entities" on public.investigation_run_entities;
create policy "Public read public investigation run entities"
  on public.investigation_run_entities for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.investigation_runs run
      where run.id = investigation_run_entities.run_id
        and run.is_public = true
    )
  );

commit;
