# Supabase Setup

This folder contains the database schema for the standalone DataNode signal graph prototype.

Recommended new project:

- Name: `DataNode Signal Graph`
- Region: `ca-central-1`
- Organization: confirm before creation

Apply order:

1. `migrations/20260627000100_initial_signal_graph_schema.sql`
2. `migrations/20260627000200_harden_signal_graph_schema.sql`
3. `migrations/20260627000300_allow_threads_platform.sql`
4. `migrations/20260708000100_add_investigation_runs.sql`
5. `migrations/20260708000200_add_entities_for_investigation_runs.sql`
6. `migrations/20260709000100_add_expansion_queue.sql`
7. `seed/001_initial_cities_topics.sql`
8. `seed/002_mock_social_posts.sql`
9. `seed/003_mock_graph_edges.sql`

The schema keeps the graph flexible:

- `social_posts` stores the canonical collected post.
- `hashtags` and `post_hashtags` normalize post tags.
- `graph_edges` stores derived graph relationships.
- `crawl_runs` and `crawl_queries` track Playwright collection sessions.
- `investigation_runs` stores user-facing query/date/platform run snapshots.
- `investigation_run_posts` stores ranked evidence posts for each run.
- `entities` stores extracted authors, keywords, concerns, places, events, and business/place candidates.
- `investigation_run_entities` stores ranked entity snapshots for each saved run.
- `expansion_queue` stores follow-up search candidates generated from saved run entities, worker status, and `result_run_id` links to child investigation runs.
- `post_embeddings` is ready for semantic similarity edges later.

Expansion queue lifecycle:

1. `queued`: an entity from a saved run has been selected as a follow-up search candidate.
2. `running`: the local expansion worker is creating the child investigation run.
3. `completed`: `result_run_id` points to the child run.
4. `failed`: the worker error is stored in `metadata.error`.

Planner-created rows use `reason = 'auto_entity_planner_v1'` and store the source entity rank, weight, type, and post count in `metadata`.
