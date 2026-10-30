import base64, io, uuid
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
P, M, L, A = ({"X-User-Id": u} for u in ("priya", "maya", "leena", "admin"))


def test_custom_rule_and_thresholds_are_per_brand():
    name = "Pet " + uuid.uuid4().hex[:5]
    bid = c.post("/api/brands", json={"name": name, "niche": "pet care", "template": ""}, headers=A).json()["id"]
    cfg = c.get(f"/api/brands/{bid}").json()["config"]
    cfg["custom_rules"] = [{"id": "VET-001", "title": "No medical claims", "category": "legal", "severity": "critical", "pattern": r"cures? (?:anxiety|arthritis)", "fix": "may help your pet feel calmer", "why": "Vets regulate medical claims.", "enabled": True}]
    cfg["settings"] = {"max_sentence_words": 6}
    assert c.put(f"/api/brands/{bid}", json={"config": cfg}, headers=A).status_code == 200
    r = c.post("/api/review", json={"brand_id": bid, "text": "This treat cures anxiety in dogs and we hope your whole family will love every single bite."}).json()
    ids = {f["rule_id"] for f in r["findings"]}
    assert "VET-001" in ids and "A11Y-002" in ids and r["route"]["status"] == "escalated"
    assert "VET-001" not in {f["rule_id"] for f in c.post("/api/review", json={"brand_id": "solarly", "text": "This treat cures anxiety"}).json()["findings"]}


def test_only_admin_edits_guidelines():
    cfg = c.get("/api/brands/solarly").json()["config"]
    assert c.put("/api/brands/solarly", json={"config": cfg}, headers=P).status_code == 403


def test_expired_offer_is_critical_and_live_offer_needs_terms():
    f = c.post("/api/review", json={"brand_id": "solarly", "text": "Grab the Monsoon Saver today"}).json()["findings"]
    assert any(x["rule_id"] == "OFFER-001" and x["severity"] == "critical" for x in f)
    f2 = c.post("/api/review", json={"brand_id": "solarly", "text": "Join the Diwali Solar Offer today."}).json()["findings"]
    assert any(x["rule_id"] == "OFFER-002" for x in f2)


def test_engagement_controls():
    h = "h" + uuid.uuid4().hex[:6]
    def send(text, handle=h, eid=""):
        return c.post("/api/engagement/simulate", json={"brand_id": "ironpulse", "handle": handle, "text": text, "event_id": eid}, headers=P).json()
    assert send("how much is it?")["action"] == "replied"
    assert send("I will call my lawyer", handle=h + "x")["action"] == "escalated"
    assert send("stop messaging me", handle=h + "y")["action"] == "opted_out"
    assert send("how much?", handle=h + "y")["action"] == "skipped_optout"
    assert send("refund please", handle=h)["handoff"] == "support"
    assert send("what is the price", handle=h)["action"] == "skipped_limit"
    c.post("/api/engagement/switch", json={"brand_id": "ironpulse", "key": "paused", "value": True}, headers=M)
    assert send("hello there", handle=h + "z")["action"] == "paused"
    c.post("/api/engagement/switch", json={"brand_id": "ironpulse", "key": "paused", "value": False}, headers=M)


def test_agent_studio_pipeline_stops_at_human_approval():
    r = c.post("/api/studio/run", json={"brand_id": "glowlab", "topic": "niacinamide routine"}, headers=P).json()
    assert r["submission_id"] and r["route"] in ("in_review", "escalated") and r["edit_kit"]
    s = c.get(f"/api/submissions/{r['submission_id']}", headers=P).json()
    assert s["status"] != "approved"


