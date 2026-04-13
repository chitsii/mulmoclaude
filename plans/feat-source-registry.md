# Plan: information source registry + daily aggregation + on-demand research

Tracks: #166 (the 10-use-case issue)
Supersedes / absorbs: #140 (news batch processing — its scope is covered by this plan's UC-1)

## Scope for this spec — phase 1 only

Phase 1 deliberately excludes auth-requiring sources. Authenticated sources (X / Twitter, private RSS, GitHub with a token, paid APIs) add credential management, token refresh, rate-limit policies, and per-source secrets handling — worth their own phase. The phase-1 surface is:

- **RSS / Atom feeds** (public)
- **Public GitHub REST API** — releases, issues, PRs. Unauthenticated is 60 req/h/IP, plenty for a personal workspace.
- **arbitrary web pages** — fetched via Claude's built-in `web_fetch` tool (not our server). Respects robots.txt because Anthropic's crawler does.
- **web search** — Claude's `web_search` tool for "find news about company X" kind of queries.

Explicit non-goals for phase 1: X, private feeds, Slack / Discord bots, email digests, OAuth, API-key rotation.

## Who fetches?

| Source type | Fetcher | Rationale |
|---|---|---|
| RSS / Atom | **Server-side** | Stable XML format, no LLM needed. Deterministic daily schedule. Cheap (no tokens). |
| GitHub Releases / Issues / PRs | **Server-side** | Typed REST JSON. No LLM value-add in fetching. |
| arXiv / npm / other public REST JSON | **Server-side** | Same. |
| Arbitrary web pages | **Claude-side** (`web_fetch`) | Anthropic's crawler handles robots / caching / user-agent. We don't reimplement browser-grade HTML parsing. |
| Ad-hoc search ("news about company X") | **Claude-side** (`web_search`) | Search API access already built into Claude. |

This split is expressed as a `fetcher` field on each source:

```yaml
fetcher:
  kind: rss          # "rss" | "github-releases" | "github-issues" | "web-fetch" | "web-search" | "arxiv"
  # ... type-specific params
```

The server-side `fetcher.kind` values map to `server/sources/fetchers/*.ts` modules implementing a common `SourceFetcher` interface. Claude-side ones are triggered by emitting a prompt with the right tool call rather than running HTTP ourselves. Auth-requiring fetchers in phase 3 (e.g. `fetcher.kind: "github-authed"`) just register a new module with the same interface — no framework changes.

## Crawl etiquette (for server-side fetching)

1. **User-Agent**: `MulmoClaude-SourceBot/1.0 (+https://github.com/receptron/mulmoclaude)` on every outbound request. Site operators can identify and contact.
2. **robots.txt check** — before fetching any URL whose host we haven't checked in the last 24h, fetch `/robots.txt` and cache the parsed rules. Respect `User-agent: *` entries.
3. **Rate limit** — at most 1 request / source / 60s, configurable. No parallel bursts to the same host.
4. **Respect `Crawl-delay`** from robots.txt if present.
5. **Source-registration preflight** — when the user adds a new web source, run the robots.txt check synchronously and refuse (with a clear message) if the path is disallowed. Offer alternatives: "try the RSS feed at /feed", "use `fetcher.kind: web-search` instead which goes through Claude's approved crawler".
6. **5xx / rate-limit backoff** — exponential backoff per host, persisted to the state file so restarts don't hammer.

Claude-side fetchers don't need our robots checking — the `web_fetch` / `web_search` tools are Anthropic-operated and handle it.

## Workspace layout — sources as files

Matches the `wiki/pages/*.md` pattern: one file per source, YAML frontmatter + optional markdown body.

```
workspace/
  sources/
    <slug>.md                    ← one file per source
    _index.md                    ← auto-generated index grouped by category
    _state/
      <slug>.json                ← fetcher state per source (last cursor, etag, last-fetched-at, failure count)
      robots/<host>.txt          ← cached robots.txt per host
  news/
    daily/
      YYYY/MM/DD.md              ← daily aggregated summary
    archive/
      <slug>/YYYY-MM.md          ← per-source archive of older items
```

### Source file format

```markdown
---
slug: hn-front-page
title: Hacker News front page
url: https://news.ycombinator.com/rss
fetcher:
  kind: rss
schedule: daily   # "daily" | "hourly" | "weekly" | "on-demand"
categories: [tech-news, general, english]
max_items_per_fetch: 30
added_at: 2026-04-13T09:00:00Z
# Auto-populated by Claude at registration time; user-editable.
---

# Notes

Why registered: general tech news pulse, catch launches.
Override categories: yes (bump `ai` to primary when I have time).
```

The YAML frontmatter is the machine-readable part. The markdown body below `# Notes` is free-form user annotation — Claude reads it for context when summarizing ("this user cares about AI launches on HN").

### Why per-file over a single `registry.yml`?

- One-file-per-source matches the existing wiki convention. Claude can edit a single source without touching the global registry.
- Grep-friendly: `grep -l 'tech-news' sources/*.md` for all tech sources.
- Git diffs stay small and meaningful when Claude tweaks categories or adds notes to one source.
- Auto-categorization rewrites one file, not a 50-source global YAML.

