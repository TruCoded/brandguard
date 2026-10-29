"""Reel analytics: baseline comparison, pattern mining, idea generation and a simple potential score.
Honest by design: results are labelled above/below/inconclusive against the account's OWN baseline.
Nothing here can promise virality."""
import random, re, statistics as st
from datetime import datetime, timedelta
from .brands_seed import NICHE_PLAYBOOKS

HOOKS = ["question", "myth-bust", "result-first", "pov", "tutorial"]
CTAS = ["comment-keyword", "link-in-bio", "save-this", "follow", "none"]
NICHE_TAGS = {"energy": ["#SolarEnergy", "#GoSolar", "#SaveOnPower"], "fitness": ["#FitnessTips", "#GymMotivation", "#HomeWorkout"],
              "skincare": ["#SkincareTips", "#GlowUp", "#SkinCareRoutine"], "fintech": ["#MoneyTips", "#UPI", "#InvestSmart"],
              "food": ["#CoffeeReels", "#FoodieIndia", "#BaristaLife"]}


def dur_bucket(d):
    return "<15s" if d < 15 else "15-30s" if d < 30 else "30-45s" if d < 45 else "45s+"


def hour_bucket(h):
    return "morning (6-11)" if 6 <= h < 12 else "afternoon (12-16)" if 12 <= h < 17 else "evening (17-21)" if 17 <= h < 22 else "late night (22-5)"


def classify_caption(c):
    c = (c or "").lower()
    hook = ("question" if "?" in c.split("\n")[0] else "myth-bust" if re.search(r"myth|stop believing|wrong", c) else
            "pov" if "pov" in c else "tutorial" if re.search(r"how to|steps?|guide|tutorial", c) else
            "result-first" if re.search(r"\d", c.split("\n")[0]) else "question")
    cta = ("comment-keyword" if re.search(r"comment\s+['\"“]?\w+", c) else "link-in-bio" if "link in bio" in c else
           "save-this" if re.search(r"\bsave (?:this|it)\b", c) else "follow" if "follow" in c else "none")
    return hook, cta


def generate_demo(brand_id, niche, n=40, seed=None):
    rnd = random.Random(seed or hash(brand_id) % 10_000)
    hook_fx = {h: rnd.uniform(0.85, 1.35) for h in HOOKS}
    cta_fx = {c: rnd.uniform(0.6, 1.6) for c in CTAS}
    cta_fx["none"] = 0.5
    rows, now = [], datetime.utcnow()
    for i in range(n):
        h, c = rnd.choice(HOOKS), rnd.choice(CTAS)
        dur = rnd.choice([9, 12, 15, 18, 22, 26, 30, 35, 42, 55, 70])
        hour = rnd.choice([7, 9, 12, 14, 18, 19, 20, 21, 23])
        dur_fx = 1.25 if 15 <= dur < 35 else 1.0 if dur < 15 else 0.78
        hr_fx = 1.2 if 18 <= hour <= 21 else 1.0 if 12 <= hour < 18 else 0.85
        reach = int(rnd.lognormvariate(8.3, 0.55) * hook_fx[h] * hr_fx * dur_fx)
        retention = max(0.12, min(0.95, rnd.gauss(0.42, 0.07) * hook_fx[h] * (1.1 if dur < 30 else 0.85)))
        rows.append({
            "id": f"demo{i}", "caption": f"[{h}] demo reel #{i}", "posted_at": (now - timedelta(days=(n - i) * 2.2, hours=rnd.randint(0, 5))).isoformat(),
            "hour": hour, "duration": dur, "hook_type": h, "cta_type": c, "views": int(reach * rnd.uniform(1.1, 1.5)), "reach": reach,
            "avg_watch_sec": round(dur * retention, 1), "likes": int(reach * rnd.uniform(0.03, 0.08)),
            "comments": int(reach * rnd.uniform(0.002, 0.012) * (2 if c == "comment-keyword" else 1)),
            "shares": int(reach * rnd.uniform(0.004, 0.02) * hook_fx[h]), "saves": int(reach * rnd.uniform(0.005, 0.03) * (1.8 if c == "save-this" else 1)),
            "profile_visits": int(reach * rnd.uniform(0.01, 0.04)),
            "link_clicks": int(reach * rnd.uniform(0.002, 0.012) * cta_fx[c]), "leads": int(reach * rnd.uniform(0.0004, 0.003) * cta_fx[c]),
        })
    return rows


