import csv, io, os, random, secrets
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from .deps import user_dep, need, brand_cfg, get_setting, set_setting
from .features import r as features_router
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select, func

from . import engine as eng, llm, reels as rl, instagram as ig
from .brands_seed import BRANDS, USERS, NICHE_PLAYBOOKS
from .db import (ReplyRule, Trend, Base, engine as db_engine, Session, Brand, User, Submission, Version, Comment, Audit,
                 FindingEvent, Reel, Setting, log_audit, verify_chain)

app = FastAPI(title="BrandGuard", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])
app.include_router(features_router)


def seed():
    Base.metadata.create_all(db_engine)
    with Session() as s:
        if s.execute(select(func.count()).select_from(Brand)).scalar():
            return
        for b in BRANDS:
            s.add(Brand(id=b["id"], name=b["name"], niche=b["niche"], config=b["config"]))
        for u in USERS:
            s.add(User(**u))
        # Demo history so insights are not empty on first run
        rnd = random.Random(7)
        rules = [("TONE-001", "tone", .15), ("TERM-001", "terminology", .10), ("CLM-001", "claims", .55), ("FACT-001", "facts", .12),
                 ("A11Y-004", "accessibility", .62), ("CONF-001", "confidentiality", .05), ("A11Y-002", "accessibility", .35)]
        for b in BRANDS:
            for _ in range(60):
                rid, cat, dis = rnd.choice(rules)
                u = rnd.choice([x for x in USERS if x["role"] == "creator"])
                act = "dismissed" if rnd.random() < dis else rnd.choice(["fixed", "fixed", "shown"])
                s.add(FindingEvent(ts=datetime.utcnow() - timedelta(days=rnd.randint(0, 30)), brand_id=b["id"], rule_id=rid, category=cat,
                                   action=act, user_id=u["id"], team=u["team"], reason="not clear what is allowed" if act == "dismissed" else ""))
            for plat in ("instagram", "youtube", "tiktok"):
                for r in rl.generate_demo(b["id"] + plat, b["niche"]):
                    s.add(Reel(brand_id=b["id"], platform=plat, source="demo", data=r))
            s.add(ReplyRule(brand_id=b["id"], keyword="CHECKLIST", template=f"Here is the {b['name']} checklist you asked for: https://example.com/{b['id']}-checklist"))
            for kind, label, note in (("format", "Talking-head with on-screen proof", "Seen in several accounts in this niche this month"),
                                      ("hook", "Myth vs fact opener", "Reports in niche communities; unverified, treat as a test")):
                s.add(Trend(brand_id=b["id"], kind=kind, label=label, note=note, added_by="admin"))
        log_audit(s, "system", "workspace.seeded", "all", {"brands": len(BRANDS)})
        s.commit()


seed()




# ---------------- Reference data
@app.get("/api/users")
def users():
    with Session() as s:
        return [dict(id=u.id, name=u.name, role=u.role, team=u.team) for u in s.scalars(select(User))]


@app.get("/api/brands")
def brands():
    with Session() as s:
        return [dict(id=b.id, name=b.name, niche=b.niche, tagline=b.config.get("tagline"), accent=b.config.get("accent")) for b in s.scalars(select(Brand))]


@app.get("/api/brands/{bid}")
def brand_get(bid: str):
    with Session() as s:
        b = brand_cfg(s, bid)
        cfg = dict(b.config)
        cfg["facts"] = [dict(f, stale=eng._stale(f, eng.setting(cfg, "fact_stale_days"))) for f in cfg.get("facts", [])]
        return {"id": b.id, "name": b.name, "niche": b.niche, "config": cfg,
                "rules": {**{k: {"category": v[0], "severity": v[1], "title": v[2], "enabled": k not in cfg.get("disabled_rules", []), "builtin": True} for k, v in eng.RULES.items()},
                  **{c["id"]: {"category": c.get("category", "custom"), "severity": c.get("severity", "minor"), "title": c.get("title", c["id"]), "enabled": c["id"] not in cfg.get("disabled_rules", []), "builtin": False} for c in cfg.get("custom_rules", [])}},
                "defaults": eng.DEFAULT_SETTINGS}


class BrandUpdate(BaseModel):
    config: dict
    name: str | None = None
    niche: str | None = None


