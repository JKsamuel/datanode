# DataNode

DataNode is an entity-graph intelligence platform for social media signals.

It is not a simple social search UI, crawler, or city directory. The product goal is to let a user define a search scope, collect social posts within that scope, extract entities and repeated signals, and visualize the result as an expandable graph.

The first prototype uses Canadian cities such as Toronto and Hamilton, but the long-term product is not limited to cities. A city is just one useful search scope.

## Product Direction

The intended user flow is:

1. A user enters a keyword, city, business category, issue, or phrase.
2. The user selects a date range, such as the last 30 days, 3 months, 6 months, or a custom period.
3. DataNode collects relevant social posts from sources such as Instagram and Threads.
4. The system extracts entities from those posts:
   - keywords
   - hashtags
   - authors
   - businesses
   - places
   - neighborhoods
   - repeated questions
   - recurring complaints
   - event names
   - campaign or advertising signals
5. Extracted entities become graph nodes.
6. Relationships become graph edges.
7. Newly discovered entities can become follow-up search seeds.
8. The user explores a visual entity graph instead of scrolling through platform-ranked search results.

The core experience should feel like social deep research rendered as an entity graph.

## Core Philosophy

Social platforms show results through their own ranking algorithms. DataNode should instead help users infer what is happening inside a search scope by building a relationship map from collected evidence.

The system should answer questions like:

- What are people in this city talking about?
- What topics are repeatedly appearing?
- Which businesses are advertising or appearing often?
- Which places, neighborhoods, or venues are becoming visible?
- What complaints or questions keep coming up?
- Which keywords lead to new clusters of posts?
- What changed during a specific time period?
- Which accounts or businesses are central in the graph?

The product should not force users to start with fixed categories such as food, rent, immigration, or jobs. Those categories can remain internal collection seeds, but the surface experience should be:

```text
query + date range -> social collection -> entity extraction -> relationship graph -> expandable exploration
```

## Visual Direction

The frontend should look and behave like an intelligence analysis console, not a card dashboard.

The graph should prioritize:

- small entity nodes
- thin relationship lines
- a central scope or query node
- surrounding keyword, post, author, business, and place nodes
- dense but readable network structure
- right-side inspector panels for evidence
- graph-first exploration

Avoid making the main graph look like:

- a marketing landing page
- a card grid
- a generic dashboard
- a mindmap made of large text boxes
- a category browsing UI

The graph canvas should be the primary object. Post text, captions, URLs, and evidence should appear in side panels after selecting a node.

## Business Model

DataNode can become a social intelligence product for people who need to understand local or niche market behavior without manually scrolling through social platforms.

Potential customer groups:

- local business owners
- marketers and agencies
- real estate operators
- event organizers
- community media operators
- local news or newsletter teams
- franchise operators
- immigration, education, and settlement services
- city-focused creators
- researchers tracking public sentiment

Potential use cases:

- Discover what people in Hamilton have discussed in the last 3 months.
- Identify which restaurants or cafes are heavily promoted in Toronto.
- Track emerging rental complaints in Waterloo.
- Find recurring questions among Korean-speaking newcomers in Canada.
- Detect event, popup, and local business activity in a region.
- Compare interest clusters across cities.
- Generate leads for businesses that are actively advertising or appearing in social conversations.

Possible pricing:

- Free: limited searches, limited history, mock or small graph size.
- Pro: saved searches, date range analysis, export, larger graphs.
- Agency: multiple cities/clients, scheduled monitoring, reporting.
- Enterprise/API: custom data pipelines, private dashboards, data export.

## Data Model Direction

The database should evolve toward search sessions and entity graphs.

Important concepts:

- `investigation_runs`: user-defined query, date range, platforms, status, and graph scope.
- `investigation_run_posts`: ranked post evidence attached to one investigation run.
- `crawl_queries`: actual platform queries generated from the search session.
- `social_posts`: canonical collected posts, reels, and threads.
- `entities`: extracted keywords, hashtags, authors, concerns, events, businesses, places, and topics.
- `investigation_run_entities`: ranked entity snapshots and evidence post links for each saved investigation run.
- `expansion_queue`: follow-up search candidates generated from promising entities, plus worker status and child run links.
- `entity_edges` or expanded `graph_edges`: future generalized relationships between posts and entities.
- `graph_snapshots`: cached graph state for a search session.

