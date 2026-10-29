"""BrandGuard modules: calendar, offers, engagement automation, publishing, agent studio, trends, overview, images, ingestion."""
import base64, os, re, statistics as st, time
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func

from . import engine as eng, reels as rl, instagram as ig
from .brands_seed import AGENTS, BASELINE_MINUTES, NICHE_PLAYBOOKS
from .db import (Session, ContentItem, ReplyRule, EngagementEvent, Lead, PublishJob, AgentTask, AgentEvent, Trend, Submission,
                 Version, Audit, FindingEvent, Setting, Reel, log_audit)
from .deps import user_dep, need, brand_cfg, get_setting, set_setting

r = APIRouter(prefix="/api")


def _rows(s, bid, platform="instagram"):
    rows = s.scalars(select(Reel).where(Reel.brand_id == bid, Reel.platform == platform)).all()
    real = [x for x in rows if x.source != "demo"]
    return [x.data for x in (real or rows)]


# =============================================================== Offers (read helpers; edited via guidelines)
@r.get("/offers")
def offers(brand_id: str):
    with Session() as s:
        cfg = brand_cfg(s, brand_id).config
    today = date.today().isoformat()
    out = []
    for o in cfg.get("offers", []):
        live = o["start"] <= today <= o["end"]
        days = (date.fromisoformat(o["end"]) - date.today()).days
        out.append(dict(o, live=live, days_left=days, state="live" if live else "expired" if today > o["end"] else "upcoming"))
    return out


class OfferIn(BaseModel):
    brand_id: str
    offer: dict


@r.post("/offers")
def offer_save(b: OfferIn, user=Depends(user_dep)):
    need(user, "manager", "admin")
    o = b.offer
    for k in ("id", "name", "price", "start", "end", "terms"):
        if not o.get(k):
            raise HTTPException(422, f"Offer needs {k}.")
    o.setdefault("keywords", [o["name"].lower()]); o.setdefault("owner", user["id"]); o["status"] = "approved"
    with Session() as s:
        br = brand_cfg(s, b.brand_id)
        cfg = dict(br.config)
        cfg["offers"] = [x for x in cfg.get("offers", []) if x["id"] != o["id"]] + [o]
        br.config = cfg
        log_audit(s, user["id"], "offer.saved", o["id"], {"start": o["start"], "end": o["end"]})
        s.commit()
    return {"ok": True}


# =============================================================== Calendar
class ItemIn(BaseModel):
    brand_id: str
    title: str
    date: str
    time: str = "19:00"
    channel: str = "instagram"
    format: str = "reel"
    objective: str = "conversions"
    audience: str = ""
    funnel_stage: str = "awareness"
    owner_id: str = ""
    approval_deadline: str = ""
    status: str = "planned"
    submission_id: int | None = None
    notes: str = ""


def _item(i):
    return {c.name: getattr(i, c.name) for c in i.__table__.columns}


@r.get("/calendar")
def cal_list(brand_id: str):
    with Session() as s:
        rows = s.scalars(select(ContentItem).where(ContentItem.brand_id == brand_id).order_by(ContentItem.date, ContentItem.time)).all()
        today = date.today().isoformat()
        out = []
        for i in rows:
            d = _item(i)
            d["deadline_risk"] = bool(i.approval_deadline and i.approval_deadline <= (date.today() + timedelta(days=2)).isoformat()
                                      and i.status not in ("approved", "published"))
            out.append(d)
        return out


@r.post("/calendar")
def cal_add(b: ItemIn, user=Depends(user_dep)):
    with Session() as s:
        brand_cfg(s, b.brand_id)
        i = ContentItem(**b.model_dump()); i.owner_id = b.owner_id or user["id"]
        s.add(i); s.flush()
        log_audit(s, user["id"], "calendar.added", f"item#{i.id}", {"title": b.title, "date": b.date})
        s.commit()
        return _item(i)


@r.patch("/calendar/{iid}")
def cal_patch(iid: int, body: dict, user=Depends(user_dep)):
    with Session() as s:
        i = s.get(ContentItem, iid)
        if not i:
            raise HTTPException(404)
        for k, v in body.items():
            if k in ("title", "date", "time", "channel", "format", "objective", "audience", "funnel_stage", "owner_id", "approval_deadline", "status", "submission_id", "notes"):
                setattr(i, k, v)
        s.commit()
        return _item(i)


@r.delete("/calendar/{iid}")
def cal_del(iid: int, user=Depends(user_dep)):
    with Session() as s:
        i = s.get(ContentItem, iid)
        if i:
            s.delete(i); s.commit()
    return {"ok": True}


class PlanIn(BaseModel):
    brand_id: str
    weeks: int = 2
    per_week: int = 3
    objective: str = "conversions"
    platform: str = "instagram"