@app.put("/api/brands/{bid}")
def brand_put(bid: str, body: BrandUpdate, user=Depends(user_dep)):
    need(user, "admin")
    with Session() as s:
        b = brand_cfg(s, bid)
        b.config = body.config
        if body.name:
            b.name = body.name.strip()
        if body.niche:
            b.niche = body.niche.strip()
        log_audit(s, user["id"], "guidelines.updated", bid, {"keys": list(body.config.keys())})
        s.commit()
    return {"ok": True}


class BrandNew(BaseModel):
    name: str
    niche: str = "general"
    template: str = ""        # copy an existing brand's rules as a starting point, or leave empty for a blank brand


BLANK = {"tagline": "", "accent": "#6d4ad4", "palette": ["#6D4AD4", "#FFFFFF", "#171533"], "fonts": ["Inter"], "terms": {},
         "hype": {"amazing": "", "incredible": "", "unbeatable": ""}, "claims": [{"pattern": "guarantee[ds]?", "fix": "backed by our policy", "label": "guarantee"},
         {"pattern": "(?:the\\s+)?best", "fix": "built with care", "label": "best"}], "facts": [], "mandatory": [], "codenames": [],
         "acronyms": ["FAQ", "USA", "ROI"], "hashtags": [], "disabled_rules": [], "offers": [], "allow_external_ai": False, "booking_link": "", "support_contact": "",
         "audience": "", "playbook": {}, "custom_rules": [], "settings": {}}


@app.post("/api/brands")
def brand_create(b: BrandNew, user=Depends(user_dep)):
    import copy, re as _re
    need(user, "admin")
    bid = _re.sub(r"[^a-z0-9]+", "-", b.name.lower()).strip("-") or "brand"
    with Session() as s:
        if s.get(Brand, bid):
            raise HTTPException(409, "A brand with this name already exists.")
        src = s.get(Brand, b.template) if b.template else None
        cfg = copy.deepcopy(src.config if src else BLANK)
        if src:
            cfg["offers"] = []
            cfg["codenames"] = []
        s.add(Brand(id=bid, name=b.name.strip(), niche=b.niche.strip() or "general", config=cfg))
        for plat in ("instagram", "youtube", "tiktok"):
            for r in rl.generate_demo(bid + plat, b.niche):
                s.add(Reel(brand_id=bid, platform=plat, source="demo", data=r))
        s.add(ReplyRule(brand_id=bid, keyword="CHECKLIST", template=f"Here is the {b.name} checklist you asked for."))
        log_audit(s, user["id"], "brand.created", bid, {"template": b.template or "blank", "niche": b.niche})
        s.commit()
    return {"id": bid}


@app.delete("/api/brands/{bid}")
def brand_delete(bid: str, user=Depends(user_dep)):
    need(user, "admin")
    with Session() as s:
        if s.scalar(select(func.count()).select_from(Brand)) <= 1:
            raise HTTPException(409, "Keep at least one brand.")
        br = s.get(Brand, bid)
        if br:
            for M in (Reel, ReplyRule, Trend):
                s.query(M).filter_by(brand_id=bid).delete()
            s.delete(br)
            log_audit(s, user["id"], "brand.deleted", bid, {})
            s.commit()
    return {"ok": True}


class UserNew(BaseModel):
    id: str
    name: str
    role: str
    team: str = ""


@app.post("/api/users")
def user_add(b: UserNew, user=Depends(user_dep)):
    need(user, "admin")
    if b.role not in ("creator", "manager", "reviewer", "admin"):
        raise HTTPException(422, "role must be creator, manager, reviewer or admin")
    with Session() as s:
        s.merge(User(id=b.id.strip().lower(), name=b.name, role=b.role, team=b.team))
        log_audit(s, user["id"], "user.saved", b.id, {"role": b.role}); s.commit()
    return {"ok": True}


@app.delete("/api/users/{uid}")
def user_del(uid: str, user=Depends(user_dep)):
    need(user, "admin")
    if uid == user["id"]:
        raise HTTPException(409, "You cannot remove yourself.")
    with Session() as s:
        u = s.get(User, uid)
        if u:
            s.delete(u); log_audit(s, user["id"], "user.removed", uid, {}); s.commit()
    return {"ok": True}


# ---------------- Review
class ReviewIn(BaseModel):
    brand_id: str
    text: str = ""
    channel: str = "instagram"
    visual: dict = {}
    alt_text: str = ""
    has_image: bool = False


