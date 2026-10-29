"""Optional grounded AI rewrites. The model only receives: original text, the violated rule, and approved facts.
Every suggestion is re-run through the rule engine (verify-after-fix); anything that creates a violation is discarded."""
import os, httpx
from .engine import run_review, sig

API = "https://api.anthropic.com/v1/messages"


def available():
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def rewrite(text, finding, brand_cfg, **ctx):
    if not available():
        return {"ok": False, "reason": "No ANTHROPIC_API_KEY configured. Rules-only mode is active."}
    if not brand_cfg.get("allow_external_ai"):
        return {"ok": False, "reason": "External AI is switched off for this brand. A Brand Admin can enable it in Guidelines after approving the provider."}
    if any(f["severity"] == "critical" for f in run_review(text, brand_cfg, **ctx)):
        return {"ok": False, "reason": "This text contains confidential or critical content, so it is never sent to an external AI service. Fix those items first."}
    facts = [f"{f['label']}: {f['replacement']} (source: {f['source']})" for f in brand_cfg.get("facts", [])]
    system = ("You rewrite marketing copy to fix ONE brand-rule violation. Keep the author's intent, voice and length. "
              "You may only use these approved facts and must never invent numbers, claims, awards or guarantees:\n- "
              + "\n- ".join(facts or ["(none)"]) + "\nReturn ONLY the full rewritten text, no commentary.")
    user = f"Violated rule: {finding['rule_id']} - {finding['title']}. Reason: {finding['why']}\nProblem text: {finding['evidence']}\n\nFull original text:\n{text}"
    try:
        r = httpx.post(API, timeout=45, headers={"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01",
                                                 "content-type": "application/json"},
                       json={"model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"), "max_tokens": 1000,
                             "system": system, "messages": [{"role": "user", "content": user}]})
        r.raise_for_status()
        new = "".join(b.get("text", "") for b in r.json()["content"]).strip()
    except Exception as e:  # network/API failure should never break the review flow
        return {"ok": False, "reason": f"AI service unavailable: {e}"}
    before, after = run_review(text, brand_cfg, **ctx), run_review(new, brand_cfg, **ctx)
    created = [x for x in sig(after) if x not in sig(before)]
    still = any(f["rule_id"] == finding["rule_id"] and f["evidence"].lower() == finding["evidence"].lower() for f in after)
    if created or still:
        return {"ok": False, "reason": "The AI rewrite was discarded because it did not pass the rule engine "
                                       + ("(new issue: " + ", ".join(r for r, _ in created) + ")." if created else "(issue remains).")}
    return {"ok": True, "text": new, "verified": True, "findings": after, "confidence": 0.7}
