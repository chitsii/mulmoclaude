# MulmoClaude — Product Hunt Launch Strategy

**Owner:** CMO (strategy), Engineering (demo assets), Community (day-of ops)
**Target launch:** Tuesday, one week out — 12:01 AM PT kickoff
**Positioning one-liner:** *Claude Code, but it draws you back.*

---

## 1. Positioning & Tagline

### Primary tagline (Product Hunt hero line)

> **MulmoClaude — Claude Code, multi-modal. Many sessions, one browser, every device.**

### Supporting taglines (A/B candidates for social + hero imagery)

1. *Chat with Claude. Get documents, charts, spreadsheets, slide decks, and narrated videos back.*
2. *The multi-modal GUI for Claude Code — multiple parallel sessions, sandboxed, local-first.*
3. *Claude Code meets a real UI, a personal wiki that never forgets, and a bridge to your phone.*
4. *Run five Claude agents in one browser tab. Message them from Telegram. Get a video back.*

### Category pick

Primary: **Developer Tools** · Secondary: **Productivity** · Tertiary: **Artificial Intelligence**
Developer Tools gets us the Claude Code / Cursor / Cline audience; Productivity captures the "personal knowledge base" narrative; AI is table stakes.

---

## 2. The One-Sentence Pitch

**MulmoClaude turns Claude Code into a multi-modal personal agent:** you chat, it replies with interactive documents, spreadsheets, charts, narrated slide decks, and AI-generated videos — you can run many sessions side-by-side in one browser, reach the same agent from your phone (Telegram, Slack, LINE, WhatsApp), and it all runs sandboxed in Docker so Claude can't touch anything outside your workspace.

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

Rank-ordered. Messages #1–#3 appear in every asset; the rest where space allows.

1. **Multi-modal Claude Code, via GUI Chat Protocol.** Claude doesn't reply with text — it calls tools that render interactive **documents, spreadsheets, ECharts dashboards, images, forms, 3D scenes, and full narrated presentations**. GUI Chat Protocol is the open standard that makes this possible, and it's the unique heart of this product.
2. **Run many Claude Code sessions at once, in one browser tab.** Open parallel sessions in separate roles, kick off long tasks in one, keep chatting in another. While one session is generating a video, another is refactoring your code. **Claude Code is no longer single-threaded.**
3. **Your phone is a Claude Code client.** Message your agent from **Telegram, Slack, LINE, Discord, WhatsApp, Matrix**, and more — same workspace, same memory, same skills. Send a photo, get a document back. Ask for a chart on your commute.
4. **Real presentations and videos, not bullet points.** The `presentMulmoScript` plugin (MulmoScript / MulmoCast engine) generates **slide decks with audio narration and AI-generated video clips** (Gemini image + Veo 3.1 video). Ship a narrated explainer without opening Keynote, Premiere, or a browser tab to ElevenLabs.
5. **Long-term memory that's actually yours.** A personal wiki grows from every conversation, stored as plain Markdown. Claude reads, cross-links, and maintains it itself — Karpathy's LLM Knowledge Bases idea, shipped.
6. **Docker-sandboxed by default.** Claude Code can read and write files. That's the whole point — and the whole danger. MulmoClaude **auto-detects Docker and runs Claude in a container** where only your workspace is visible. Your SSH keys, your `.env` files, your home directory — invisible. No configuration. Compare this to tools that run Claude directly against your filesystem.
7. **Your files are the database.** Todos, calendar, contacts, charts — all Markdown files in `~/mulmoclaude/`. Git-friendly. Dropbox-friendly. Grep-friendly. Yours forever.
8. **Roles, not modes.** Swap between General, Office, Guide & Planner, Artist, Tutor, Storyteller, MulmoCaster — each a different persona + tool palette. Context resets on switch, focus sharpens.
9. **Skills you already have, one click away.** Your `~/.claude/skills/` show up in a sidebar with a Run button. Schedule them with one line of SKILL.md frontmatter.

---

## 5. Product Hunt Listing Copy

### Headline (60 char max)
`MulmoClaude — Multi-modal, multi-session GUI for Claude Code`

### Tagline (60 char max)
`Parallel sessions, narrated videos, phone bridges, sandboxed.`

### First comment (the maker post — pinned)