@r.post("/calendar/plan")
def cal_plan(b: PlanIn, user=Depends(user_dep)):
    """Plans from past performance: best hook types and best posting hours first. Labelled as tests when data is thin."""
    with Session() as s:
        br = brand_cfg(s, b.brand_id)
        a = rl.analyse(_rows(s, b.brand_id, b.platform))
        hooks = [g["name"] for g in a["groups"]["hook_type"]] if a.get("count") else rl.HOOKS
        hrs = [g for g in a["groups"]["posting_time"]] if a.get("count") else []
        hour_map = {"morning (6-11)": "09:00", "afternoon (12-16)": "14:00", "evening (17-21)": "19:00", "late night (22-5)": "22:30"}
        best_times = [hour_map[g["name"]] for g in hrs[:2]] or ["19:00"]
        pb = {"audience": br.config.get("audience") or (br.config.get("playbook") or {}).get("audience", "")}
        topics = ["myth vs fact", "customer question of the week", "behind the scenes", "how it works", "before and after", "common mistake"]
        made, start, k = [], date.today() + timedelta(days=1), 0
        for w in range(b.weeks):
            for j in range(b.per_week):
                d = start + timedelta(days=w * 7 + [0, 2, 4, 1, 3, 5][j % 6])
                hook = hooks[k % min(3, len(hooks))]
                it = ContentItem(brand_id=b.brand_id, title=f"{topics[k % len(topics)].capitalize()} ({hook} hook)", date=d.isoformat(), time=best_times[k % len(best_times)],
                                 channel=b.platform, format="reel", objective=b.objective, audience=pb["audience"],
                                 funnel_stage="consideration" if b.objective == "conversions" else "awareness", owner_id=user["id"],
                                 approval_deadline=(d - timedelta(days=2)).isoformat(), status="planned",
                                 notes=("Based on your best-performing patterns." if a.get("count", 0) >= 15 else "Test: not enough history yet.") + " Posting time is a recommendation, not a guarantee.")
                s.add(it); made.append(it); k += 1
        s.flush()
        log_audit(s, user["id"], "calendar.planned", b.brand_id, {"items": len(made)})
        s.commit()
        return [_item(i) for i in made]


# =============================================================== Trend board (human-curated; no live feed)
class TrendIn(BaseModel):
    brand_id: str
    kind: str
    label: str
    note: str = ""


@r.get("/trends")
def trends(brand_id: str):
    with Session() as s:
        return [{"id": t.id, "kind": t.kind, "label": t.label, "note": t.note, "added_by": t.added_by, "ts": t.ts.isoformat(), "active": bool(t.active)}
                for t in s.scalars(select(Trend).where(Trend.brand_id == brand_id).order_by(Trend.id.desc()))]


@r.post("/trends")
def trend_add(b: TrendIn, user=Depends(user_dep)):
    with Session() as s:
        s.add(Trend(brand_id=b.brand_id, kind=b.kind, label=b.label.strip(), note=b.note, added_by=user["id"]))
        s.commit()
    return {"ok": True}


@r.delete("/trends/{tid}")
def trend_del(tid: int, user=Depends(user_dep)):
    with Session() as s:
        t = s.get(Trend, tid)
        if t:
            t.active = 0; s.commit()
    return {"ok": True}


# =============================================================== Engagement automation (ManyChat-style, with controls)
INTENTS = [("legal", r"\b(lawyer|legal|sue|court|consumer forum|fraud|scam|police|defam)"),
           ("opt_out", r"\b(stop|unsubscribe|opt[\s-]?out|don'?t (?:message|dm)|leave me alone)\b"),
           ("complaint", r"\b(refund|complain|not working|broken|worst|cheat|money back|damaged|disappointed)"),
           ("price", r"\b(price|cost|how much|rate|pricing|quote)\b|₹|\brs\.?\b"),
           ("demo", r"\b(demo|book|appointment|site visit|call me|callback|visit)\b")]
MAX_REPLIES_PER_USER_24H = 2   # default; each brand can change it in Brand HQ settings


def classify(text):
    for name, rx in INTENTS:
        if re.search(rx, text, re.I):
            return name
    return "unknown"


def _approved_price(cfg):
    today = date.today().isoformat()
    live = [o for o in cfg.get("offers", []) if o["start"] <= today <= o["end"]]
    return live[0] if live else None


class SimIn(BaseModel):
    brand_id: str
    handle: str
    text: str
    kind: str = "comment"      # comment | dm | story_reply
    event_id: str = ""


