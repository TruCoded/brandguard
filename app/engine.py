"""Deterministic, explainable review engine. Every finding carries evidence, rule, reason, fix and confidence."""
import re
from datetime import date

RULES = {
    "TONE-001": ("tone", "minor", "Shouting in capitals", "ALL-CAPS words read as shouting and weaken trust."),
    "TONE-002": ("tone", "minor", "Repeated punctuation", "Repeated exclamation marks look spammy."),
    "TONE-003": ("tone", "minor", "Hype word", "Hype words are vague and clash with the brand voice."),
    "TERM-001": ("terminology", "minor", "Banned term", "The brand guideline prefers a different term."),
    "MSG-001": ("messaging", "major", "Missing mandatory statement", "Promotional or sensitive content must carry the required statement."),
    "CLM-001": ("claims", "major", "Unsupported claim", "No approved evidence supports this claim."),
    "FACT-001": ("facts", "major", "Figure differs from approved fact", "The figure does not match the approved fact library."),
    "A11Y-001": ("accessibility", "major", "Missing alt text", "Screen-reader users cannot understand an image without alt text."),
    "A11Y-002": ("accessibility", "minor", "Very long sentence", "Sentences over 25 words are hard to read."),
    "A11Y-003": ("accessibility", "minor", "Vague link text", "Links such as 'click here' do not describe the destination."),
    "A11Y-004": ("accessibility", "minor", "Unreadable hashtag", "Long lowercase hashtags are hard for screen readers; use CamelCase."),
    "A11Y-005": ("accessibility", "major", "Low colour contrast", "Text/background contrast is below the WCAG AA ratio of 4.5:1."),
    "VIS-001": ("visual", "major", "Off-palette colour", "This colour is not in the approved palette."),
    "VIS-002": ("visual", "major", "Unapproved font", "This font is not in the approved font list."),
    "CONF-001": ("confidentiality", "critical", "Internal codename", "Project codenames must not appear in public content."),
    "CONF-002": ("confidentiality", "critical", "Personal email address", "Personal contact details must not be published."),
    "CONF-003": ("confidentiality", "critical", "Possible access key", "Looks like a secret or access key."),
    "CONF-004": ("confidentiality", "critical", "Internal-only marker", "Content marked internal must not be published."),
    "OFFER-001": ("offers", "critical", "Expired or not-yet-live promotion", "This promotion is outside its approved dates, so it must not be advertised."),
    "OFFER-002": ("offers", "major", "Offer terms missing", "Offers must carry their approved eligibility terms wherever they appear."),
    "VIS-003": ("visual", "major", "Image colours off-palette", "The dominant colours of this image are not in the approved palette."),
    "CH-001": ("tone", "minor", "Channel length limit", "This text exceeds the channel's character limit."),
}
CHANNEL_LIMITS = {"x": 280, "twitter": 280, "instagram": 2200, "linkedin": 3000, "facebook": 63206, "youtube": 5000, "tiktok": 2200, "email": 100000, "web": 100000}
SEVERITY_RANK = {"minor": 1, "major": 2, "critical": 3}
DEFAULT_SETTINGS = {"max_sentence_words": 25, "min_contrast": 4.5, "caps_min_len": 4, "fact_stale_days": 180, "safe_fix_confidence": 0.9,
                    "reviewer_severities": ["major", "critical"], "max_replies_24h": 2, "palette_tolerance": 40}


def setting(cfg, key):
    return (cfg.get("settings") or {}).get(key, DEFAULT_SETTINGS[key])


def rule_info(rule_id, cfg=None):
    """(category, severity, title, why) for built-in or brand-defined rules."""
    if rule_id in RULES:
        return RULES[rule_id]
    for c in (cfg or {}).get("custom_rules", []):
        if c["id"] == rule_id:
            return (c.get("category", "custom"), c.get("severity", "minor"), c.get("title", rule_id), c.get("why", "Brand-specific rule."))
    return ("custom", "minor", rule_id, "Brand-specific rule.")


def _f(rule_id, start, end, evidence, suggestion=None, fix_type="manual", confidence=0.7, note="", detail="", info=None):
    cat, sev, title, why = info or RULES[rule_id]
    return {"rule_id": rule_id, "category": cat, "severity": sev, "title": title, "why": why + (" " + detail if detail else ""),
            "start": start, "end": end, "evidence": evidence, "suggestion": suggestion, "fix_type": fix_type,
            "confidence": round(confidence, 2), "intent_note": note}


def _match_case(src, rep):
    return rep[:1].upper() + rep[1:] if src[:1].isupper() and rep else rep