def test_publish_gate_blocks_unapproved_and_is_dry_run():
    body = {"brand_id": "solarly", "text": "Typically save 20-30%. Terms apply.", "title": "ok", "channel": "instagram"}
    s = c.post("/api/submissions", json=body, headers=P).json()
    c.post(f"/api/submissions/{s['id']}/submit", json=body, headers=P)
    j = c.post("/api/publish", json={"brand_id": "solarly", "submission_id": s["id"], "scheduled_at": "2030-01-01T10:00"}, headers=M).json()
    assert j["status"] == "blocked"
    c.post(f"/api/submissions/{s['id']}/decision", json={"decision": "approve"}, headers=M)
    j2 = c.post("/api/publish", json={"brand_id": "solarly", "submission_id": s["id"], "scheduled_at": "2030-01-02T10:00"}, headers=M).json()
    assert j2["status"] == "scheduled"
    assert c.post(f"/api/publish/{j2['id']}/run", headers=M).json()["status"] == "dry_run_ok"
    assert c.post(f"/api/publish/{j2['id']}/run", headers=M).status_code == 409


def test_image_check_and_file_extraction():
    from PIL import Image
    buf = io.BytesIO(); Image.new("RGB", (60, 60), (255, 0, 170)).save(buf, "PNG")
    r = c.post("/api/review-image", json={"brand_id": "solarly", "filename": "a.png", "data_b64": base64.b64encode(buf.getvalue()).decode()}).json()
    assert {f["rule_id"] for f in r["findings"]} >= {"VIS-003", "A11Y-001"}
    t = c.post("/api/extract", json={"filename": "x.html", "data_b64": base64.b64encode(b"<p>Hello <b>world</b></p>").decode()}).json()
    assert "Hello world" in t["text"]


def test_ai_never_runs_without_opt_in():
    f = c.post("/api/review", json={"brand_id": "solarly", "text": "Our amazing panels"}).json()["findings"][0]
    r = c.post("/api/ai-rewrite", json={"brand_id": "solarly", "text": "Our amazing panels", "finding": f}, headers=P).json()
    assert r["ok"] is False


def test_search_calendar_and_reels_platforms():
    assert any(x["type"] == "Fact" for x in c.get("/api/search?brand_id=solarly&q=warranty").json())
    assert len(c.post("/api/calendar/plan", json={"brand_id": "solarly", "weeks": 1, "per_week": 2}, headers=P).json()) == 2
    for plat in ("instagram", "youtube", "tiktok"):
        assert c.get(f"/api/reels/analysis?brand_id=solarly&platform={plat}").json()["analysis"]["count"] >= 8


def test_unclear_guideline_detector_reports_reason_frequencies():
    import uuid
    from app.db import Session, FindingEvent

    # Create a fresh brand to avoid interference from demo data
    name = "Detector Test " + uuid.uuid4().hex[:6]

    brand_response = c.post(
        "/api/brands",
        json={
            "name": name,
            "niche": "general",
            "template": ""
        },
        headers=A,
    )

    assert brand_response.status_code == 200
    brand_id = brand_response.json()["id"]
    rule_id = "TONE-001"

    # Add 5 events: 3 dismissed and 2 fixed
    with Session() as s:
        for i in range(5):
            s.add(FindingEvent(
                brand_id=brand_id,
                rule_id=rule_id,
                category="tone",
                action="dismissed" if i < 3 else "fixed",
                user_id="priya",
                team="content",
                reason=(
                    "Not clear what is allowed"
                    if i < 2 else
                    "Unclear instructions"
                    if i == 2 else ""
                )
            ))
        s.commit()

    # Request insights
    response = c.get(
        f"/api/insights?brand_id={brand_id}"
    )

    assert response.status_code == 200

    data = response.json()

    # Temporary debugging output
    print("BY RULE:", data["by_rule"])
    print("UNCLEAR RULES:", data["unclear_rules"])

    # Find the detected unclear guideline
    rule = next(
        r for r in data["unclear_rules"]
        if r["rule_id"] == rule_id
    )

    # Verify detector results
    assert rule["dismissed_count"] == 3
    assert rule["total_handled"] == 5
    assert rule["dismissal_rate"] == 0.6
    assert len(rule["reason_counts"]) == 2
