# Supabase Setup

This folder contains the database schema for the standalone DataNode signal graph prototype.

Recommended new project:

- Name: `DataNode Signal Graph`
- Region: `ca-central-1`
- Organization: confirm before creation

Apply order:

1. `migrations/20260627000100_initial_signal_graph_schema.sql`
2. `seed/001_initial_cities_topics.sql`
3. `seed/002_mock_social_posts.sql`

The schema keeps the graph flexible:

- `social_posts` stores the canonical collected post.
- `hashtags` and `post_hashtags` normalize post tags.
- `graph_edges` stores derived graph relationships.
- `crawl_runs` and `crawl_queries` track Playwright collection sessions.
- `post_embeddings` is ready for semantic similarity edges later.
