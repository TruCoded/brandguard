# Privacy, security, accessibility and responsible design

**Confidential material.** The rule engine, image colour check, file extraction, reel analytics, engagement classifier and agent studio run locally. Codenames, personal emails and access keys are detected as critical and can be redacted. Text with a critical finding is never sent to an external AI.

**AI use.** External AI is off by default and needs two things: an API key in the environment and an Admin opt-in for that brand. Only the draft text and the brand's approved facts are sent. Output is re-checked by the rule engine and discarded if it adds a violation. See `AI_AND_THIRD_PARTY_DISCLOSURE.md`.

**Human control.** AI never approves or publishes. Authors cannot approve their own content. Critical issues need a written justification to override. Dismissals need a reason. Automation has per-brand pause switches and a test mode.

**Reliability and explainability.** Every finding shows evidence, rule ID, reason, confidence and a fix. Facts carry a source and review date; stale facts lower confidence and raise alerts. Unverified items are labelled, never invented.

**Audit.** Actions are written to a hash-chained log. Editing a record breaks the chain and the Audit page shows it.

**Security.** Role checks on every write endpoint. Secrets come from environment variables. Known gap: the demo user switcher is not real authentication, so add SSO and per-tenant isolation before production. Instagram tokens are stored in the database and should move to a secrets manager.

**Accessibility of this product.** Labelled fields, visible focus, skip link, keyboard-operable controls, colour never the only signal, reduced-motion support. A full screen-reader audit has not been done.

**Fairness and harm.** Rules are transparent and editable. False positives are expected, so every finding can be dismissed with a reason and those reasons feed the unclear-guideline detector.
