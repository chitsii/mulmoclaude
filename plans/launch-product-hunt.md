# MulmoClaude — Product Hunt Launch Strategy

**Owner:** CMO (strategy), Engineering (demo assets), Community (day-of ops)
**Target launch:** Tuesday, one week out — 12:01 AM PT kickoff
**Positioning one-liner:** *Claude Code, but it draws you back.*

---

## 1. Positioning & Tagline

### Primary tagline (Product Hunt hero line)

> **MulmoClaude — Give Claude Code a canvas and a memory.**

### Supporting taglines (A/B candidates for social + hero imagery)

1. *Chat with Claude. Get documents, charts, mind maps, and memory back.*
2. *The local-first GUI for Claude Code — your files stay yours, your agent gets smarter.*
3. *Claude Code meets a real UI. And a personal wiki that never forgets.*
4. *Stop screenshotting Claude's answers. Start saving them.*

### Category pick

Primary: **Developer Tools** · Secondary: **Productivity** · Tertiary: **Artificial Intelligence**
Developer Tools gets us the Claude Code / Cursor / Cline audience; Productivity captures the "personal knowledge base" narrative; AI is table stakes.

---

## 2. The One-Sentence Pitch

**MulmoClaude turns Claude Code into a visual, memory-equipped personal agent:** you chat, it replies with interactive documents, spreadsheets, charts, mind maps, images, and scheduled tasks — all stored as plain Markdown files you own, indexed by a wiki Claude maintains itself.

---

## 3. Why This Wins on Product Hunt

Product Hunt voters reward three things: **a clear "aha"**, **a short demo**, and **a narrative that isn't another wrapper**. MulmoClaude lands all three:

| Hunt instinct                  | MulmoClaude's answer                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| "Is this just a ChatGPT clone?"| No — it rides on Claude Code (local auth, your filesystem, your tools), not an API wrapper.               |
| "What's the new idea?"         | Visual output + long-term wiki memory + local files as database — Karpathy's KB idea, shipped.            |
| "Can I try it in 60 seconds?"  | One `yarn install && yarn dev`. No signup, no cloud account, no vendor lock-in.                           |
| "Why should I care tomorrow?"  | Every conversation adds to *your* wiki. Skills, todos, and scheduled runs compound.                       |

---

## 4. Key Messages (use across all surfaces)

Rank-ordered. Message #1 is in every asset; #2 and #3 appear where space allows.

1. **Claude Code gets a GUI.** Replies aren't walls of text — they're interactive documents, spreadsheets, ECharts dashboards, mind maps, images, and 3D scenes.
2. **Long-term memory that's actually yours.** A personal wiki grows from every conversation, stored as plain Markdown. Claude reads and maintains it automatically.
3. **Your files are the database.** Todos, calendar, contacts, charts — everything is a Markdown file in `~/mulmoclaude/`. Git-friendly. Dropbox-friendly. Yours.
4. **Roles, not modes.** Swap between General, Office, Guide & Planner, Artist, Tutor, Storyteller — each with its own persona and tool palette. Context resets, focus sharpens.
5. **Skills you already have, one click away.** Your Claude Code skills (`~/.claude/skills/`) show up in a sidebar with a Run button. Schedule them with a frontmatter line.
6. **Bridges everywhere.** Message your agent from Telegram, Slack, Discord, LINE, WhatsApp, Matrix, IRC, Messenger, Google Chat — same workspace, any surface.
7. **Sandboxed by default.** Docker detection is automatic — Claude sees your workspace and its own config, nothing else.

---

## 5. Product Hunt Listing Copy

### Headline (60 char max)
`MulmoClaude — Claude Code with a canvas and a memory`

### Tagline (60 char max)
`Visual GUI + personal wiki for Claude Code. Files stay yours.`

### First comment (the maker post — pinned)

