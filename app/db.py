import os, json, hashlib
from datetime import datetime
from sqlalchemy import create_engine, String, Integer, Float, DateTime, JSON, Text, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

default_db = "/tmp/brandguard.db" if os.getenv("VERCEL") else "./brandguard.db"
URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db}")
engine = create_engine(URL, connect_args={"check_same_thread": False} if URL.startswith("sqlite") else {})
Session = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Brand(Base):
    __tablename__ = "brands"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    niche: Mapped[str] = mapped_column(String(40))
    config: Mapped[dict] = mapped_column(JSON)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(20))
    team: Mapped[str] = mapped_column(String(40))


class Submission(Base):
    __tablename__ = "submissions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(160))
    channel: Mapped[str] = mapped_column(String(30))
    author_id: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    top_severity: Mapped[str] = mapped_column(String(10), default="none")
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Version(Base):
    __tablename__ = "versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(Integer)
    n: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    visual: Mapped[dict] = mapped_column(JSON, default=dict)
    alt_text: Mapped[str] = mapped_column(Text, default="")
    has_image: Mapped[int] = mapped_column(Integer, default=0)
    findings: Mapped[list] = mapped_column(JSON, default=list)
    dismissals: Mapped[list] = mapped_column(JSON, default=list)
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(Integer)
    user_id: Mapped[str] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(Text)
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Audit(Base):
    """Append-only, hash-chained audit trail. Editing any row breaks the chain (see /api/audit/verify)."""
    __tablename__ = "audit"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actor: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(60))
    target: Mapped[str] = mapped_column(String(80))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64))


class FindingEvent(Base):
    __tablename__ = "finding_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    brand_id: Mapped[str] = mapped_column(String(40))
    rule_id: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(30))
    action: Mapped[str] = mapped_column(String(12))  # shown | fixed | dismissed
    user_id: Mapped[str] = mapped_column(String(40))
    team: Mapped[str] = mapped_column(String(40), default="")
    reason: Mapped[str] = mapped_column(Text, default="")


class Reel(Base):
    __tablename__ = "reels"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    platform: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(20))  # demo | instagram | csv
    data: Mapped[dict] = mapped_column(JSON)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)


def log_audit(s, actor, action, target, detail=None):
    last = s.execute(select(Audit).order_by(Audit.id.desc()).limit(1)).scalar()
    prev = last.hash if last else "0" * 64
    ts = datetime.utcnow().replace(microsecond=0)
    payload = json.dumps([prev, ts.isoformat(), actor, action, target, detail or {}], sort_keys=True, default=str)
    s.add(Audit(ts=ts, actor=actor, action=action, target=target, detail=detail or {}, prev_hash=prev,
                hash=hashlib.sha256(payload.encode()).hexdigest()))


def verify_chain(s):
    prev = "0" * 64
    for a in s.execute(select(Audit).order_by(Audit.id)).scalars():
        payload = json.dumps([prev, a.ts.replace(microsecond=0).isoformat(), a.actor, a.action, a.target, a.detail or {}], sort_keys=True, default=str)
        if a.prev_hash != prev or a.hash != hashlib.sha256(payload.encode()).hexdigest():
            return {"ok": False, "broken_at": a.id}
        prev = a.hash
    return {"ok": True}


class ContentItem(Base):
    __tablename__ = "content_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(160))
    date: Mapped[str] = mapped_column(String(10))
    time: Mapped[str] = mapped_column(String(5), default="19:00")
    channel: Mapped[str] = mapped_column(String(30), default="instagram")
    format: Mapped[str] = mapped_column(String(30), default="reel")
    objective: Mapped[str] = mapped_column(String(40), default="conversions")
    audience: Mapped[str] = mapped_column(String(160), default="")
    funnel_stage: Mapped[str] = mapped_column(String(20), default="awareness")
    owner_id: Mapped[str] = mapped_column(String(40), default="")
    approval_deadline: Mapped[str] = mapped_column(String(10), default="")
    status: Mapped[str] = mapped_column(String(20), default="planned")
    submission_id: Mapped[int] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class ReplyRule(Base):
    __tablename__ = "reply_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    keyword: Mapped[str] = mapped_column(String(40))
    template: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    active: Mapped[int] = mapped_column(Integer, default=1)


class EngagementEvent(Base):
    __tablename__ = "engagement_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    brand_id: Mapped[str] = mapped_column(String(40))
    event_id: Mapped[str] = mapped_column(String(80))
    handle: Mapped[str] = mapped_column(String(60))
    kind: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    intent: Mapped[str] = mapped_column(String(30))
    action: Mapped[str] = mapped_column(String(30))     # replied | escalated | opted_out | skipped_duplicate | skipped_limit | paused
    reply: Mapped[str] = mapped_column(Text, default="")
    template_version: Mapped[str] = mapped_column(String(20), default="")
    delivery: Mapped[str] = mapped_column(String(30), default="not_sent")   # simulated | confirmed | not_sent
    handoff: Mapped[str] = mapped_column(String(40), default="")


class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    brand_id: Mapped[str] = mapped_column(String(40))
    handle: Mapped[str] = mapped_column(String(60))
    need: Mapped[str] = mapped_column(Text, default="")
    fit: Mapped[str] = mapped_column(String(20), default="unknown")
    intent: Mapped[str] = mapped_column(String(20), default="low")
    owner: Mapped[str] = mapped_column(String(40), default="sales")
    status: Mapped[str] = mapped_column(String(20), default="new")


class PublishJob(Base):
    __tablename__ = "publish_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    submission_id: Mapped[int] = mapped_column(Integer)
    platform: Mapped[str] = mapped_column(String(20))
    scheduled_at: Mapped[str] = mapped_column(String(25))
    video_url: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[str] = mapped_column(String(24), default="scheduled")
    idem: Mapped[str] = mapped_column(String(120), unique=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AgentTask(Base):
    __tablename__ = "agent_tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_id: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(12), default="running")   # running | done | error
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    minutes_saved: Mapped[float] = mapped_column(Float, default=0)
    result: Mapped[dict] = mapped_column(JSON, default=dict)


class AgentEvent(Base):
    __tablename__ = "agent_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    brand_id: Mapped[str] = mapped_column(String(40))
    task_id: Mapped[int] = mapped_column(Integer, nullable=True)
    agent: Mapped[str] = mapped_column(String(20))
    kind: Mapped[str] = mapped_column(String(8))        # START | STEP | SEND | DONE | ERROR
    message: Mapped[str] = mapped_column(Text)


class Trend(Base):
    __tablename__ = "trends"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    brand_id: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(12))       # format | audio | topic | hook
    label: Mapped[str] = mapped_column(String(120))
    note: Mapped[str] = mapped_column(Text, default="")
    added_by: Mapped[str] = mapped_column(String(40), default="")
    active: Mapped[int] = mapped_column(Integer, default=1)