@r.post("/engagement/simulate")
def engagement(b: SimIn, user=Depends(user_dep)):
    with Session() as s:
        br = brand_cfg(s, b.brand_id); cfg = br.config
        eid = b.event_id or f"{b.handle}:{b.kind}:{hash(b.text) & 0xffffff}"
        paused = get_setting(s, f"eng_paused:{b.brand_id}", False)
        test_mode = get_setting(s, f"eng_test:{b.brand_id}", True)
        dup = s.scalars(select(EngagementEvent).where(EngagementEvent.brand_id == b.brand_id, EngagementEvent.event_id == eid)).first()
        intent = classify(b.text)
        ev = dict(brand_id=b.brand_id, event_id=eid, handle=b.handle, kind=b.kind, text=b.text, intent=intent, action="escalated", reply="",
                  template_version="", delivery="not_sent", handoff="")
        since = datetime.utcnow() - timedelta(hours=24)
        sent = s.scalar(select(func.count()).select_from(EngagementEvent).where(EngagementEvent.brand_id == b.brand_id, EngagementEvent.handle == b.handle,
                        EngagementEvent.action == "replied", EngagementEvent.ts > since)) or 0
        opted = s.scalars(select(EngagementEvent).where(EngagementEvent.brand_id == b.brand_id, EngagementEvent.handle == b.handle, EngagementEvent.action == "opted_out")).first()
        deliver = "simulated" if test_mode else "not_sent"       # a real connector must confirm before this says "confirmed"
        if dup:
            ev.update(action="skipped_duplicate", handoff="none")
        elif paused:
            ev.update(action="paused", handoff="human queue")
        elif intent == "opt_out":
            ev.update(action="opted_out", handoff="none")
        elif opted:
            ev.update(action="skipped_optout", handoff="none")
        elif intent == "legal":
            ev.update(action="escalated", handoff="legal/owner (automation paused for this thread)")
        elif sent >= eng.setting(cfg, "max_replies_24h"):
            ev.update(action="skipped_limit", handoff="human queue")
        elif intent == "complaint":
            ev.update(action="replied", reply=f"We are sorry about this. Our support team will contact you shortly ({cfg.get('support_contact')}). Nothing here changes your rights.",
                      template_version="complaint-v1", delivery=deliver, handoff="support")
        elif intent == "price":
            o = _approved_price(cfg)
            if o:
                ev.update(action="replied", reply=f"{o['name']}: {o['price']}. {o['terms']}", template_version=f"offer:{o['id']}", delivery=deliver, handoff="")
            else:
                ev.update(action="escalated", handoff="sales (no approved live price: not verified)")
        elif intent == "demo":
            ev.update(action="replied", reply=f"Happy to help. You can pick a slot here: {cfg.get('booking_link')}. What city are you in?", template_version="demo-v1", delivery=deliver, handoff="sales")
        else:
            rule = next((x for x in s.scalars(select(ReplyRule).where(ReplyRule.brand_id == b.brand_id, ReplyRule.active == 1))
                         if re.search(r"\b" + re.escape(x.keyword) + r"\b", b.text, re.I)), None)
            if rule:
                ev.update(action="replied", reply=rule.template, template_version=f"kw:{rule.keyword}-v{rule.version}", delivery=deliver)
            else:
                ev.update(action="escalated", handoff="human queue (low confidence)")
        e = EngagementEvent(**ev); s.add(e)
        if intent in ("price", "demo") and ev["action"] in ("replied", "escalated") and not dup and not paused:
            s.add(Lead(brand_id=b.brand_id, handle=b.handle, need=b.text[:200], fit="likely" if ev["action"] == "replied" else "unknown",
                       intent="high" if intent == "demo" else "medium", owner="sales"))
        s.add(AgentEvent(brand_id=b.brand_id, agent="community", kind="DONE", message=f"{b.kind} from @{b.handle}: {intent} -> {ev['action']}"))
        s.commit()
        return {k: ev[k] for k in ("intent", "action", "reply", "template_version", "delivery", "handoff")} | {"test_mode": test_mode, "paused": paused}


@r.get("/engagement/state")
def eng_state(brand_id: str):
    with Session() as s:
        rules = [dict(id=x.id, keyword=x.keyword, template=x.template, version=x.version, active=bool(x.active)) for x in s.scalars(select(ReplyRule).where(ReplyRule.brand_id == brand_id))]
        ev = [dict(ts=e.ts.isoformat(), handle=e.handle, kind=e.kind, text=e.text, intent=e.intent, action=e.action, reply=e.reply, template=e.template_version, delivery=e.delivery, handoff=e.handoff)
              for e in s.scalars(select(EngagementEvent).where(EngagementEvent.brand_id == brand_id).order_by(EngagementEvent.id.desc()).limit(40))]
        leads = [dict(id=l.id, handle=l.handle, need=l.need, fit=l.fit, intent=l.intent, owner=l.owner, status=l.status) for l in s.scalars(select(Lead).where(Lead.brand_id == brand_id).order_by(Lead.id.desc()).limit(30))]
        return {"paused": get_setting(s, f"eng_paused:{brand_id}", False), "test_mode": get_setting(s, f"eng_test:{brand_id}", True), "rules": rules, "events": ev, "leads": leads,
                "max_replies_per_user_24h": eng.setting(brand_cfg(s, brand_id).config, "max_replies_24h")}


class SwitchIn(BaseModel):
    brand_id: str
    key: str     # paused | test
    value: bool


@r.post("/engagement/switch")
def eng_switch(b: SwitchIn, user=Depends(user_dep)):
    need(user, "manager", "admin")
    if b.key not in ("paused", "test"):
        raise HTTPException(422, "key must be paused or test")
    with Session() as s:
        set_setting(s, f"eng_{b.key}:{b.brand_id}", b.value)
        log_audit(s, user["id"], f"engagement.{b.key}", b.brand_id, {"value": b.value})
        s.commit()
    return {"ok": True}