### State vs config split

`sources/<slug>.md` is **config** (user-editable, committed, git-tracked). `sources/_state/<slug>.json` is **runtime state** (last cursor, etag, mtime, backoff timer). State should generally NOT be in git — add `sources/_state/` to `.gitignore` at phase-1-ship time.

## Auto-categorization

At source registration (via the `manageSource` plugin's `register` action):

1. Fetch a tiny sample — RSS: top 3 items; web page: head + title; GitHub repo: `description` + top 3 releases.
2. Spawn a Claude CLI call (reusing the `chat-index/summarizer.ts` pattern — `claude --model haiku --output-format json --json-schema ...`) with a prompt:

   > Classify this information source into 1–5 categories from this fixed taxonomy: `[tech-news, business-news, ai, security, devops, frontend, backend, ml-research, dependencies, product-updates, japanese, english, papers, general, startup, personal]`. Output strict JSON: `{ categories: string[], rationale: string }`.

3. Write the categories into the source file's YAML frontmatter. Write `rationale` into the body as a comment for human review.

Users can override categories manually — the next daily run reads the file as-is. A separate `manageSource recategorize` action re-runs the classifier on demand (e.g. after editing the taxonomy).

**Taxonomy is a fixed enum.** Free-form LLM-generated tags balloon into synonyms (`"artificial-intelligence"` vs `"ai"`) and make filtering useless. The enum lives in `src/plugins/manageSource/taxonomy.ts` and is version-controlled.

## Daily aggregation pipeline

Piggyback on the existing `server/task-manager/` daily schedule (same rhythm as `server/journal/`):

```
08:00 local time (configurable)
  ↓
maybeAggregateSources({ activeSessionIds })  ← fire-and-forget from task-manager
  ↓
[Phase 1] fetch
  ↓ for each source with schedule=daily and not on backoff:
  ↓   - route by fetcher.kind
  ↓   - server-side fetchers: run directly (respect robots / rate limit / state)
  ↓   - Claude-side fetchers: enqueue a single agent pass that collects all of them in one session
  ↓
[Phase 2] normalize
  ↓ every source produces a list of `SourceItem { id, title, url, publishedAt, summary?, content?, categories }`
  ↓ write raw items to `workspace/news/archive/<slug>/YYYY-MM.md` (append-only)
  ↓
[Phase 3] summarize
  ↓ pass all new items to Claude (one call) with a prompt:
  ↓   "Produce a daily brief. Group by category. Max 10 items per group.
  ↓    For each item: 1-line summary, link, source."
  ↓
[Phase 4] write
  ↓ `workspace/news/daily/YYYY/MM/DD.md`
  ↓ dashboard widget (#143) picks this up
  ↓ if any item tagged `severity: critical` (e.g. from security advisory), enqueue a notification (#142 / #144)
```

The pipeline is invoked by a single public entry `maybeAggregateSources(deps)` that mirrors `maybeRunJournal` / `maybeIndexSession`. Same gates apply: active-session guard, in-process lock, `ClaudeCliNotFoundError` → disable-for-lifetime.

## On-demand research

Triggered when the user says "調べて" during a conversation. Claude decides to call `searchSources({ query, categoryFilter? })` which:

1. Enumerates all registered sources whose categories match the filter.
2. For `fetcher.kind: web-search` sources → Claude uses its `web_search` tool directly.
3. For RSS / GitHub sources → server fetches recent items filtered by query text.
4. Returns aggregated hits. Claude synthesizes the answer and optionally writes it to `wiki/pages/<topic>.md`.

This is the **on-demand** path to UC-3 / UC-4 / UC-5 from #166. Implementation lands after the daily pipeline is stable.

## Plugin interface — `manageSource`

New plugin at `src/plugins/manageSource/`. Actions:

| Action | Params | Effect |
|---|---|---|
| `register` | `url`, optional `fetcher.kind` override, optional `categories` override | Detect source type, run robots preflight, auto-categorize, write the source file |
| `list` | optional `category` filter | Return all registered sources |
| `remove` | `slug` | Delete the source file and its state |
| `recategorize` | `slug` | Re-run the auto-categorizer |
| `fetch` | `slug` | One-shot on-demand fetch outside the schedule |
| `test` | `url` | Dry-run: robots check + fetcher selection + sample fetch, NO write |

The `test` action is the debugging surface: when a user asks "can I register this site?" Claude can run `test` first without polluting the workspace.

## File layout (new code)

```
server/sources/
  index.ts              ← maybeAggregateSources entry, lock + sentinel
  registry.ts           ← read / write per-source files + state
  taxonomy.ts           ← fixed category enum (shared with src/)
  robots.ts             ← robots.txt fetch + cache + rule evaluation
  pipeline.ts           ← fetch → normalize → summarize → write
  classifier.ts         ← auto-categorize via Claude CLI (reuses chat-index/summarizer patterns)
  types.ts              ← Source / SourceItem / SourceState types
  fetchers/
    index.ts            ← registry of SourceFetcher by kind
    rss.ts              ← RSS / Atom fetcher
    githubReleases.ts   ← GitHub /releases endpoint
    githubIssues.ts     ← /issues and /pulls
    arxiv.ts            ← arXiv API
    webFetch.ts         ← server-side HTML fetch with robots + rate limit
    claudeFetch.ts      ← delegates to an agent session (web_fetch / web_search)
server/routes/sources.ts ← POST /api/sources/* endpoints

src/plugins/manageSource/
  definition.ts
  index.ts
  View.vue
  Preview.vue

test/sources/
  test_robots.ts        ← parse + match User-agent: * rules, cache eviction
  test_rss.ts           ← RSS/Atom parsing
  test_classifier.ts    ← pure helpers, taxonomy pinning
  test_pipeline.ts      ← end-to-end with stubbed fetchers
  test_registry.ts      ← write / read / round-trip source files
```

Reuses the following existing primitives: `task-manager` scheduler, `chat-index/summarizer.ts` for the Claude CLI spawn pattern, `journal/index.ts` for the lock+sentinel+disable-for-lifetime pattern. Nothing new at the framework level.

## Extensibility for future auth (phase 3)

Designed in but not used in phase 1:

1. **`fetcher` is a tagged union.** Adding `{ kind: "github-authed", envVar: "GITHUB_TOKEN" }` or `{ kind: "x-api", envVar: "X_BEARER_TOKEN" }` just means a new file under `server/sources/fetchers/` implementing the same `SourceFetcher` interface.
2. **Source files already have space for auth hints.** Phase 1 ignores them; phase 3 reads them.

   ```yaml
   fetcher:
     kind: github-authed
     envVar: GITHUB_TOKEN
     scopes: [repo:read]   # informational only
   ```

3. **Per-source rate-limit state is already keyed by fetcher kind**, not just host — so per-user-token rate limits in phase 3 fit cleanly.

4. **Secrets policy**: credentials live in `.env` (already protected by the sensitive-file denylist from #148). Never in source files, never in `sources/_state/`.

## Phase breakdown

| Phase | Scope | Gate |
|---|---|---|
| **1 (this spec)** | RSS / GitHub public / arXiv + web_fetch / web_search via Claude + daily pipeline + `manageSource` plugin + auto-categorize + robots etiquette | Ship this PR, iterate in subsequent PRs per fetcher type |
| **2** | On-demand `searchSources` + wiki-page generation for research results + notification hookup | Phase 1 stable in daily use |
| **3** | Auth-bearing fetchers (X / private GitHub / paid APIs) + secrets rotation + per-source rate-limit tuning | Real demand for a specific authed source |

## Open questions (to resolve before implementation PR)

1. **Taxonomy size**. Starting list above has 16 categories. Too many dilutes filtering; too few forces everything into `general`. Pilot with 16 and re-evaluate after 2 weeks of daily use?
2. **Daily summary template**. Markdown only, or include a compact structured index (JSON block) so the dashboard can render without re-parsing markdown? Lean toward: both — markdown for humans, fenced JSON block at the end for the dashboard.
3. **Item dedup across sources**. Two RSS feeds often carry the same HN story. Phase-1 answer: hash the normalized URL (strip utm params), skip dedup across sources but dedup within a single source. Phase-2: cross-source URL dedup.
4. **Archive size**. Per-source monthly archives grow unbounded. Phase-1: no pruning. Phase-3-ish: add a `journal-archivist`-style compaction pass.
5. **Error visibility**. When a source fails for 3 days in a row, how does the user learn? Ideas: (a) surface in daily summary footer ("3 sources failed today"), (b) push notification at 5-day mark, (c) badge on the manageSource UI. Pick one.
6. **Timezone for "daily"**. Local time like the journal, or UTC? Journal uses local — match it.
7. **Order of fetcher execution**. Parallel across hosts but serial per-host? Or fully serial with a 1s delay? Parallel-across-hosts is faster but needs a per-host queue. Start serial for simplicity; add parallelism if daily run exceeds 5 minutes.
8. **Failure isolation**. A single source failing must not abort the pipeline. Model: per-source try/catch that logs + advances state + continues.
9. **Claude-side fetcher invocation pattern**. One agent session per cron run that hits all web-search sources? Or per-source sessions? Per-run is cheaper (shared context, one summary pass) — start there.

## Test plan (for the phase 1 PR, not this spec)

- Unit: RSS/Atom parser (fixture files), robots parser (happy / allow / disallow / crawl-delay / wildcard), taxonomy classifier (mocked Claude response), URL normalizer (utm stripping, trailing slash).
- Integration: pipeline end-to-end with stubbed fetchers and stubbed summarize — writes expected daily markdown.
- Regression fixture: one real-world RSS feed (frozen snapshot) to catch parser regressions.
- No network tests in CI (stub everything).

## Related issues

- **#166** — the 10-use-case issue this spec addresses
- **#140** — news-batch (superseded; close in favour of this)
- **#143** — dashboard (consumer of daily output)
- **#142** — external notifications (consumer of critical items)
- **#144** — in-app notifications (consumer of critical items)
- **#148** — security hardening (dependency: sensitive-file denylist protects the `.env` our credential storage will use in phase 3)