def _hex_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _lum(rgb):
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(ch, rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a, b):
    la, lb = _lum(_hex_rgb(a)), _lum(_hex_rgb(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def _is_hex(s):
    return bool(re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})", s or ""))


def _stale(fact, days=180):
    try:
        y, m, d = map(int, fact.get("reviewed", "2000-01-01").split("-"))
        return (date.today() - date(y, m, d)).days > days
    except Exception:
        return True


def run_review(text, brand_cfg, visual=None, alt_text=None, has_image=False, channel="instagram"):
    cfg = brand_cfg
    off = set(cfg.get("disabled_rules", []))
    out = []
    text = text or ""

    def add(f):
        if f["rule_id"] not in off:
            out.append(f)

    # --- Tone
    acr = set(cfg.get("acronyms", []))
    for m in re.finditer(r"\b[A-Z]{%d,}\b" % setting(cfg, "caps_min_len"), text):
        if m.group() in acr:
            continue
        sentence_start = not text[:m.start()].strip() or text[:m.start()].rstrip()[-1:] in ".!?"
        rep = m.group().capitalize() if sentence_start else m.group().lower()
        add(_f("TONE-001", m.start(), m.end(), m.group(), rep, "deterministic", 0.9, "Same words, calmer delivery."))
    for m in re.finditer(r"[!?]{2,}", text):
        add(_f("TONE-002", m.start(), m.end(), m.group(), m.group()[0], "deterministic", 0.95, "Same message, single punctuation mark."))
    for word, rep in cfg.get("hype", {}).items():
        for m in re.finditer(r"\b" + re.escape(word) + r"\b", text, re.I):
            add(_f("TONE-003", m.start(), m.end(), m.group(), _match_case(m.group(), rep), "deterministic", 0.9,
                   "Removes hype but keeps the sentence meaning."))
    # --- Terminology
    for bad, good in cfg.get("terms", {}).items():
        if bad.lower() == good.lower():
            continue
        for m in re.finditer(r"\b" + re.escape(bad) + r"\b", text, re.I):
            add(_f("TERM-001", m.start(), m.end(), m.group(), _match_case(m.group(), good), "deterministic", 0.97,
                   "Same meaning, approved wording.", detail=f"Preferred: '{good}'."))
    # --- Claims
    for c in cfg.get("claims", []):
        for m in re.finditer(r"\b(?:" + c["pattern"] + r")" if not c["pattern"].startswith("#") else c["pattern"], text, re.I):
            add(_f("CLM-001", m.start(), m.end(), m.group(), _match_case(m.group(), c["fix"]), "deterministic", 0.8,
                   "Keeps the confident, benefit-led message but only says what can be proven. Human check recommended.",
                   detail=f"Claim type: {c.get('label', 'claim')}."))
    # --- Facts
    for fact in cfg.get("facts", []):
        for m in re.finditer(fact["pattern"], text, re.I):
            try:
                val = float(m.group(1))
            except (IndexError, ValueError):
                continue
            if fact["min"] <= val <= fact["max"]:
                continue
            stale = _stale(fact, setting(cfg, "fact_stale_days"))
            conf = 0.95 if not stale else 0.7
            add(_f("FACT-001", m.start(), m.end(), m.group(), _match_case(m.group(), fact["replacement"]), "deterministic", conf,
                   "Still the same kind of statement, now matching the approved figure.",
                   detail=f"Approved: {fact['replacement']} (source: {fact['source']}, reviewed {fact['reviewed']})."
                          + (" This fact is past its review window, so confidence is reduced." if stale else "")))
    # --- Messaging
    for req in cfg.get("mandatory", []):
        if re.search(req["trigger"], text, re.I) and req["text"].lower() not in text.lower():
            pos = len(text.rstrip())
            add(_f("MSG-001", pos, pos, "(missing)", " " + req["text"], "deterministic", 0.92,
                   "Adds the required statement without changing your copy.", detail=f"Required: \"{req['text']}\""))
    # --- Accessibility
    if has_image and not (alt_text or "").strip():
        add(_f("A11Y-001", -1, -1, "(no alt text)", None, "manual", 0.97, detail="Describe what the image shows in one sentence."))
    for m in re.finditer(r"[^.!?\n]+[.!?]?", text):
        if len(m.group().split()) > setting(cfg, "max_sentence_words"):
            add(_f("A11Y-002", m.start(), m.end(), m.group().strip()[:80] + "...", None, "ai", 0.75, detail="Split it into two shorter sentences."))
    for m in re.finditer(r"\b(?:click here|read more|learn more|here)\b(?=[^.]*\bhttps?://|\s*\[)", text, re.I):
        add(_f("A11Y-003", m.start(), m.end(), m.group(), None, "manual", 0.7, detail="Describe the destination, e.g. 'See our warranty terms'."))
    for m in re.finditer(r"#[a-z0-9_]{16,}", text):
        add(_f("A11Y-004", m.start(), m.end(), m.group(), None, "manual", 0.85, detail="Use CamelCase, e.g. #CleanEnergyForHomes."))
    v = visual or {}
    if _is_hex(v.get("text_color")) and _is_hex(v.get("bg_color")):
        r = contrast_ratio(v["text_color"], v["bg_color"])
        if r < setting(cfg, "min_contrast"):
            add(_f("A11Y-005", -1, -1, f"{v['text_color']} on {v['bg_color']} = {r:.1f}:1", None, "manual", 0.98,
                   detail="Pick a darker text colour from the palette."))
    # --- Visual consistency
    pal = [p.lower() for p in cfg.get("palette", [])]
    for col in v.get("colors", []) or []:
        if _is_hex(col) and pal:
            rgb = _hex_rgb(col)
            near = min(pal, key=lambda p: sum((a - b) ** 2 for a, b in zip(rgb, _hex_rgb(p))))
            dist = sum((a - b) ** 2 for a, b in zip(rgb, _hex_rgb(near))) ** 0.5
            if dist > setting(cfg, "palette_tolerance"):
                add(_f("VIS-001", -1, -1, col, near, "manual", 0.85, detail=f"Closest approved colour: {near}."))
    fonts = [f.lower() for f in cfg.get("fonts", [])]
    for fnt in v.get("fonts", []) or []:
        if fnt.strip() and fnt.lower() not in fonts:
            add(_f("VIS-002", -1, -1, fnt, None, "manual", 0.95, detail=f"Approved fonts: {', '.join(cfg.get('fonts', []))}."))
    # --- Confidentiality
    for name in cfg.get("codenames", []):
        for m in re.finditer(re.escape(name), text, re.I):
            add(_f("CONF-001", m.start(), m.end(), m.group(), "[removed]", "deterministic", 0.95, "Redacts the internal name."))
    for m in re.finditer(r"[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|proton(?:mail)?)\.[a-z.]+", text, re.I):
        add(_f("CONF-002", m.start(), m.end(), m.group(), "[email removed]", "deterministic", 0.95, "Redacts the address."))
    for m in re.finditer(r"\b(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|(?:api[_-]?key|secret|token)\s*[:=]\s*\S{8,})", text, re.I):
        add(_f("CONF-003", m.start(), m.end(), m.group()[:12] + "...", "[secret removed]", "deterministic", 0.97, "Redacts the key."))
    for m in re.finditer(r"internal\s+only|confidential|do not (?:share|distribute)", text, re.I):
        add(_f("CONF-004", m.start(), m.end(), m.group(), None, "manual", 0.9, detail="Remove this content or get Legal sign-off."))
    # --- Offers (BrandGuard: expired promotions are blocked, terms must travel with the offer)
    today = date.today().isoformat()
    for o in cfg.get("offers", []):
        for kw in o.get("keywords", []) + [o["name"]]:
            m = re.search(r"\b" + re.escape(kw) + r"\b", text, re.I)
            if not m:
                continue
            if not (o["start"] <= today <= o["end"]):
                add(_f("OFFER-001", m.start(), m.end(), m.group(), None, "manual", 0.97,
                       detail=f"'{o['name']}' ran {o['start']} to {o['end']}. Remove it or ask the offer owner to extend it."))
            elif o.get("terms") and o["terms"].lower() not in text.lower():
                pos = len(text.rstrip())
                add(_f("OFFER-002", pos, pos, "(missing)", " " + o["terms"], "deterministic", 0.92,
                       "Adds the approved terms without changing your copy.", detail=f"Required terms: \"{o['terms']}\""))
            break
    # --- Brand-defined rules (any brand or niche can add its own)
    for cr in cfg.get("custom_rules", []):
        if cr.get("enabled", True) is False:
            continue
        try:
            rx = re.compile(cr["pattern"], re.I)
        except (re.error, KeyError):
            continue
        info = (cr.get("category", "custom"), cr.get("severity", "minor"), cr.get("title", cr["id"]), cr.get("why", "Brand-specific rule."))
        for m in rx.finditer(text):
            if m.end() == m.start():
                continue
            fx = cr.get("fix")
            add(_f(cr["id"], m.start(), m.end(), m.group(), fx if fx is not None else None, "deterministic" if fx is not None else "manual",
                   0.85, "Brand-specific replacement." if fx is not None else "", info=info))
    # --- Channel
    lim = CHANNEL_LIMITS.get((channel or "").lower())
    if lim and len(text) > lim:
        add(_f("CH-001", lim, len(text), f"{len(text)}/{lim} characters", None, "manual", 0.99))
    keep = []
    for f in sorted(out, key=lambda f: -(f["end"] - f["start"])):
        if f["start"] >= 0 and any(k["rule_id"] == f["rule_id"] and k["start"] <= f["start"] and f["end"] <= k["end"] and k["end"] > k["start"] for k in keep):
            continue
        keep.append(f)
    out = keep
    out.sort(key=lambda f: (f["start"] if f["start"] >= 0 else 10 ** 9, f["rule_id"]))
    for i, f in enumerate(out):
        f["id"] = f"f{i}"
    return out


def _cleanup(t):
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\s+([,.!?;:])", r"\1", t)
    t = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), t)
    return t.strip() if t != t.strip() and not t.endswith("\n") else t