class RuleIn(BaseModel):
    brand_id: str
    keyword: str
    template: str


@r.post("/engagement/rules")
def eng_rule(b: RuleIn, user=Depends(user_dep)):
    need(user, "manager", "admin")
    with Session() as s:
        ex = s.scalars(select(ReplyRule).where(ReplyRule.brand_id == b.brand_id, ReplyRule.keyword == b.keyword.upper())).first()
        if ex:
            ex.template, ex.version = b.template, ex.version + 1
        else:
            s.add(ReplyRule(brand_id=b.brand_id, keyword=b.keyword.upper(), template=b.template))
        log_audit(s, user["id"], "engagement.rule_saved", b.keyword.upper(), {})
        s.commit()
    return {"ok": True}


# =============================================================== Publishing (dry-run by default)
class PubIn(BaseModel):
    brand_id: str
    submission_id: int
    platform: str = "instagram"
    scheduled_at: str
    video_url: str = ""


def _gate(s, sub, brand_id, user_id=None):
    """Release gate: approved, re-checked now (offers may have expired since approval), automation not paused."""
    reasons = []
    if sub.status not in ("approved", "published"):
        reasons.append(f"Submission is {sub.status}; it must be approved first.")
    v = s.scalars(select(Version).where(Version.submission_id == sub.id).order_by(Version.n.desc())).first()
    cfg = brand_cfg(s, brand_id).config
    fresh = eng.run_review(v.text, cfg, visual=v.visual, alt_text=v.alt_text, has_image=bool(v.has_image), channel=sub.channel)
    for f in fresh:
        if f["severity"] == "critical" or f["rule_id"] in ("OFFER-001",):
            reasons.append(f"Re-check found {f['title']}: {f['evidence']}")
    if get_setting(s, f"pub_paused:{brand_id}", False):
        reasons.append("Publishing is paused for this brand.")
    return reasons, v


@r.post("/publish")
def pub_schedule(b: PubIn, user=Depends(user_dep)):
    need(user, "manager", "reviewer")
    with Session() as s:
        sub = s.get(Submission, b.submission_id)
        if not sub:
            raise HTTPException(404, "Unknown submission")
        reasons, v = _gate(s, sub, b.brand_id)
        key = f"{b.submission_id}:{b.platform}:{b.scheduled_at}"
        if s.scalars(select(PublishJob).where(PublishJob.idem == key)).first():
            raise HTTPException(409, "This exact post is already scheduled (duplicate protection).")
        job = PublishJob(brand_id=b.brand_id, submission_id=b.submission_id, platform=b.platform, scheduled_at=b.scheduled_at, video_url=b.video_url,
                         status="blocked" if reasons else "scheduled", idem=key, result={"blocked_because": reasons} if reasons else {})
        s.add(job); s.flush()
        log_audit(s, user["id"], "publish.scheduled" if not reasons else "publish.blocked", f"job#{job.id}", {"reasons": reasons})
        s.commit()
        return {"id": job.id, "status": job.status, "reasons": reasons}


@r.post("/publish/{jid}/run")
def pub_run(jid: int, user=Depends(user_dep)):
    need(user, "manager", "reviewer")
    with Session() as s:
        job = s.get(PublishJob, jid)
        if not job:
            raise HTTPException(404)
        if job.status in ("published", "dry_run_ok"):
            raise HTTPException(409, "Already executed (duplicate protection).")
        sub = s.get(Submission, job.submission_id)
        reasons, v = _gate(s, sub, job.brand_id)
        if reasons:
            job.status, job.result = "blocked", {"blocked_because": reasons}; s.commit()
            return {"status": "blocked", "reasons": reasons}
        live = os.getenv("PUBLISH_LIVE", "0") == "1"
        tok = s.get(Setting, f"ig_token:{job.brand_id}")
        try:
            if live and tok and job.platform == "instagram" and job.video_url:
                res = ig.publish_reel(tok.value["token"], job.video_url, v.text, dry_run=False)
            else:
                res = ig.publish_reel(None, job.video_url, v.text, dry_run=True)
        except Exception as e:
            job.status, job.result = "failed", {"error": str(e)}
            log_audit(s, user["id"], "publish.failed", f"job#{jid}", {"error": str(e)}); s.commit()
            return {"status": "failed", "error": str(e)}
        job.status = "published" if res.get("delivery") == "confirmed" else "dry_run_ok"
        job.result = res
        if job.status == "published":
            sub.status = "published"
        log_audit(s, user["id"], "publish.run", f"job#{jid}", res)
        s.commit()
        return {"status": job.status, **res}


@r.get("/publish")
def pub_list(brand_id: str):
    with Session() as s:
        jobs = [dict(id=j.id, submission_id=j.submission_id, platform=j.platform, scheduled_at=j.scheduled_at, status=j.status, result=j.result) for j in
                s.scalars(select(PublishJob).where(PublishJob.brand_id == brand_id).order_by(PublishJob.id.desc()))]
        subs = [dict(id=x.id, title=x.title, channel=x.channel) for x in s.scalars(select(Submission).where(Submission.brand_id == brand_id, Submission.status.in_(["approved", "published"])))]
        return {"jobs": jobs, "approved": subs, "paused": get_setting(s, f"pub_paused:{brand_id}", False), "live_enabled": os.getenv("PUBLISH_LIVE", "0") == "1"}


