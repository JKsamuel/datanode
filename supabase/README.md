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
6. `seed/001_initial_cities_topics.sql`
7. `seed/002_mock_social_posts.sql`
8. `seed/003_mock_graph_edges.sql`

The schema keeps the graph flexible:

- `social_posts` stores the canonical collected post.
- `hashtags` and `post_hashtags` normalize post tags.
- `graph_edges` stores derived graph relationships.
- `crawl_runs` and `crawl_queries` track Playwright collection sessions.
- `investigation_runs` stores user-facing query/date/platform run snapshots.
- `investigation_run_posts` stores ranked evidence posts for each run.
- `entities` stores extracted authors, keywords, concerns, places, events, and business/place candidates.
- `investigation_run_entities` stores ranked entity snapshots for each saved run.
- `post_embeddings` is ready for semantic similarity edges later.