The current schema already has `social_posts`, `hashtags`, `post_hashtags`, and `graph_edges`. These should be treated as the foundation, not the final model.

## Agent Direction

The agents should not remain simple `city x topic` crawlers.

The target agent loop is:

1. Start with a user search scope:
   - query
   - date range
   - platform list
   - optional city or region
2. Generate initial seed queries.
3. Collect posts through platform-specific collectors.
4. Enrich posts:
   - clean text
   - detect language
   - extract hashtags
   - extract keywords
   - extract business/place/account signals
   - extract publish timestamps when available
5. Build graph edges:
   - search -> post
   - post -> keyword
   - post -> hashtag
   - post -> author
   - post -> business
   - post -> place
   - post -> similar post
   - keyword -> related keyword
6. Rank expansion candidates.
7. Push high-value entities into an expansion queue.
8. Execute queued expansion items as child investigation runs.
9. Repeat within a controlled budget.

The agent system should work like social deep research:

```text
initial query -> collect -> extract -> graph -> find promising entities -> collect again -> expand graph
```

Current expansion-worker behavior:

- The UI can queue an extracted entity from a saved investigation run.
- The planner can suggest expansion candidates from the highest-value extracted entities in a saved run.
- The worker consumes a queued item and creates a child `investigation_runs` record.
- The queue item is updated from `queued` to `running` to `completed` or `failed`.
- Completed queue items store `result_run_id`, so the UI can open the child graph.
- Child runs store parent context in metadata: parent run id, source queue id, source entity id, depth, and expansion reason.
- The UI reads run lineage from parent metadata and completed expansion queue rows, then renders the active investigation path and completed child branches.

## Current Agent Notes

Current collectors still use topic seeds internally. That is acceptable only as a temporary mechanism for broad coverage. The product surface should not expose fixed Signal Class filters as the main experience.

Collectors should increasingly become:

- scope-aware
- date-range-aware
- keyword-expansion-aware
- entity-graph-aware

Instagram rule:

Do not navigate directly to `/p/...` or `/reel/...` URLs as the primary collection path. Instagram often blocks direct post navigation. Use:

1. Search grid.
2. Click visible card.
3. Extract signal from opened state.
4. Close or go back.
5. Continue.

Threads rule:

Threads is useful for concerns, questions, recommendations, and trend signals. It should be collected through search result cards and treated as text-first.

## Date Range Requirement

Date range is a core product requirement.

For early collectors, publish dates may be missing or unreliable. Still, the system should track:

- `source_published_at` when available
- `discovered_at`
- collection run timestamp
- search session date range

When exact publish dates are unavailable, the UI and reports must clearly distinguish:

- posts confirmed within range
- posts discovered within range
- posts with unknown publish date

## Frontend Direction

The frontend should become:

```text
query input + date range + platform selectors
-> run analysis
-> entity graph
-> node inspector
-> expansion controls
```

Graph nodes should represent:

- search/session
- post
- keyword
- hashtag
- author
- business
- place
- date cluster
- platform

The main canvas should not show long captions inside nodes. Nodes should remain compact. Captions and evidence belong in the inspector.

## Development Plan

### Phase 1: Hamilton Data

Goal: collect enough Hamilton data to make the graph meaningful.

Tasks:

- Add Hamilton to all local fallback city lists.
- Run collectors for Hamilton using broad city-level seed topics.
- Capture posts from the last 3 months when publish dates are available.
- Enrich candidates and approve relevant posts.
- Build graph edges.
- Verify Hamilton appears as a useful entity graph.

### Phase 2: Investigation Run Model

Goal: stop treating city/topic as the only unit of work.

Tasks:

- Add `investigation_runs`.
- Store user query, date range, platform, status, and graph counts.
- Link ranked posts to each run through `investigation_run_posts`.
- Support arbitrary keyword-based investigation runs.
- Keep write access server-side; never expose the service role key in browser code.