@r.post("/publish/pause")
def pub_pause(b: SwitchIn, user=Depends(user_dep)):
    need(user, "manager", "admin")
    with Session() as s:
        set_setting(s, f"pub_paused:{b.brand_id}", b.value)
        log_audit(s, user["id"], "publish.pause", b.brand_id, {"value": b.value}); s.commit()
    return {"ok": True}


# =============================================================== Agent studio (the "AI marketing department")
def _ev(s, bid, task, agent, kind, msg):
    s.add(AgentEvent(brand_id=bid, task_id=task.id if task else None, agent=agent, kind=kind, message=msg)); s.flush()


class RunIn(BaseModel):
    brand_id: str
    topic: str
    goal: str = "conversions"
    platform: str = "instagram"


@r.post("/studio/run")
def studio_run(b: RunIn, user=Depends(user_dep)):
    """Runs a real, deterministic pipeline using the same modules as the rest of the product. Humans still approve."""
    t0 = time.time()
    with Session() as s:
        br = brand_cfg(s, b.brand_id); cfg = br.config
        task = AgentTask(brand_id=b.brand_id, title=f"Reel on '{b.topic}'"); s.add(task); s.flush()
        saved = 0; out = {}
        try:
            _ev(s, b.brand_id, task, "director", "START", f"Brief for '{b.topic}' (goal: {b.goal})")
            brief = {"objective": b.goal, "audience": cfg.get("audience"), "channel": b.platform, "active_offer": (_approved_price(cfg) or {}).get("name")}
            _ev(s, b.brand_id, task, "director", "DONE", f"Brief ready. Audience: {brief['audience']}. Offer: {brief['active_offer'] or 'none live'}"); saved += BASELINE_MINUTES["brief"]
            _ev(s, b.brand_id, task, "analyst", "START", "Reading platform export and ranking patterns")
            a = rl.analyse(_rows(s, b.brand_id, b.platform))
            recs = rl.recommendations(a, br.niche)
            _ev(s, b.brand_id, task, "analyst", "STEP", f"{a.get('count', 0)} reels analysed; top pattern: {recs[0]['advice'] if recs else 'not enough data'}")
            _ev(s, b.brand_id, task, "analyst", "DONE", "Proposed one test: change only the opening, keep topic and CTA fixed"); saved += BASELINE_MINUTES["analysis"]
            _ev(s, b.brand_id, task, "scriptwriter", "START", "Writing hooks, script, CTA and caption")
            ideas = rl.ideas(a, br.niche, b.topic, b.goal, playbook=cfg.get("playbook"), hashtags=cfg.get("hashtags"))
            trends_ = [t.label for t in s.scalars(select(Trend).where(Trend.brand_id == b.brand_id, Trend.active == 1).limit(3))]
            _ev(s, b.brand_id, task, "scriptwriter", "SEND", f"Script ({ideas['target_seconds']}s) -> QA editor" + (f"; active trends considered: {', '.join(trends_)}" if trends_ else ""))
            caption = ideas["caption"]
            offer = _approved_price(cfg)
            if offer:
                caption = caption.split("\n\n")[0] + f"\n\n{offer['name']}: {offer['price']}.\n\n" + ideas["cta"]["text"] + "\n\n" + " ".join(cfg.get("hashtags", []))
            _ev(s, b.brand_id, task, "scriptwriter", "DONE", "Draft ready"); saved += BASELINE_MINUTES["script"]
            _ev(s, b.brand_id, task, "qa", "START", "Running BrandGuard rules on the caption")
            before = eng.run_review(caption, cfg, channel=b.platform)
            fixed = eng.apply_all_safe(caption, cfg, channel=b.platform)
            _ev(s, b.brand_id, task, "qa", "STEP", f"{len(before)} findings, {len(fixed['applied'])} safe fixes applied, {len(fixed['findings'])} remain")
            _ev(s, b.brand_id, task, "qa", "SEND", "PASS -> compliance" if not fixed["findings"] else "NEEDS HUMAN -> compliance"); saved += BASELINE_MINUTES["qa"]
            _ev(s, b.brand_id, task, "compliance", "START", "Routing by risk")
            status, top = eng.route_for(fixed["findings"], cfg)
            sub = Submission(brand_id=b.brand_id, title=f"Studio: {b.topic}", channel=b.platform, author_id=user["id"], status=status, top_severity=top)
            s.add(sub); s.flush()
            s.add(Version(submission_id=sub.id, n=1, text=fixed["text"], findings=fixed["findings"], dismissals=[], visual={}, alt_text="", has_image=0))
            log_audit(s, user["id"], "studio.submission", f"#{sub.id}", {"route": status, "top": top, "task": task.id})
            _ev(s, b.brand_id, task, "compliance", "DONE", f"Submission #{sub.id} sent to {'a Reviewer' if status == 'escalated' else 'a Manager'} (risk: {top})"); saved += BASELINE_MINUTES["compliance"]
            _ev(s, b.brand_id, task, "producer", "START", "Finding the next best slot")
            hr = {"morning (6-11)": "09:00", "afternoon (12-16)": "14:00", "evening (17-21)": "19:00", "late night (22-5)": "22:30"}
            best = a["groups"]["posting_time"][0]["name"] if a.get("count") else "evening (17-21)"
            d = date.today() + timedelta(days=3)
            item = ContentItem(brand_id=b.brand_id, title=f"Studio: {b.topic}", date=d.isoformat(), time=hr[best], channel=b.platform, objective=b.goal, audience=brief["audience"] or "",
                               owner_id=user["id"], approval_deadline=(d - timedelta(days=1)).isoformat(), status="in_review", submission_id=sub.id, notes="Slot from your best posting window. A recommendation, not a guarantee.")
            s.add(item); s.flush()
            _ev(s, b.brand_id, task, "producer", "DONE", f"Added to calendar {d.isoformat()} {hr[best]}"); saved += BASELINE_MINUTES["calendar"]
            _ev(s, b.brand_id, task, "postproducer", "START", "Preparing the edit kit")
            kit = [f"{x['time']}: {x['beat']} - {x['do']}" for x in ideas["script"]] + ["Add on-screen captions and alt text", f"Cover frame: the hook text '{ideas['hooks'][0]['text'][:50]}'"]
            _ev(s, b.brand_id, task, "postproducer", "DONE", "Edit kit ready"); saved += BASELINE_MINUTES["editkit"]
            task.status, task.finished, task.minutes_saved = "done", datetime.utcnow(), saved
            out = {"task_id": task.id, "caption": fixed["text"], "remaining_findings": fixed["findings"], "applied": fixed["applied"], "submission_id": sub.id, "route": status,
                   "calendar_item": item.id, "script": ideas["script"], "hooks": ideas["hooks"], "edit_kit": kit, "recommendations": recs, "minutes_saved_estimate": saved,
                   "note": "A human must approve before anything is published."}
            task.result = {k: out[k] for k in ("submission_id", "route", "calendar_item")}
        except Exception as e:
            task.status, task.finished = "error", datetime.utcnow()
            _ev(s, b.brand_id, task, "director", "ERROR", str(e)[:200]); s.commit()
            raise HTTPException(500, f"Pipeline failed: {e}")
        s.commit()
        return out | {"seconds": round(time.time() - t0, 2)}