def ctx(b: ReviewIn):
    return dict(visual=b.visual, alt_text=b.alt_text, has_image=b.has_image, channel=b.channel)


@app.post("/api/review")
def review(b: ReviewIn):
    with Session() as s:
        cfg = brand_cfg(s, b.brand_id).config
    f = eng.run_review(b.text, cfg, **ctx(b))
    status, top = eng.route_for(f, cfg)
    return {"findings": f, "route": {"status": status, "top_severity": top}, "ai_available": llm.available()}


class FixIn(ReviewIn):
    finding: dict


@app.post("/api/apply-fix")
def apply_fix(b: FixIn, user=Depends(user_dep)):
    with Session() as s:
        cfg = brand_cfg(s, b.brand_id).config
        r = eng.apply_fix(b.text, b.finding, cfg, **ctx(b))
        if r["ok"]:
            s.add(FindingEvent(brand_id=b.brand_id, rule_id=b.finding["rule_id"], category=b.finding["category"], action="fixed", user_id=user["id"], team=user["team"]))
            s.commit()
    return r


@app.post("/api/apply-all-safe")
def apply_all(b: ReviewIn, user=Depends(user_dep)):
    with Session() as s:
        cfg = brand_cfg(s, b.brand_id).config
        r = eng.apply_all_safe(b.text, cfg, **ctx(b))
        for a in r["applied"]:
            s.add(FindingEvent(brand_id=b.brand_id, rule_id=a["rule_id"], category=eng.rule_info(a["rule_id"], cfg)[0], action="fixed", user_id=user["id"], team=user["team"]))
        s.commit()
    return r


@app.post("/api/ai-rewrite")
def ai_rewrite(b: FixIn, user=Depends(user_dep)):
    with Session() as s:
        cfg = brand_cfg(s, b.brand_id).config
    return llm.rewrite(b.text, b.finding, cfg, **ctx(b))


class DismissIn(BaseModel):
    brand_id: str
    rule_id: str
    reason: str


@app.post("/api/dismiss")
def dismiss(b: DismissIn, user=Depends(user_dep)):
    if len(b.reason.strip()) < 5:
        raise HTTPException(422, "Please give a reason (at least a few words). Dismissals are logged.")
    with Session() as s:
        cfg = brand_cfg(s, b.brand_id).config
        s.add(FindingEvent(brand_id=b.brand_id, rule_id=b.rule_id, category=eng.rule_info(b.rule_id, cfg)[0], action="dismissed", user_id=user["id"], team=user["team"], reason=b.reason))
        log_audit(s, user["id"], "finding.dismissed", b.rule_id, {"reason": b.reason, "brand": b.brand_id})
        s.commit()
    return {"ok": True}


# ---------------- Workflow
class SubIn(ReviewIn):
    title: str = "Untitled"
    dismissals: list = []


def sub_dict(s, sub, with_versions=False):
    d = {"id": sub.id, "brand_id": sub.brand_id, "title": sub.title, "channel": sub.channel, "author_id": sub.author_id, "status": sub.status,
         "top_severity": sub.top_severity, "created": sub.created.isoformat(), "updated": sub.updated.isoformat()}
    if with_versions:
        vs = s.scalars(select(Version).where(Version.submission_id == sub.id).order_by(Version.n)).all()
        d["versions"] = [dict(n=v.n, text=v.text, visual=v.visual, alt_text=v.alt_text, has_image=bool(v.has_image), findings=v.findings,
                              dismissals=v.dismissals, created=v.created.isoformat()) for v in vs]
        d["comments"] = [dict(user=c.user_id, body=c.body, created=c.created.isoformat()) for c in s.scalars(select(Comment).where(Comment.submission_id == sub.id).order_by(Comment.id))]
    return d


def add_version(s, sub, b: SubIn, user):
    cfg = brand_cfg(s, sub.brand_id).config
    findings = eng.run_review(b.text, cfg, **ctx(b))
    n = (s.execute(select(func.max(Version.n)).where(Version.submission_id == sub.id)).scalar() or 0) + 1
    s.add(Version(submission_id=sub.id, n=n, text=b.text, visual=b.visual, alt_text=b.alt_text, has_image=int(b.has_image), findings=findings, dismissals=b.dismissals))
    return findings, n


