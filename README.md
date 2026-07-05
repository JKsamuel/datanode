# DataNode Social Graph

Standalone prototype for exploring Instagram/social curation data as an entity graph. This project is intentionally isolated from the Revue project.

## App

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

The browser app reads approved posts and graph edges from the DataNode Supabase project, then falls back to local mock data if the API is unavailable.

## Agent Structure

The collection pipeline is split into small agents so city/topic work can run in parallel:

1. `instagram-city-agent`
   - Takes city and topic slugs.
   - Builds Instagram keyword, hashtag, and curated profile searches.
   - Opens the search grid and clicks post/reel cards in-place.
   - Extracts post signals from the opened card state.
   - Writes candidate `social_posts` and `crawl_queries`.
   - Uses Korean-leaning Canada/local seed profiles from `agents/lib/instagram.js` when a profile matches the active city and topic.

2. `threads-city-agent`
   - Takes city and topic slugs.
   - Builds Threads keyword searches around local questions, concerns, reviews, and recommendations.
   - Opens Threads search results and clicks visible post cards.
   - Extracts text, author, URL, timestamp, tags, and media hints.
   - Writes candidate `social_posts` with `platform = 'threads'`.

3. `enrichment-agent`
   - Visits candidate or approved posts.
   - Extracts captions, publish timestamps, and hashtags.
   - Promotes only Canada-relevant candidates to approved posts after enrichment.
   - Rejects posts with foreign-only geography such as UK London or Australia, Korea-only lifestyle context, or missing Canada/city context.
   - Live direct post navigation is blocked by default; use the grid-click collector path for Instagram.

4. `graph-builder-agent`
   - Reads approved posts and hashtags.
   - Rebuilds post, author, city, topic, and hashtag edges.

5. `run-city-agents`
   - Orchestrates multiple city/topic collector jobs with a concurrency limit.
   - Runs the graph builder after collection.

Scheduling is intentionally left out for now. Later, this can be triggered by cron, Supabase Edge Functions, GitHub Actions, or a hosted worker.

## Commands

Read-only smoke test:

```bash
npm run agent:smoke
```

Run one dry collector segment:

```bash
npm run agent:collector -- --dry-run --city=toronto --topic=food
```

Run one dry Threads collector segment:

```bash
npm run agent:threads -- --dry-run --city=toronto --topic=rent-real-estate
```

Run a parallel dry collection batch:

```bash
npm run agent:run -- --dry-run --cities=toronto,vancouver --topics=food,rent-real-estate --concurrency=2
```

Run Instagram and Threads collectors together:

```bash
npm run agent:run -- --dry-run --platforms=instagram,threads --cities=toronto,vancouver --topics=food,rent-real-estate
```

Run a parallel dry Threads collection batch:

```bash
npm run agent:threads:smoke
```

Run country-wide Korean Canada sources:

```bash
npm run agent:collector -- --dry-run --city=canada --topic=travel-outdoors
```

Live Playwright collection requires dependencies and a private service-role key:

```bash
npm install
cp .env.example .env
```

Then add `SUPABASE_SERVICE_ROLE_KEY` to `.env`. Live write commands intentionally fail without that key.

## Instagram Collection Rule

Do not navigate directly to `/p/...` or `/reel/...` URLs during collection. Instagram often blocks or degrades direct post navigation. The collector should:

1. Open the keyword or hashtag search grid.
2. Click a visible post/reel card.
3. Extract URL, caption, author, timestamp, and hashtags from the opened state.
4. Close the modal or go back to the grid.
5. Continue with the next grid card.

Permalinks are stored after extraction, but they are not the primary navigation path for collection.

## Threads Collection Rule

Threads collection is text-first. Use it for city/topic concerns, questions, recommendations, and trend signals. The collector should:

1. Build city/topic keyword searches.
2. Open Threads search results.
3. Click visible post cards instead of relying only on collected hrefs.
4. Extract URL, text, author, timestamp, tags, and media hints.
5. Store candidates as `social_posts.platform = 'threads'`.