@r.get("/studio/status")
def studio_status(brand_id: str, agent: str = ""):
    with Session() as s:
        evs = s.scalars(select(AgentEvent).where(AgentEvent.brand_id == brand_id).order_by(AgentEvent.id.desc()).limit(300)).all()
        last = {}
        for e in evs:
            last.setdefault(e.agent, e)
        now = datetime.utcnow()
        agents = []
        for a in AGENTS:
            e = last.get(a["id"])
            state = "idle" if not e else "working" if e.kind in ("START", "STEP", "SEND") and (now - e.ts).seconds < 8 else "error" if e.kind == "ERROR" else "idle"
            agents.append(a | {"state": state, "last": e.message if e else "", "last_kind": e.kind if e else ""})
        tasks = s.scalars(select(AgentTask).where(AgentTask.brand_id == brand_id).order_by(AgentTask.id.desc()).limit(30)).all()
        done = [t for t in tasks if t.status == "done"]; errs = [t for t in tasks if t.status == "error"]
        durs = [(t.finished - t.created).total_seconds() for t in done if t.finished]
        log = [dict(ts=e.ts.strftime("%H:%M:%S"), agent=e.agent, kind=e.kind, message=e.message) for e in evs if not agent or e.agent == agent][:60]
        mins = sum(t.minutes_saved for t in done)
        return {"agents": agents, "tasks": [dict(id=t.id, title=t.title, status=t.status, minutes_saved=t.minutes_saved) for t in tasks], "log": log,
                "global": {"tasks_done": len(done), "errors": len(errs), "success_rate": round(100 * len(done) / max(len(done) + len(errs), 1)),
                           "avg_seconds": round(st.mean(durs), 1) if durs else 0, "minutes_saved": round(mins), "xp": len(done) * 120 + len(evs) * 3},
                "baseline_minutes": BASELINE_MINUTES,
                "disclaimer": "Minutes saved are estimates from assumed human baselines. Measure your own medians in a pilot."}