@app.post("/api/submissions")
def sub_create(b: SubIn, user=Depends(user_dep)):
    with Session() as s:
        sub = Submission(brand_id=b.brand_id, title=b.title, channel=b.channel, author_id=user["id"], status="draft")
        s.add(sub); s.flush()
        add_version(s, sub, b, user)
        log_audit(s, user["id"], "submission.created", f"#{sub.id}", {"title": b.title})
        s.commit()
        return sub_dict(s, sub, True)


@app.post("/api/submissions/{sid}/submit")
def sub_submit(sid: int, b: SubIn, user=Depends(user_dep)):
    with Session() as s:
        sub = s.get(Submission, sid)
        if not sub or sub.author_id != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Only the author can submit this draft.")
        if sub.status not in ("draft", "changes_requested"):
            raise HTTPException(409, f"Cannot submit while status is {sub.status}.")
        for d in b.dismissals:
            if len((d.get("reason") or "").strip()) < 5:
                raise HTTPException(422, "Every dismissal needs a reason.")
        findings, n = add_version(s, sub, b, user)
        sub.status, sub.top_severity = eng.route_for(findings, brand_cfg(s, sub.brand_id).config)
        sub.updated = datetime.utcnow()
        for f in findings:
            s.add(FindingEvent(brand_id=sub.brand_id, rule_id=f["rule_id"], category=f["category"], action="shown", user_id=user["id"], team=user["team"]))
        log_audit(s, user["id"], "submission.submitted", f"#{sid}", {"version": n, "route": sub.status, "top": sub.top_severity, "open_findings": len(findings)})
        s.commit()
        return sub_dict(s, sub, True)


class DecisionIn(BaseModel):
    decision: str  # approve | request_changes
    comment: str = ""
    justification: str = ""


@app.post("/api/submissions/{sid}/decision")
def sub_decision(sid: int, b: DecisionIn, user=Depends(user_dep)):
    with Session() as s:
        sub = s.get(Submission, sid)
        if not sub:
            raise HTTPException(404)
        if sub.status == "in_review":
            need(user, "manager", "reviewer")
        elif sub.status == "escalated":
            need(user, "reviewer")
        else:
            raise HTTPException(409, f"Nothing to decide while status is {sub.status}.")
        if sub.author_id == user["id"]:
            raise HTTPException(403, "Separation of duties: you cannot approve your own content.")
        last = s.scalars(select(Version).where(Version.submission_id == sid).order_by(Version.n.desc())).first()
        remaining_crit = any(f["severity"] == "critical" for f in last.findings)
        if b.decision == "approve":
            if remaining_crit and len(b.justification.strip()) < 15:
                raise HTTPException(422, "Critical issues remain. Approving needs a written justification (15+ characters).")
            sub.status = "approved"
        elif b.decision == "request_changes":
            if not b.comment.strip():
                raise HTTPException(422, "Say what needs to change.")
            sub.status = "changes_requested"
        else:
            raise HTTPException(422, "decision must be approve or request_changes")
        if b.comment:
            s.add(Comment(submission_id=sid, user_id=user["id"], body=b.comment))
        sub.updated = datetime.utcnow()
        log_audit(s, user["id"], f"submission.{b.decision}", f"#{sid}", {"comment": b.comment, "override_justification": b.justification if remaining_crit else ""})
        s.commit()
        return sub_dict(s, sub, True)


@app.post("/api/submissions/{sid}/publish")
def sub_publish(sid: int, user=Depends(user_dep)):
    need(user, "manager", "reviewer")
    with Session() as s:
        sub = s.get(Submission, sid)
        if not sub or sub.status != "approved":
            raise HTTPException(409, "Only approved content can be marked ready to publish.")
        sub.status = "published"
        sub.updated = datetime.utcnow()
        log_audit(s, user["id"], "submission.published", f"#{sid}", {})
        s.commit()
        return sub_dict(s, sub, True)


class CommentIn(BaseModel):
    body: str


@app.post("/api/submissions/{sid}/comment")
def sub_comment(sid: int, b: CommentIn, user=Depends(user_dep)):
    with Session() as s:
        s.add(Comment(submission_id=sid, user_id=user["id"], body=b.body))
        log_audit(s, user["id"], "comment.added", f"#{sid}", {})
        s.commit()
        return sub_dict(s, s.get(Submission, sid), True)