### Phase 3: Entity Extraction

Goal: move beyond hashtags.

Tasks:

- Extract businesses and account names.
- Extract places and neighborhoods.
- Extract repeated phrases and concerns.
- Add confidence scores and evidence snippets.

### Phase 4: Expansion Queue

Goal: make the graph grow by following discovered entities.

Tasks:

- Rank high-value keywords/entities.
- Generate follow-up queries.
- Track expansion depth.
- Prevent runaway duplicate searches.

### Phase 5: Intelligence Views

Goal: help users infer meaning from the graph.

Tasks:

- Top entities by frequency.
- Fast-rising keywords.
- Most active businesses/accounts.
- Repeated questions or complaints.
- Date-based trend view.
- Exportable report.

## Working Prompt For Future Agents

Use this prompt when continuing the project:

```text
You are working on DataNode, an entity-graph social intelligence platform.

Do not treat this as a simple social search app, city directory, or card dashboard.

The product goal is:
Given a user-defined query and date range, collect social media posts, extract entities, build relationships, and visualize the result as an expandable entity graph.

The first prototype uses Canadian cities such as Hamilton and Toronto, but the long-term model must support arbitrary user queries and periods.

Core philosophy:
- The graph should reveal what people are talking about, what businesses are active, what places or issues are recurring, and which entities lead to further discovery.
- Fixed categories such as food, rent, jobs, or immigration may be used internally as seed topics, but they should not dominate the user-facing product.
- The UI should feel like a Palantir-style intelligence graph: small nodes, thin edges, dense relationships, and evidence in side panels.
- The main canvas should not be a grid of cards.

Agent direction:
- Collect broadly from the user's scope.
- Extract keywords, hashtags, authors, businesses, places, and repeated concerns.
- Store graph edges.
- Use discovered entities as follow-up search seeds.
- Respect date ranges and clearly label unknown publish dates.

When making changes, prioritize:
1. Data collection quality.
2. Entity extraction.
3. Graph edge correctness.
4. Search-session and date-range support.
5. Dense graph visualization.
6. Evidence inspection and explainability.

Avoid:
- hard-coding the product around one city
- over-relying on topic filters
- making the graph look like large cards
- changing unrelated Revue project files
- printing or exposing service role keys
```

## Local Development

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

`npm run dev` starts the local Node server. It serves the frontend and exposes `/api/investigation-runs` plus `/api/expansion-queue`, which record query/date/platform runs and graph expansion work into Supabase using the server-side service role key.

The app also reads recent saved runs from `/api/investigation-runs`. Selecting a saved run loads its ranked `investigation_run_posts` snapshot and uses that evidence set for both Feed and Entity Graph views.

Saved runs also include extracted `investigation_run_entities`. The current extractor is rule-based and captures authors, repeated concerns, event/place phrases, hashtags, and keywords. These entities render as graph nodes and become expansion terms for follow-up searches.

Entity inspector actions can queue follow-up searches into `expansion_queue`. The expansion planner can also suggest candidates automatically from the strongest entities in a saved run. The expansion worker consumes queued items and creates child investigation runs linked by `result_run_id`. The Investigation Path panel shows parent runs and completed child branches so the exploration does not become a flat recent-run list.

Create an investigation run from the CLI:

```bash
npm run agent:investigation -- --query=Hamilton --date-range=90 --platform=all
```

Suggest expansion candidates for a saved run:

```bash
npm run agent:plan -- --run-id=<investigation-run-id> --max-items=8
```

Run the next queued graph expansion:

```bash
npm run agent:expand -- --limit=1
```

Run graph builder:

```bash
npm run agent:graph
```

Dry-run collectors:

```bash
npm run agent:run -- --dry-run --platforms=instagram,threads --cities=hamilton --queries=3 --per-query=3
```

Run Hamilton collection when credentials and browser session are ready:

```bash
npm run agent:run -- --platforms=instagram,threads --cities=hamilton --queries=8 --per-query=6
```

Live writes require `.env` with Supabase credentials. Never commit or print service role keys.