def _med(xs):
    xs = [x for x in xs if x is not None]
    return st.median(xs) if xs else 0


def enrich(rows):
    out = []
    for r in rows:
        r = dict(r)
        reach = max(r.get("reach") or 0, 1)
        dur = r.get("duration") or 0
        r["retention"] = (r["avg_watch_sec"] / dur) if dur and r.get("avg_watch_sec") is not None else None
        r["share_rate"] = (r.get("shares") or 0) / reach
        r["save_rate"] = (r.get("saves") or 0) / reach
        r["engagement_rate"] = sum((r.get(k) or 0) for k in ("likes", "comments", "shares", "saves")) / reach
        r["conversion_rate"] = ((r.get("leads") or 0) or (r.get("link_clicks") or 0)) / reach
        out.append(r)
    return out


WEIGHTS = {"retention": 0.35, "share_rate": 0.20, "save_rate": 0.15, "conversion_rate": 0.30}


def analyse(rows):
    rows = enrich(rows)
    if not rows:
        return {"count": 0}
    base = {k: _med([r[k] for r in rows]) for k in WEIGHTS}
    base["reach"] = _med([r["reach"] for r in rows])
    active = {k: w for k, w in WEIGHTS.items() if base[k] > 0}
    tw = sum(active.values()) or 1
    for r in rows:
        score = sum(w * min((r[k] or 0) / base[k], 3.0) for k, w in active.items()) / tw
        r["score"] = round(score, 2)
        r["label"] = ("inconclusive" if len(rows) < 8 else "above baseline" if score >= 1.25 else "below baseline" if score <= 0.75 else "typical")
    groups = {}
    for dim, fn in (("hook_type", lambda r: r.get("hook_type")), ("cta_type", lambda r: r.get("cta_type")),
                    ("duration", lambda r: dur_bucket(r["duration"]) if r.get("duration") else None),
                    ("posting_time", lambda r: hour_bucket(r["hour"]) if r.get("hour") is not None else None)):
        g = {}
        for r in rows:
            k = fn(r)
            if k:
                g.setdefault(k, []).append(r)
        groups[dim] = sorted([{"name": k, "n": len(v), "score": round(_med([x["score"] for x in v]), 2),
                               "retention": round(_med([x["retention"] for x in v]) * 100, 1) if any(x["retention"] is not None for x in v) else None,
                               "conversion": round(_med([x["conversion_rate"] for x in v]) * 100, 2),
                               "share_rate": round(_med([x["share_rate"] for x in v]) * 100, 2)} for k, v in g.items()],
                             key=lambda x: -x["score"])
    return {"count": len(rows), "baseline": {k: round(v, 4) for k, v in base.items()}, "reels": rows, "groups": groups,
            "above": sum(r["label"] == "above baseline" for r in rows), "below": sum(r["label"] == "below baseline" for r in rows)}


def recommendations(a, niche):
    if not a.get("count"):
        return []
    recs = []
    for dim, label in (("hook_type", "Open with a {x} hook"), ("cta_type", "End with a {x} CTA"),
                       ("duration", "Aim for {x} length"), ("posting_time", "Post in the {x} window")):
        gs = [g for g in a["groups"][dim] if g["n"] >= 3]
        if not gs:
            continue
        best, worst = gs[0], gs[-1]
        tag = "pattern" if best["n"] >= 5 else "test it"
        recs.append({"dimension": dim, "advice": label.format(x=best["name"]), "evidence": f"Median score {best['score']}x your baseline across {best['n']} reels"
                     + (f" (vs {worst['score']}x for {worst['name']})" if worst["name"] != best["name"] else ""), "confidence": tag})
    recs.append({"dimension": "method", "advice": "Change one thing per reel", "evidence": "Keep topic and CTA fixed, vary only the opening. Treat results as tests until you have 5+ comparable reels.", "confidence": "method"})
    return recs