def sig(findings):
    return sorted((f["rule_id"], f["evidence"].lower()) for f in findings)


def apply_fix(text, finding, brand_cfg, **ctx):
    """Apply one deterministic fix, then verify: the finding must be gone and no new violation may appear."""
    if finding.get("suggestion") is None or finding["start"] < 0:
        return {"ok": False, "text": text, "reason": "This finding needs a manual fix."}
    s, e = finding["start"], finding["end"]
    if text[s:e] != ("" if finding["evidence"] == "(missing)" else finding["evidence"]) and finding["evidence"] != "(missing)":
        return {"ok": False, "text": text, "reason": "The text changed since this finding was created. Re-run the review."}
    before = run_review(text, brand_cfg, **ctx)
    new = _cleanup(text[:s] + finding["suggestion"] + text[e:])
    after = run_review(new, brand_cfg, **ctx)
    b, a = sig(before), sig(after)
    removed = (finding["rule_id"], finding["evidence"].lower()) not in a
    created = [x for x in a if x not in b]
    if not removed:
        return {"ok": False, "text": text, "verified": False, "reason": "The fix did not resolve the issue."}
    if created:
        return {"ok": False, "text": text, "verified": False,
                "reason": "This rewrite would introduce a new issue, so it was discarded: " + ", ".join(r for r, _ in created)}
    return {"ok": True, "text": new, "verified": True, "findings": after}


