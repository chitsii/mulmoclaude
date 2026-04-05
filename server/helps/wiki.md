# Wiki

The wiki is a personal knowledge base that Claude builds and maintains as interconnected Markdown files in the workspace. It is available in the **Wiki** role.

The idea originated from [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Folder Layout

```
wiki/
  index.md          ← catalog of all pages (title, one-line summary, last updated)
  log.md            ← append-only chronological activity log
  summary.md        ← optional compact key-topics list (loaded into every session)
  SCHEMA.md         ← conventions for page format, index updates, and log entries
  pages/
    <topic>.md      ← one page per entity, concept, or theme
  sources/
    <slug>.md       ← raw ingested sources (immutable after ingest)
```

## Page Format

Each page is a plain Markdown file with YAML frontmatter:

```markdown
---
title: Transformer Architecture
created: 2026-04-05
updated: 2026-04-05
tags: [machine-learning, architecture, attention]
---

# Transformer Architecture

Brief summary paragraph...

## Key Concepts

...

## Related Pages

- [[Attention Mechanism]]
- [[BERT]]
- [[GPT]]
```

Cross-references use `[[Page Name]]` wiki-link syntax. Slugs are lowercase, hyphen-separated (e.g. `transformer-architecture.md`).

## Three Operations

### Ingest
Process a new source and propagate knowledge across the wiki.

1. Save the raw source to `wiki/sources/<slug>.md`
2. Identify which existing pages need updating
3. Create new pages for new entities or concepts
4. Update existing pages with new facts and cross-references
5. Append an entry to `wiki/log.md`
6. Refresh `wiki/index.md`

### Query
Answer a question using the wiki as the knowledge base.

1. Search `wiki/index.md` for relevant page titles
2. Read the relevant pages
3. Synthesize a grounded answer with citations
4. File back any new insight as a new or updated page

### Lint
Periodic health check to keep the wiki coherent.

1. Scan all pages for contradictions, stale claims, orphan pages, and broken cross-references
2. Present a report and optionally auto-fix minor issues

## Canvas Tool

Use the `manageWiki` tool to display wiki content in the canvas:

- `action: "index"` — show the page catalog
- `action: "page"` — show a single page (provide `pageName`)
- `action: "log"` — show the activity log
- `action: "lint_report"` — run a health check

## Relationship to `memory.md`

| | `memory.md` | `wiki/` |
|---|---|---|
| Scope | Brief distilled facts, always in context | Deep structured knowledge, loaded on demand |
| Growth | Intentionally small | Grows unboundedly |

Over time, Claude can distill key insights from the wiki back into `memory.md` as compact ambient context for all roles.