@app.get("/api/submissions")
def sub_list(brand_id: str = "", user=Depends(user_dep)):
    with Session() as s:
        q = select(Submission).order_by(Submission.updated.desc())
        if brand_id:
            q = q.where(Submission.brand_id == brand_id)
        rows = s.scalars(q).all()
        if user["role"] == "creator":
            rows = [r for r in rows if r.author_id == user["id"]]
        return [sub_dict(s, r) for r in rows]


@app.get("/api/submissions/{sid}")
def sub_get(sid: int, user=Depends(user_dep)):
    with Session() as s:
        sub = s.get(Submission, sid)
        if not sub:
            raise HTTPException(404)
        return sub_dict(s, sub, True)


# ---------------- Insights & audit
@app.get("/api/insights")
def insights(brand_id: str):
    with Session() as s:
        cfg_i = brand_cfg(s, brand_id).config
        ev = s.scalars(select(FindingEvent).where(FindingEvent.brand_id == brand_id)).all()
        by_rule, by_cat, by_team = {}, {}, {}
        for e in ev:
            r = by_rule.setdefault(e.rule_id, {"rule_id": e.rule_id, "title": eng.rule_info(e.rule_id)[2], "shown": 0, "fixed": 0, "dismissed": 0, "reasons": []})
            r[e.action] += 1
            if e.action == "dismissed" and e.reason:
                r["reasons"].append(e.reason)
            by_cat[e.category] = by_cat.get(e.category, 0) + 1
            by_team[e.team or "?"] = by_team.get(e.team or "?", 0) + (1 if e.action != "shown" else 0)
        unclear = []
        for r in by_rule.values():
            handled = r["fixed"] + r["dismissed"]
            rate = r["dismissed"] / handled if handled else 0
            r["dismissal_rate"] = round(rate, 2)
            if handled >= 5 and rate >= 0.4:
                top = max(set(r["reasons"]), key=r["reasons"].count) if r["reasons"] else "no reason given"
                unclear.append({"rule_id": r["rule_id"], "title": r["title"], "dismissal_rate": round(rate, 2), "n": handled,
                                "top_reason": top, "advice": "Probably unclear: add an approved example or a clearer wording to this rule instead of blaming creators."})
        subs = s.scalars(select(Submission).where(Submission.brand_id == brand_id)).all()
        return {"by_rule": sorted(by_rule.values(), key=lambda r: -(r["fixed"] + r["dismissed"] + r["shown"])), "by_category": by_cat,
                "by_team": by_team, "unclear_rules": sorted(unclear, key=lambda x: -x["dismissal_rate"]),
                "pipeline": {k: sum(1 for x in subs if x.status == k) for k in ("draft", "in_review", "escalated", "changes_requested", "approved", "published")}}


@app.get("/api/audit")
def audit(limit: int = 100):
    with Session() as s:
        rows = s.scalars(select(Audit).order_by(Audit.id.desc()).limit(limit)).all()
        return {"chain": verify_chain(s), "events": [dict(id=a.id, ts=a.ts.isoformat(), actor=a.actor, action=a.action, target=a.target, detail=a.detail, hash=a.hash[:12]) for a in rows]}


# ---------------- Reel Studio
def load_reels(s, brand_id, platform):
    rows = s.scalars(select(Reel).where(Reel.brand_id == brand_id, Reel.platform == platform)).all()
    src = {r.source for r in rows}
    real = [r for r in rows if r.source != "demo"]
    use = real or rows
    return [r.data for r in use], ("real" if real else "demo" if rows else "none")


@app.get("/api/reels/status")
def reels_status(brand_id: str):
    with Session() as s:
        tok = s.get(Setting, f"ig_token:{brand_id}")
    return {"instagram_configured": ig.configured(), "connected": bool(tok)}


@app.get("/api/reels/analysis")
def reels_analysis(brand_id: str, platform: str = "instagram"):
    with Session() as s:
        b = brand_cfg(s, brand_id)
        rows, src = load_reels(s, brand_id, platform)
        a = rl.analyse(rows)
        return {"source": src, "analysis": a, "recommendations": rl.recommendations(a, b.niche), "niche": b.niche,
                "playbook": NICHE_PLAYBOOKS.get(b.niche, {}).get("audience")}