```
Hi Product Hunt! 👋

I'm Satoshi, the creator of MulmoClaude. I love Claude Code — but every
time I used it I hit the same four walls:

1. **It only talks in text.** I wanted Claude to *show* me things —
   real documents, charts, spreadsheets, narrated slide decks.
2. **One session at a time.** While Claude was thinking, I was waiting.
3. **Only on my laptop.** I wanted to kick off a task from my phone
   during a commute and see the result when I got home.
4. **It has full access to my filesystem.** Fine for a pro user, scary
   for everyone else.

MulmoClaude fixes all four.

🎨 **Multi-modal via GUI Chat Protocol.** Claude doesn't answer with
   text — it calls tools that render interactive documents, ECharts
   dashboards, spreadsheets, images, forms, 3D scenes. The protocol is
   open and extensible; anyone can write a plugin.

🎬 **Presentations and videos, for real.** The built-in MulmoScript /
   MulmoCast engine generates full slide decks with audio narration and
   AI-generated video clips (Gemini image + Veo 3.1 video). Ask for a
   3-minute explainer on stellar evolution — you get a narrated video.

🧵 **Many Claude Code sessions, one browser tab.** Open parallel sessions
   in different roles. One session generates a 5-minute video while
   another refactors your code and a third drafts an email. Claude Code
   is no longer single-threaded.

📱 **Your phone is a Claude Code client.** Bridges to Telegram, Slack,
   LINE, Discord, WhatsApp, Matrix, and more — same agent, same
   workspace, same memory. Send a photo from your phone, get a document
   back on your laptop.

🔒 **Sandboxed by default.** Claude runs inside a Docker container that
   only sees your workspace. Your SSH keys, your .env files, your home
   directory — invisible. Auto-detected on launch. No configuration.

🧠 **Personal wiki that grows with you.** Inspired by @karpathy's LLM
   Knowledge Bases post — every ingested article and every decision
   becomes a cross-linked Markdown page Claude can search and reuse.

📁 **Your files are the database.** Todos, calendar, contacts, charts —
   all plain Markdown in ~/mulmoclaude/. Git it, Dropbox it, grep it.

Open source (AGPL), local-first.

Would love your feedback — especially if you're already a Claude Code
user and have opinions about what "a real UI for Claude" should feel
like.

— Satoshi
```

### Description / gallery captions (one per screenshot)

1. **Hero shot — multi-session** — "Three Claude Code sessions running in parallel, one browser tab. One renders a spreadsheet, one generates a narrated video, one drafts email."
2. **MulmoCast presentation** — "Ask for a 3-minute narrated explainer. Get a slide deck with AI-generated video clips and voice. Zero other tools opened."
3. **GUI Chat Protocol canvas** — "Claude's answer isn't text. It's an interactive document, spreadsheet, or chart you can keep."
4. **Mobile bridges** — "Message Claude from Telegram, Slack, LINE, WhatsApp. Send a photo, get a document back on your laptop."
5. **Docker sandbox banner** — "Claude can't see outside your workspace. SSH keys, .env files, home directory — all invisible."
6. **Wiki cross-links** — "Ingest an article. Claude writes it into your personal wiki and cross-links it to what you already know."
7. **Charts** — "‘Chart AAPL's last 30 days as a candlestick' — ECharts, PNG-exportable."
8. **Skills launcher** — "Your ~/.claude/skills/ with a Run button. Schedule with a frontmatter line."
9. **Workspace** — "Everything is a Markdown file in `~/mulmoclaude/`. Yours forever."

---

## 6. Demo Video Plan

Three videos — each serves a different channel. **Always record silent first; add a single-voice narration pass; ship captions.**

### Video A — The 60-second hero (Product Hunt gallery + Twitter/X)

- **Goal:** earn one upvote per viewer. No feature-listing.
- **The single moment we must land:** split-screen with three Claude Code sessions running simultaneously, one of them producing a narrated MulmoCast video while the others do real work. Nothing else on the market shows this.
- **Structure:**
  - 0:00–0:05 — Cold open: browser tab, three sessions stacked. All three get prompts typed into them in 3 seconds.
  - 0:05–0:20 — Session 1: "make a narrated 90s explainer on the water cycle" → MulmoCast renders a slide deck with voice + video clips. Session 2 (visible on the side): building a spreadsheet from a pasted CSV. Session 3: chart AAPL candlestick appears. **All at the same time, no cuts.**
  - 0:20–0:30 — Phone appears on-screen: a Telegram message sent to the same workspace → laptop canvas updates live. Narrator: *"Your phone is a Claude Code client now."*
  - 0:30–0:40 — Zoom to Docker sandbox banner in the UI. Narrator: *"Claude can only see your workspace. Nothing else."*
  - 0:40–0:55 — "Ingest this article" drops a URL → wiki page appears, cross-linked to an existing entry. Narrator: *"Every conversation makes the next one smarter."*
  - 0:55–1:00 — Logo + github URL + one-line install.