# =============================================================== Overview, notifications, KPIs
@r.get("/overview")
def overview(brand_id: str):
    with Session() as s:
        cfg = brand_cfg(s, brand_id).config
        subs = s.scalars(select(Submission).where(Submission.brand_id == brand_id)).all()
        approvals = s.scalars(select(Audit).where(Audit.action == "submission.approve")).all()
        turn = []
        for a in approvals:
            sid = int(a.target.strip("#")) if a.target.startswith("#") else None
            sub = next((x for x in subs if x.id == sid), None)
            if sub:
                turn.append((a.ts - sub.created).total_seconds() / 3600)
        changes = sum(1 for x in subs if x.status == "changes_requested")
        eng_ev = s.scalars(select(EngagementEvent).where(EngagementEvent.brand_id == brand_id)).all()
        eligible = [e for e in eng_ev if e.action in ("replied", "escalated")]
        tasks = s.scalars(select(AgentTask).where(AgentTask.brand_id == brand_id, AgentTask.status == "done")).all()
        notes, today = [], date.today()
        for o in cfg.get("offers", []):
            end = date.fromisoformat(o["end"])
            if 0 <= (end - today).days <= 14:
                notes.append({"level": "warn", "text": f"Offer '{o['name']}' ends in {(end - today).days} days. Drafts that mention it will be blocked after that."})
            elif end < today:
                notes.append({"level": "info", "text": f"Offer '{o['name']}' expired on {o['end']}. Any draft that mentions it is flagged as critical."})
        for f in cfg.get("facts", []):
            if eng._stale(f, eng.setting(cfg, "fact_stale_days")):
                notes.append({"level": "warn", "text": f"Fact '{f['label']}' was last reviewed {f['reviewed']}. Re-approve it."})
        for i in s.scalars(select(ContentItem).where(ContentItem.brand_id == brand_id, ContentItem.status.in_(["planned", "drafting", "in_review"]))):
            if i.approval_deadline and i.approval_deadline <= (today + timedelta(days=2)).isoformat():
                notes.append({"level": "warn", "text": f"'{i.title}' needs approval by {i.approval_deadline}."})
        if get_setting(s, f"eng_paused:{brand_id}", False):
            notes.append({"level": "info", "text": "Engagement automation is paused."})
        if get_setting(s, f"pub_paused:{brand_id}", False):
            notes.append({"level": "info", "text": "Publishing is paused."})
        latest = {}
        for v in s.scalars(select(Version).where(Version.submission_id.in_([x.id for x in subs]) if subs else False).order_by(Version.n)):
            latest[v.submission_id] = v
        flagged = sum(len(v.findings) for v in latest.values())
        clean = sum(1 for v in latest.values() if not any(f["severity"] in ("major", "critical") for f in v.findings))
        pending = sum(1 for x in subs if x.status in ("in_review", "escalated"))
        stats = {"reviewed": len(subs), "flagged": flagged, "compliance": round(100 * clean / len(latest)) if latest else None, "pending": pending,
                 "facts": len(cfg.get("facts", [])), "rules": len(eng.RULES) + len(cfg.get("custom_rules", [])) - len(cfg.get("disabled_rules", [])),
                 "drafts": sum(1 for x in subs if x.status in ("draft", "changes_requested")), "offers_live": sum(1 for o in cfg.get("offers", []) if o["start"] <= today.isoformat() <= o["end"]),
                 "stale_facts": sum(1 for f in cfg.get("facts", []) if eng._stale(f, eng.setting(cfg, "fact_stale_days")))}
        return {"stats": stats, "kpis": {"submissions": len(subs), "approval_turnaround_hours": round(st.median(turn), 2) if turn else None,
                         "correction_rate": round(100 * changes / len(subs)) if subs else None,
                         "automation_reliability": round(100 * sum(e.delivery in ("simulated", "confirmed") or e.action == "escalated" for e in eligible) / len(eligible)) if eligible else None,
                         "minutes_saved": round(sum(t.minutes_saved for t in tasks)), "studio_tasks": len(tasks)},
                "notifications": notes[:8],
                "services": [
                    {"name": "Digital and performance marketing", "does": "Reel analytics, funnel, experiments, posting windows", "where": "/reels"},
                    {"name": "Brand strategy and design", "does": "Guidelines, palette, fonts, image checks, offers", "where": "/guidelines"},
                    {"name": "Content and social media", "does": "Calendar, scripts, review, approvals, publishing, replies", "where": "/calendar"},
                    {"name": "E-commerce and lead generation", "does": "Intent detection, lead routing, offer-aware answers", "where": "/engagement"}]}


# =============================================================== Images + file ingestion
class ImgIn(BaseModel):
    brand_id: str
    filename: str
    data_b64: str
    alt_text: str = ""


