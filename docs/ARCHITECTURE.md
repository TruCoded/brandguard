# Architecture

```
Next.js (static export)  ──►  FastAPI  ──►  SQLAlchemy ──► SQLite / PostgreSQL
 island dashboard, pages        │
                                ├─ engine.py     deterministic rules, fixes, verify-after-fix, image check
                                ├─ llm.py        optional grounded rewrites (opt-in, re-verified)
                                ├─ features.py   calendar, offers, engagement, publishing gate, agent studio, search
                                ├─ reels.py      baselines, pattern mining, planner, estimator
                                ├─ instagram.py  OAuth, insights import, publish (untested live)
                                └─ db.py         models + hash-chained audit log
```
Principles: exact rules run as code; AI drafts and explains; every suggestion is re-checked; humans approve risk; everything is logged.

Review flow: submit → parse → rules + facts + offers + custom rules → findings (evidence, rule, reason, fix, confidence) → fix or dismiss with reason → route by severity (configurable) → manager or reviewer decides → approved → publishing gate re-checks → dry-run or live publish.

Two-tier fixes: deterministic replacements from the term dictionary, fact library and claim table; optional constrained AI for the rest, always followed by the same rule engine. A rewrite that creates any new violation is discarded.

Brand knowledge base: one JSON configuration per brand (`brands.config`), edited only by Admins, every change audited. Built-in rules are code; brand-specific behaviour is data (custom rules, thresholds, playbooks).
