# BrandGuard

**Every piece of content. On-brand by design.**
BrandGuard reviews content before it is published, checks it against each brand's approved guidelines, facts, offers and assets, explains every issue, suggests fixes that keep the creator's message, and leaves the final decision to a human. It also includes a reel analytics studio, a content calendar, safe comment/DM automation, a dry-run publishing gate and an "agent studio" that drafts work for people to approve.

Team THE_OGS · Problem statement: Brand Governance (Inkloom AI).

## Run it
```bash
# 1. Backend + built frontend, one command (Python 3.10+)
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload                          # open http://localhost:8000

# 2. Optional: frontend with hot reload (Node 18+)
cd frontend && npm install
NEXT_PUBLIC_API=http://localhost:8000 npm run dev      # open http://localhost:3000
npm run build                                          # re-creates frontend/out, which FastAPI serves

pytest                                                 # 17 tests
```
`frontend/out` is already built, so Python alone is enough to run everything.
The first start creates `brandguard.db` (SQLite) and seeds five example brands, five demo users and demo reel data. For PostgreSQL set `DATABASE_URL` in `.env` (see `.env.example`).

## Everything is customisable per brand and niche
Open **Rule Library** (Brand HQ) as the **Admin** user. Each brand has its own:

| Area | What you can change |
|---|---|
| Identity | Name, niche (free text), tagline, audience, palette, fonts, hashtags, allowed acronyms, codenames, booking link, support contact |
| Tone and terms | Hype words and their replacements, banned vs preferred terms |
| Claims | Unsupported-claim patterns and the safe wording that replaces them |
| Rules | Switch any built-in rule on or off, and **add your own rules** (regex, category, severity, optional fix) |
| Facts | Approved figures with pattern, range, approved wording, source and review date (**Fact Library**) |
| Mandatory statements | "If the copy mentions X, it must include Y" |
| Offers | Dates, price, terms. Expired offers are blocked as critical |
| Niche playbook | Audience, proof to show on camera, five hook templates used by the reel planner and agent studio |
| Thresholds | Sentence length, contrast ratio, shouting length, fact review window, safe-fix confidence, reply limits, **which severities need a reviewer** |
| AI | Whether external AI rewrites are allowed at all (off by default) |
| Brands | Create a new brand (blank or copy another), delete a brand |
| Team | Add people and roles in **More → Team and roles** |

## What the problem statement asks for, and where it lives
| Requirement | Where |
|---|---|
| Review before publication against guidelines, facts and assets | Content Review, `app/engine.py` |
| Tone, terminology, messaging, visual consistency, accessibility, unsupported claims | Rules in `engine.py` + your custom rules; image check in `review_image` |
| Explain each issue and suggest corrections that preserve intent | Findings: evidence, rule, reason, fix, confidence, "intent preserved" note |
| Creator, manager and authorised-reviewer workflow with change tracking | Approvals: versions, comments, routing, separation of duties, override justification |
| Different content formats | Text, HTML, Word, PDF, images, visual specs, channel limits |
| Insights on repeated mistakes and unclear guidelines | Insights (dismissal-rate detector) |
| Automation with human control, confidentiality, explainable results | Verify-after-fix, AI opt-in, local processing, hash-chained audit trail, pause switches |
| Three Round 3 improvements | Grounded AI rewrites with verify loop · unclear-guideline detector · image checking (alt text and palette) |

## Pages
Overview (island dashboard) · Content Review · Rule Library (Brand HQ) · Fact Library · Approvals · Insights · More: Content calendar, Reel studio, Agent studio, Comments and DMs, Publishing, Workflow, Audit trail, Team and roles, Privacy and AI use, Search.

## Try this first
1. Switch to **Priya (Creator)**, open **Content Review**, paste `Our amazing panels are the BEST on the market!! Save up to 50% on your bills, guaranteed.` Apply safe fixes, apply the claim fixes, submit.
2. **Maya (manager)** cannot approve it (escalated). **Leena (reviewer)** can. Maya then schedules it in **Publishing** (dry run).
3. Mention "Monsoon Saver" in a draft: it is blocked as an expired offer.
4. **Admin**: add a custom rule in Brand HQ, then see it fire in Content Review. Create a new brand with a new niche.
5. **Agent studio**: give it a topic and watch the log. It stops at a human approval.

## Honest status
| Part | Status |
|---|---|
| Rule engine, fixes, verify-after-fix, workflow, audit chain, insights, custom rules, offers, calendar, engagement controls, publishing gate, agent studio, search, image and file checks | Working and tested (17 tests) |
| Grounded AI rewrites (Claude API) | Needs `ANTHROPIC_API_KEY` **and** an Admin opt-in per brand. Not tested without your key |
| Sign in with Instagram, reel import, live publishing | Written against Meta's Instagram API with Instagram Login. **Not tested live.** Verify scopes and metric names in Meta's docs. Live publishing needs `PUBLISH_LIVE=1`; the default is dry run |
| Reel analytics | Real maths on loaded data. Ships with demo data for Instagram, YouTube Shorts and TikTok; CSV import for real data |
| Trends | **No live trend feed.** Guidance comes from your own reels plus a trend board your team fills in |
| Comment/DM sending | Runs in **test mode** (nothing is sent). A real sending connector is not included |
| Login | Demo user switcher, **not secure authentication**. Replace with SSO before real use |
| Time saved | Estimate from assumed human baselines in `app/brands_seed.py`. Measure your own in a pilot |

See `docs/` for architecture, privacy and responsible-design notes, limitations and roadmap, AI disclosure, demo script and team contributions. `reference/` holds the files you provided (problem statement, Round 1 plan, blueprint, screenshots, and your original dashboard frontend).