@r.post("/review-image")
def review_image(b: ImgIn):
    try:
        raw = base64.b64decode(b.data_b64.split(",")[-1])
        with Session() as s:
            cfg = brand_cfg(s, b.brand_id).config
        return eng.review_image(raw, cfg, b.alt_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(422, f"Could not read this image: {e}")


class FileIn(BaseModel):
    filename: str
    data_b64: str


@r.post("/extract")
def extract(b: FileIn):
    from .ingest import extract_text
    try:
        t = extract_text(b.filename, base64.b64decode(b.data_b64.split(",")[-1]))
    except Exception as e:
        raise HTTPException(422, str(e))
    return {"text": t[:20000], "truncated": len(t) > 20000}


@r.post("/extract-guidelines")
def extract_guidelines_endpoint(b: FileIn):
    from .ingest import extract_text, extract_guidelines
    try:
        raw_bytes = base64.b64decode(b.data_b64.split(",")[-1])
        text = extract_text(b.filename, raw_bytes)
        rules = extract_guidelines(text)
    except Exception as e:
        raise HTTPException(422, f"Could not parse document: {str(e)}")
    return {"ok": True, "filename": b.filename, "extracted": rules, "sample_text": text[:1000]}


@r.get("/disclosure")
def disclosure(brand_id: str):
    with Session() as s:
        cfg = brand_cfg(s, brand_id).config
    return {"external_ai_enabled": bool(cfg.get("allow_external_ai")) and bool(os.getenv("ANTHROPIC_API_KEY")),
            "services": [{"name": "Anthropic Claude API", "used_for": "Optional rewrites of non-critical text", "data_sent": "The draft text and approved facts only; never text that contains critical/confidential findings",
                          "status": "on" if cfg.get("allow_external_ai") and os.getenv("ANTHROPIC_API_KEY") else "off"},
                         {"name": "Meta Instagram API", "used_for": "Optional sign-in, reel insights, publishing", "data_sent": "OAuth token and the post you choose to publish", "status": "on" if ig.configured() else "off"},
                         {"name": "Google Fonts / CDN", "used_for": "Typefaces in the browser UI", "data_sent": "Browser requests only", "status": "on"}],
            "local_only": ["Rule engine", "Image colour check", "File text extraction", "Reel analytics", "Engagement classifier", "Agent studio pipeline"]}


# =============================================================== Global search
@r.get("/search")
def search(brand_id: str, q: str = ""):
    q = q.strip().lower()
    out = []
    with Session() as s:
        cfg = brand_cfg(s, brand_id).config
        def hit(*vals):
            return not q or any(q in str(v).lower() for v in vals)
        for rid, (cat, sev, title, why) in eng.RULES.items():
            if hit(rid, title, cat, why):
                out.append({"type": "Rule", "title": f"{rid} {title}", "detail": why, "href": "/brand/#rules"})
        for c in cfg.get("custom_rules", []):
            if hit(c["id"], c.get("title"), c.get("pattern")):
                out.append({"type": "Rule", "title": f"{c['id']} {c.get('title', '')}", "detail": c.get("why", ""), "href": "/brand/#custom"})
        for f in cfg.get("facts", []):
            if hit(f["label"], f["replacement"], f["source"]):
                out.append({"type": "Fact", "title": f["label"], "detail": f"{f['replacement']} (source: {f['source']})", "href": "/facts/"})
        for a, b in cfg.get("terms", {}).items():
            if hit(a, b):
                out.append({"type": "Term", "title": f"{a} → {b}", "detail": "Terminology", "href": "/brand/#terms"})
        for o in cfg.get("offers", []):
            if hit(o["name"], o["price"], o["terms"]):
                out.append({"type": "Offer", "title": o["name"], "detail": f"{o['price']} · {o['start']} to {o['end']}", "href": "/brand/#offers"})
        for x in s.scalars(select(Submission).where(Submission.brand_id == brand_id)):
            v = s.scalars(select(Version).where(Version.submission_id == x.id).order_by(Version.n.desc())).first()
            if hit(x.title, v.text if v else ""):
                out.append({"type": "Submission", "title": f"#{x.id} {x.title}", "detail": (v.text[:140] if v else ""), "href": f"/queue/?id={x.id}"})
        for i in s.scalars(select(ContentItem).where(ContentItem.brand_id == brand_id)):
            if hit(i.title, i.notes, i.audience):
                out.append({"type": "Calendar", "title": i.title, "detail": f"{i.date} {i.time} · {i.channel}", "href": "/calendar/"})
        for t in s.scalars(select(Trend).where(Trend.brand_id == brand_id, Trend.active == 1)):
            if hit(t.label, t.note):
                out.append({"type": "Trend", "title": t.label, "detail": t.note, "href": "/reels/"})
    return out[:80]


# =============================================================== Workflow explainer data
@r.get("/workflow")
def workflow(brand_id: str):
    with Session() as s:
        cfg = brand_cfg(s, brand_id).config
        subs = s.scalars(select(Submission).where(Submission.brand_id == brand_id)).all()
    counts = {k: sum(1 for x in subs if x.status == k) for k in ("draft", "in_review", "escalated", "changes_requested", "approved", "published")}
    return {"counts": counts, "reviewer_severities": cfg.get("settings", {}).get("reviewer_severities", eng.DEFAULT_SETTINGS["reviewer_severities"]),
            "steps": [["Submit", "Creator pastes text or uploads a file or image"], ["Check", "Rules, approved facts, offers and your custom rules run locally"],
                      ["Explain", "Each finding shows evidence, rule, reason, fix and confidence"], ["Fix", "One-click fixes are re-verified; dismissals need a reason"],
                      ["Route", "Severity decides whether a manager or an authorised reviewer approves"], ["Approve", "Request changes, approve, or override with written justification"],
                      ["Publish", "Re-checked at schedule time and run time; dry run by default"], ["Learn", "Dismissal patterns reveal unclear guidelines"]]}