```
Hi Product Hunt! 👋

I'm Satoshi, the creator of MulmoClaude. A year ago I built MulmoChat — a
voice-first agent on OpenAI Realtime. It was fun, but two things kept
bugging me:

1. Text answers scroll away. I wanted Claude to *show* me things —
   documents, charts, mind maps — that I could keep.
2. Every conversation started from zero. I wanted an agent that
   remembered what we'd figured out last week.

MulmoClaude is my answer. It sits on top of Claude Code (so it uses your
existing auth, your filesystem, and all your skills) and gives it:

• A **visual canvas** — replies render as interactive documents,
  spreadsheets, ECharts charts, mind maps, images, forms, 3D scenes.
• A **personal wiki** — inspired by @karpathy's LLM Knowledge Bases post.
  Every ingested article, every decision, every fact Claude finds becomes
  a Markdown page it can search and cross-reference later.
• A **workspace-as-database** — todos, calendar, contacts, charts,
  documents all live as plain files in ~/mulmoclaude/. Version them with
  git. Sync them with iCloud. Grep them with ripgrep.
• A **skills launcher** — your ~/.claude/skills/ show up with one-click
  Run buttons, and you can schedule them from SKILL.md frontmatter.
• **Bridges** to Telegram, Slack, Discord, LINE, WhatsApp, and 8 other
  platforms — same workspace, any surface.

It's open source (AGPL), local-first, and runs sandboxed in Docker by
default.

Would love your feedback — especially if you're already a Claude Code
user and have opinions about what "a GUI for Claude" should feel like.

— Satoshi
```

### Description / gallery captions (one per screenshot)

1. **Hero shot** — "Ask Claude anything. Get a document, a chart, a mind map back."
2. **Wiki view** — "Ingest an article. Claude writes it into your personal wiki, with cross-links."
3. **Roles launcher** — "Swap personas and tool palettes in one click."
4. **Charts** — "‘Chart last quarter's revenue by region' — ECharts, PNG-exportable."
5. **Skills** — "Your Claude Code skills, one click away. Schedule them with a frontmatter line."
6. **Bridges** — "Same agent, same workspace — from Telegram, Slack, Discord, WhatsApp."
7. **Workspace** — "Everything is a Markdown file in `~/mulmoclaude/`. Yours forever."

---

## 6. Demo Video Plan

Three videos — each serves a different channel. **Always record silent first; add a single-voice narration pass; ship captions.**

### Video A — The 60-second hero (Product Hunt gallery + Twitter/X)

- **Goal:** earn one upvote per viewer. No feature-listing.
- **Structure:**
  - 0:00–0:05 — Cold open: hand typing "plan a 3-day Kyoto trip" into MulmoClaude. No logo, no title card.
  - 0:05–0:20 — Canvas fills with a rich trip-planner document: map, day-by-day schedule, inline images, restaurant cards.
  - 0:20–0:30 — Quick cut: "summarize my todos for this week" → Kanban board rendering.
  - 0:30–0:40 — Quick cut: "chart AAPL's last 30 days" → candlestick with PNG export button highlighted.
  - 0:40–0:55 — "Ingest this article" drops a URL → wiki page appears, cross-linked to an existing entry. Narrator: *"Every conversation makes the next one smarter."*
  - 0:55–1:00 — Logo + `npx create-mulmoclaude` style hook (or `yarn dev` if simpler) + github URL.
- **Production notes:** 1080p screen capture, 24fps, no zoom transitions, monospace captions. Music: one royalty-free lo-fi track at 40% — cut it at 0:55.

### Video B — The 3-minute deep-dive (YouTube + landing page)

- **Goal:** convert a developer watcher into a `git clone`.
- **Outline:**
  - 0:00–0:20 — Problem framing: "Claude Code is incredible, but its answers live in a terminal. Here's what I wanted instead."
  - 0:20–1:00 — Install, `yarn dev`, first chat. Show the **Office role** building a real spreadsheet from a CSV paste.
  - 1:00–1:40 — Role switch to **Guide & Planner**. Build the Kyoto trip. Show the file explorer — point out that everything is `.md` on disk.
  - 1:40–2:20 — Wiki demo. Ingest two articles on the same topic. Show backlinks appearing. Search the wiki across sessions.
  - 2:20–2:40 — Skills. Run `/my-skill`. Show scheduling via SKILL.md frontmatter.
  - 2:40–3:00 — Bridges. Message from Telegram, watch the desktop canvas update live.
  - 3:00 — "It's open source, AGPL, Docker-sandboxed. Link in description."
- **Production notes:** talking-head inset bottom-right for the first 20 seconds, then pure screencast.