- **Production notes:** 1080p screen capture, 24fps, no zoom transitions, monospace captions. Music: one royalty-free lo-fi track at 40% — cut it at 0:55.

### Video B — The 3-minute deep-dive (YouTube + landing page)

- **Goal:** convert a developer watcher into a `git clone`.
- **Outline:**
  - 0:00–0:20 — Problem framing: "Claude Code is incredible, but it only talks in text, it's single-threaded, and it's tethered to your laptop. Here's what I wanted instead."
  - 0:20–0:50 — Install, `yarn dev`, first chat. Show the **Office role** building a real spreadsheet from a CSV paste. Call out: **GUI Chat Protocol** turns Claude's answer into an interactive artifact.
  - 0:50–1:30 — Open a second session in parallel. Kick off a **MulmoCast narrated video** (slide deck + voice + Veo 3.1 video clips). While it renders, continue working in the first session. Call out: "one browser tab, many Claude Code workers."
  - 1:30–2:00 — Role switch to **Guide & Planner**. Build a Kyoto trip doc. Show the file explorer — point out that everything is `.md` on disk.
  - 2:00–2:25 — Wiki demo. Ingest two articles on the same topic. Show backlinks appearing.
  - 2:25–2:45 — Bridges. Message from **Telegram** and **LINE**; show desktop canvas updating live. Same memory, same workspace.
  - 2:45–3:00 — Docker sandbox: show the container isolating Claude from the host filesystem. Frame this against tools that run Claude directly on `~/`. "It's open source, AGPL, Docker-sandboxed. Link in description."
- **Production notes:** talking-head inset bottom-right for the first 20 seconds, then pure screencast.

### Video C — The 15-second loop (Instagram, LinkedIn, PH gallery motion)

- Single prompt → single rich visual result → fade to logo. Meant to be muted.
- Shoot 3 variants: **(a)** three parallel sessions running at once, **(b)** a full MulmoCast narrated video rendering, **(c)** Telegram-to-canvas round trip. Pick the strongest for PH; post the other two on launch day.

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

**Launch thread (8 tweets) — drafts:**

1. *MulmoClaude is live on Product Hunt today. It's what I wanted Claude Code to feel like: multi-modal, multi-session, accessible from my phone, and sandboxed so it can't torch my laptop. 🧵*
2. *Claude Code answers with interactive documents, spreadsheets, ECharts dashboards, images, forms, 3D scenes — not walls of text. The GUI Chat Protocol makes this possible and it's the heart of the app. [15s video]*
3. *"Make me a 3-minute narrated explainer on the water cycle." MulmoCast builds a slide deck with AI voice + Veo 3.1 video clips. Zero other tools opened. [video]*
4. *Three Claude Code sessions running in parallel, one browser tab. One generates a video, one writes code, one drafts an email. Claude Code is no longer single-threaded. [multi-session gif]*
5. *Your phone is a Claude Code client now. Telegram, Slack, LINE, WhatsApp, Discord, Matrix — same agent, same workspace, same wiki memory. [bridges gif]*
6. *Claude runs in a Docker sandbox by default. It can only see your workspace. SSH keys, .env files, home directory — invisible. Auto-detected. No configuration. [sandbox screenshot]*
7. *Every conversation builds a personal wiki. Karpathy's LLM Knowledge Bases idea, shipped — all plain Markdown in `~/mulmoclaude/`. Git it. Dropbox it. Grep it. [wiki gif]*
8. *Open source, AGPL. One upvote on PH costs you nothing and means everything to us today: [link]*

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

If we can only execute one thing well, it's this: **make the hero video land the "three Claude Code sessions running in parallel, one of them generating a narrated video" moment in under 20 seconds.** That single shot is the entire pitch — multi-session + multi-modal + MulmoCast — in one frame. Nothing else on the market looks like it. Bridges, wiki, sandbox, roles are confirmation bias for a viewer who already believes. That first 20 seconds is what earns the upvote.

Everything in this plan should be read through that lens. Cut anything that doesn't serve it.

---

*Prepared for the MulmoClaude launch. Revise after the asset dry-run at T-7.*