def predict(a, hook, cta, duration, hour):
    if not a.get("count"):
        return None
    parts = []
    for dim, key in (("hook_type", hook), ("cta_type", cta), ("duration", dur_bucket(duration) if duration else None),
                     ("posting_time", hour_bucket(hour) if hour is not None else None)):
        g = next((g for g in a["groups"][dim] if g["name"] == key), None)
        if g:
            parts.append((g["score"], g["n"]))
    if not parts:
        return None
    ratio = sum(s * n for s, n in parts) / sum(n for _, n in parts)
    n_min = min(n for _, n in parts)
    label = "inconclusive" if n_min < 3 else "likely above baseline" if ratio >= 1.15 else "likely below baseline" if ratio <= 0.85 else "likely typical"
    return {"expected_vs_baseline": round(ratio, 2), "label": label, "based_on_min_reels": n_min,
            "note": "A directional estimate from your own history, not a guarantee. Platform algorithms and trends change."}


GENERIC_PLAYBOOK = {"audience": "your target customers", "proof": "demos, behind-the-scenes, customer questions answered on camera",
    "hooks": {"question": "Are you still doing {topic} the hard way?", "myth-bust": "Myth: {topic}. Here is what is actually true.", "result-first": "What {topic} actually changed, shown in 20 seconds.",
              "pov": "POV: you finally get {topic}.", "tutorial": "3 steps to get {topic} right."}}


def ideas(a, niche, topic, goal="conversions", duration=None, playbook=None, hashtags=None):
    pb = {**GENERIC_PLAYBOOK, **(playbook or NICHE_PLAYBOOKS.get(niche, {}))}
    pb["hooks"] = {**GENERIC_PLAYBOOK["hooks"], **pb.get("hooks", {})}
    order = [g["name"] for g in a["groups"]["hook_type"]] if a.get("count") else HOOKS
    order += [h for h in HOOKS if h not in order]
    ctas = [g["name"] for g in a["groups"]["cta_type"] if g["name"] != "none"] if a.get("count") else ["comment-keyword"]
    goal_cta = {"conversions": "comment-keyword", "reach": "follow", "saves": "save-this", "traffic": "link-in-bio"}.get(goal, "comment-keyword")
    cta = goal_cta if goal_cta in ctas or not ctas else ctas[0]
    best_dur = next((g["name"] for g in a["groups"]["duration"] if g["n"] >= 3), "15-30s") if a.get("count") else "15-30s"
    target = duration or {"<15s": 12, "15-30s": 24, "30-45s": 36, "45s+": 50}[best_dur]
    hooks = [{"type": h, "text": pb["hooks"][h].format(topic=topic), "from_your_data": a.get("count", 0) > 0 and h == order[0]} for h in order[:5]]
    t1, t2 = max(2, round(target * 0.12)), round(target * 0.75)
    script = [{"time": f"0-{t1}s", "beat": "Hook", "do": "Say the hook on screen AND in voice. No intro, no logo."},
              {"time": f"{t1}-{t2}s", "beat": "Payoff", "do": f"Deliver one clear idea about {topic}. Show proof: {pb['proof']}. Cut every 2-3 seconds."},
              {"time": f"{t2}-{target}s", "beat": "Close", "do": "One CTA only, spoken and as on-screen text. Tie it to what they just learned."}]
    cta_text = {"comment-keyword": f"Comment “{topic.split()[0].upper()}” and we will send the checklist.", "save-this": "Save this for later.",
                "link-in-bio": "Full details through the link in bio.", "follow": "Follow for the next one in this series."}[cta]
    return {"audience": pb["audience"], "target_seconds": target, "hooks": hooks, "script": script, "cta": {"type": cta, "text": cta_text},
            "caption": f"{hooks[0]['text']}\n\n{cta_text}\n\n" + " ".join(NICHE_TAGS.get(niche, [])),
            "notes": ["Hooks come from your own best-performing opening types when data exists, else niche heuristics.",
                      "Add captions on screen and alt text: it helps accessibility and silent-autoplay watch time.",
                      "Run the caption through the Review tab before publishing."]}