### Video C — The 15-second loop (Instagram, LinkedIn, PH gallery motion)

- Single prompt → single rich visual result → fade to logo. Meant to be muted.
- Shoot 3 variants: document, chart, wiki page. Pick the strongest for PH; post the other two on launch day.

### Filming checklist (applies to all)

- Use a clean workspace (fresh `~/mulmoclaude/`) so the file tree isn't cluttered.
- Record at 1920×1080 minimum; export H.264 at 8 Mbps.
- Pre-compose all prompts in a text file — don't let live-typing slow the pace. Paste and hit send.
- Do a dry run with the exact network Claude will hit. Agent latency is the #1 demo killer.
- If a plugin takes >8s to render, **cut the wait** — PH viewers don't forgive dead air.

---

## 7. Launch Week Timeline (T = launch day)

### T-14 to T-8 — Asset build

- [ ] Finalize hero video, 3-min video, 3× 15s loops, 7 screenshots
- [ ] Register Product Hunt account, link to X, warm up with 2 comments on other launches
- [ ] Line up **4 hunters** who will commit to launch-day engagement. Brief them on the product in a 5-min Loom.
- [ ] Draft all tweets, LinkedIn posts, Reddit posts, HN post
- [ ] QA install on clean macOS, clean Windows WSL, clean Ubuntu — fix any friction
- [ ] Decide: do we ship a `npx create-mulmoclaude` or keep `git clone` as the CTA? **Recommendation: ship the npx wrapper, it halves the install funnel.**

### T-7 — Pre-announce

- [ ] "Coming Tuesday on PH" tweet with the 15s loop (no link)
- [ ] Post in r/ClaudeAI, r/LocalLLaMA teasers — product demos, not launch CTAs (Reddit hates launch posts)
- [ ] DM 10 Claude Code power users you know — ask for a Tuesday morning try + honest feedback

### T-3 — Warm-up

- [ ] Publish a **blog post** on the Karpathy-KB connection: *"What I learned building a personal wiki for Claude."* This is the intellectual anchor.
- [ ] Submit the blog post to HN. Don't mention PH yet.
- [ ] Draft the PH listing in Maker Studio (do **not** publish — just stage)

### T-0 — Launch day

- **00:01 PT** — Publish on PH. First comment goes up within 90 seconds.
- **00:05 PT** — Tweet thread (7 tweets, one per key message). Pin the tweet.
- **00:10 PT** — LinkedIn, Mastodon, Bluesky cross-post (adapted, not copy-pasted)
- **01:00 PT** — HN "Show HN: MulmoClaude — visual GUI + personal wiki for Claude Code"
- **06:00 PT** — Reddit r/ClaudeAI post (value-first, not launch-y — "I built this, here's the wiki memory idea, here's the code")
- **09:00 PT / 12:00 PT / 15:00 PT / 18:00 PT** — Respond to **every** PH comment within 30 minutes. Non-negotiable.
- **17:00 PT** — Mid-day check: if we're not top-10, ship the Telegram bridge demo video as a fresh post and tag @ProductHunt.
- **21:00 PT** — Thank-you post regardless of placement. Name the top commenters.

### T+1 to T+7 — Compound

- Newsletter sends (dev.to, Hacker Newsletter submission, TLDR Dev pitch)
- Record a "Day after launch — what we learned" post. This outperforms the launch itself 30% of the time.
- Start the interview circuit: pitch the Changelog, Latent Space, and the Anthropic community call.

---

## 8. Channel-by-Channel Playbook

### X / Twitter

**Launch thread (7 tweets) — drafts:**

1. *MulmoClaude is live on Product Hunt today. It's what I wanted Claude Code to feel like: a real UI, a real memory, and every file stays on my machine. 🧵*
2. *Ask Claude anything → it replies with a document, a chart, a mind map, a spreadsheet, a form. Not a wall of text. [15s video]*
3. *Every conversation builds a personal wiki. Ingest an article, Claude cross-links it to what you already know. Karpathy's LLM Knowledge Bases idea, shipped. [wiki gif]*
4. *Your files are the database. `~/mulmoclaude/` is all plain Markdown. Git it. Dropbox it. Grep it. [file tree screenshot]*
5. *Your ~/.claude/skills/ show up with one-click Run buttons. Add `schedule: daily 08:00` to SKILL.md and Claude runs it every morning. [skills screenshot]*
6. *Same agent, same workspace — from Telegram, Slack, Discord, WhatsApp, LINE, Matrix, IRC, and 5 more. [bridges gif]*
7. *Open source (AGPL), Docker-sandboxed by default. One upvote on PH costs you nothing and means everything to us today: [link]*