@app.post("/api/reels/demo")
def reels_demo(brand_id: str, platform: str = "instagram"):
    with Session() as s:
        b = brand_cfg(s, brand_id)
        s.query(Reel).filter_by(brand_id=brand_id, platform=platform, source="demo").delete()
        for r in rl.generate_demo(brand_id, b.niche, seed=secrets.randbelow(10 ** 6)):
            s.add(Reel(brand_id=brand_id, platform=platform, source="demo", data=r))
        s.commit()
    return {"ok": True}


class CsvIn(BaseModel):
    brand_id: str
    platform: str = "instagram"
    csv_text: str


@app.post("/api/reels/import")
def reels_import(b: CsvIn):
    """CSV import works for any platform (YouTube Shorts, TikTok, Reels exports). Columns: see README."""
    nums = ["duration", "hour", "views", "reach", "avg_watch_sec", "likes", "comments", "shares", "saves", "profile_visits", "link_clicks", "leads"]
    rows = []
    for i, r in enumerate(csv.DictReader(io.StringIO(b.csv_text))):
        d = {"id": f"csv{i}", "caption": r.get("caption", ""), "posted_at": r.get("posted_at", "")}
        for k in nums:
            try:
                d[k] = float(r[k]) if r.get(k) not in (None, "") else None
            except ValueError:
                d[k] = None
        d["reach"] = d["reach"] or d["views"] or 0
        hook, cta = rl.classify_caption(r.get("caption"))
        d["hook_type"] = r.get("hook_type") or hook
        d["cta_type"] = r.get("cta_type") or cta
        rows.append(d)
    if len(rows) < 3:
        raise HTTPException(422, "Need at least 3 rows with a header line.")
    with Session() as s:
        brand_cfg(s, b.brand_id)
        s.query(Reel).filter_by(brand_id=b.brand_id, platform=b.platform, source="csv").delete()
        for d in rows:
            s.add(Reel(brand_id=b.brand_id, platform=b.platform, source="csv", data=d))
        s.commit()
    return {"ok": True, "imported": len(rows)}


@app.get("/api/instagram/login")
def ig_login(brand_id: str):
    if not ig.configured():
        raise HTTPException(400, "Instagram login is not configured. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env (see README), or use demo data / CSV import.")
    return {"url": ig.login_url(brand_id)}


@app.get("/api/instagram/callback")
def ig_callback(code: str, state: str = ""):
    try:
        token = ig.exchange_code(code.split("#")[0])
        rows = ig.fetch_reels(token)
    except Exception as e:
        raise HTTPException(502, f"Instagram sign-in failed: {e}")
    with Session() as s:
        s.merge(Setting(key=f"ig_token:{state}", value={"token": token}))
        s.query(Reel).filter_by(brand_id=state, platform="instagram", source="instagram").delete()
        for d in rows:
            s.add(Reel(brand_id=state, platform="instagram", source="instagram", data=d))
        log_audit(s, "system", "instagram.connected", state, {"reels": len(rows)})
        s.commit()
    return RedirectResponse("/#/reels")


class IdeaIn(BaseModel):
    brand_id: str
    topic: str
    goal: str = "conversions"
    duration: int | None = None
    platform: str = "instagram"


@app.post("/api/reels/ideas")
def reels_ideas(b: IdeaIn):
    with Session() as s:
        br = brand_cfg(s, b.brand_id)
        rows, _ = load_reels(s, b.brand_id, b.platform)
        return rl.ideas(rl.analyse(rows), br.niche, b.topic, b.goal, b.duration, playbook=br.config.get("playbook"), hashtags=br.config.get("hashtags"))


class PredictIn(BaseModel):
    brand_id: str
    hook_type: str
    cta_type: str
    duration: int
    hour: int
    platform: str = "instagram"


@app.post("/api/reels/predict")
def reels_predict(b: PredictIn):
    with Session() as s:
        rows, _ = load_reels(s, b.brand_id, b.platform)
    return rl.predict(rl.analyse(rows), b.hook_type, b.cta_type, b.duration, b.hour) or {"label": "inconclusive", "note": "No data yet."}


# ---------------- Frontend: built Next.js app (frontend/out) if present, else a tiny notice
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "frontend" / "out"
if OUT.exists():
    app.mount("/", StaticFiles(directory=OUT, html=True), name="web")
else:
    @app.get("/")
    def index():
        return {"message": "API is running. Build the Next.js frontend (cd frontend && npm install && npm run build) or run it with npm run dev. API docs: /docs"}