def apply_all_safe(text, brand_cfg, **ctx):
    applied = []
    for _ in range(25):
        fs = run_review(text, brand_cfg, **ctx)
        cand = [f for f in fs if f["fix_type"] == "deterministic" and f["confidence"] >= setting(brand_cfg, "safe_fix_confidence") and f["suggestion"] is not None]
        if not cand:
            break
        for f in cand:
            r = apply_fix(text, f, brand_cfg, **ctx)
            if r["ok"]:
                text = r["text"]
                applied.append({"rule_id": f["rule_id"], "evidence": f["evidence"], "to": f["suggestion"]})
                break
        else:
            break
    return {"text": text, "applied": applied, "findings": run_review(text, brand_cfg, **ctx)}


def route_for(findings, cfg=None):
    """Who must decide. Which severities need an authorised reviewer is configurable per brand."""
    top = max([SEVERITY_RANK[f["severity"]] for f in findings], default=0)
    name = {0: "none", 1: "minor", 2: "major", 3: "critical"}[top]
    need_rev = (cfg or {}).get("settings", {}).get("reviewer_severities", DEFAULT_SETTINGS["reviewer_severities"])
    return ("escalated" if name in need_rev else "in_review"), name


def review_image(data: bytes, cfg, alt_text=""):
    """Image checking: dominant colours vs brand palette + alt text. Deterministic, runs locally (no external service)."""
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    small = img.resize((96, 96))
    q = small.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()[:18]
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    dom = []
    for c, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        dom.append({"hex": "#%02x%02x%02x" % rgb, "share": round(c / total, 3)})
    brand_pal = [p.lower() for p in cfg.get("palette", [])]
    findings = []
    for d in dom:
        if d["share"] < 0.12 or not brand_pal:
            continue
        rgb = _hex_rgb(d["hex"])
        near = min(brand_pal, key=lambda p: sum((a - b) ** 2 for a, b in zip(rgb, _hex_rgb(p))))
        dist = sum((a - b) ** 2 for a, b in zip(rgb, _hex_rgb(near))) ** 0.5
        d["nearest"], d["distance"] = near, round(dist)
        # photos legitimately contain many colours: only flag large flat areas far from every brand colour
        if dist > 90 and d["share"] >= 0.25:
            findings.append(_f("VIS-003", -1, -1, f"{d['hex']} covers {int(d['share'] * 100)}% of the image", None, "manual", 0.7,
                               detail=f"Closest brand colour: {near}. Photos can be fine; confirm with the brand manager."))
    if "A11Y-001" not in set(cfg.get("disabled_rules", [])) and not (alt_text or "").strip():
        findings.append(_f("A11Y-001", -1, -1, "(no alt text)", None, "manual", 0.97, detail="Describe what the image shows in one sentence."))
    findings = [f for f in findings if f["rule_id"] not in set(cfg.get("disabled_rules", []))]
    for i, f in enumerate(findings):
        f["id"] = f"img{i}"
    return {"size": [w, h], "dominant": dom, "findings": findings}