### Hacker News

Title: **Show HN: MulmoClaude – A visual GUI and long-term wiki memory for Claude Code**

Body (first comment): lead with the Karpathy reference, the AGPL license, and the "workspace is the database" line. HN respects ideas over features — sell the idea.

### Reddit (r/ClaudeAI, r/LocalLLaMA, r/selfhosted)

- NOT a launch post. A build log: *"I spent 8 months making Claude Code visual and giving it a wiki. Here's what worked and what didn't."*
- PH link at the very bottom, one line.

### LinkedIn

Target audience: knowledge workers, not just devs. Lead with the "files stay yours" angle and the productivity use cases (Office role, Guide & Planner, scheduler).

### Japanese community (Note, X-JP)

Satoshi has a strong JP audience. Ship a Japanese version of the maker post and the hero video captions. Launch-day JP tweet at 09:00 JST = 17:00 PT the day before — catches the Asia-Pacific vote window.

---

## 9. Hunters & Community Seed List

- **Hunter target:** someone with 5k+ PH followers, ideally in the Claude/LLM space. If we can't land one, self-hunt — Satoshi's direct network is strong enough.
- **Seed voter list:** 50 people who've starred the repo or engaged with MulmoChat. DM them a calendar reminder Monday evening.
- **Commenter priming:** 4–6 people who will leave substantive (not cheerleading) comments in hours 1, 3, 6, 9. PH's algorithm weights comment velocity and diversity, not just upvotes.

---

## 10. Risks & Mitigations

| Risk                                             | Probability | Mitigation                                                                       |
| ------------------------------------------------ | ----------- | -------------------------------------------------------------------------------- |
| Install friction (Node, Docker, Gemini API key)  | High        | Ship `npx create-mulmoclaude`; include a "no-Gemini mode" walkthrough            |
| Claude Code CLI auth fails on first run          | Medium      | Pre-flight check in the app; friendly error page linking to Claude Code docs     |
| "It's just a wrapper" objection                  | Medium      | Lead every piece of copy with the **wiki** and the **workspace-as-database** — those are net-new |
| Demo video latency from live Claude calls        | Medium      | Pre-record results and cut ruthlessly; never show >3s of spinner                 |
| Anthropic ships their own GUI the same week      | Low         | Frame MulmoClaude as **complementary** — local-first, open-source, plugin-extensible |
| AGPL license scares enterprise viewers           | Low         | One FAQ line: "Personal + open-source use is fully free. Commercial licensing available." |
| PH algorithm — late US vote surge from JP timing | Low         | JP launch tweet timed to catch evening-JP as launch-day-morning-PT              |

---

## 11. Success Metrics

**Day of:**
- Product Hunt: **Top 5 of the day**; Top 10 is floor.
- GitHub stars: **+500** in 24h.
- Unique installs (Gemini API key inputs as proxy): **500**.
- PH comments: **50+ substantive** (not counting our team).

**Week of:**
- Stars: **+1,500 cumulative.**
- HN: front page for >2 hours.
- Twitter: 2M+ impressions on launch thread.
- 3+ inbound podcast/interview requests.

**Month of:**
- 2,000 active weekly users (sessions logged).
- 5 community-contributed custom roles or plugins.
- One mention by @karpathy, @alexalbert, or an Anthropic engineer (aspirational but trackable).

---

## 12. The Single Bet

If we can only execute one thing well, it's this: **make the hero video land the "wiki that grows with you" moment in under 20 seconds.** Everything else — roles, bridges, skills, charts — is confirmation bias for a viewer who already believes. That first 20 seconds is what earns the upvote.

Everything in this plan should be read through that lens. Cut anything that doesn't serve it.

---

*Prepared for the MulmoClaude launch. Revise after the asset dry-run at T-7.*
