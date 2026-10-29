# Known limitations and roadmap

**Limitations**
- Rule matching is regex and dictionary based: it can miss paraphrased claims and can over-flag. Confidence and dismissals are the safety valve.
- Tone and "off-message" judgement beyond hype words needs the optional AI layer or a human.
- Image check covers alt text and dominant colours only. No logo, text-in-image or face analysis.
- PDF/Word extraction is text only. Scanned PDFs need OCR.
- English-first. No localisation of rules.
- Instagram sign-in, insights and publishing are untested against live Meta. Reel length, hook style and sales conversions are not available from the API, so CSV import or caption heuristics are used.
- No live trend data. The trend board is human curated.
- Comment/DM replies run in test mode. No real sending connector.
- Demo authentication only. SQLite by default.
- Time-saved figures use assumed baselines.

**Roadmap**
1. Real SSO, tenant isolation, secrets manager, retention rules.
2. Slack/Teams bot and CMS plugin to check drafts where teams already work.
3. OCR and logo/clear-space checks; video caption checks.
4. Multi-language brand voice and rules.
5. Learn from accepted/dismissed findings to propose rule changes (with human approval).
6. Agency portal for external partners to self-check before delivery.
7. Verified DM/comment connector with delivery confirmation.
