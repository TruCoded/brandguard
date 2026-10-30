from app.engine import run_review, apply_fix, apply_all_safe, contrast_ratio
from app.brands_seed import BRANDS

CFG = BRANDS[0]["config"]
BAD = "Our amazing panels are the BEST on the market!! Save up to 50% on your bills, guaranteed. Mail me at rohit@gmail.com about Project Falcon."


def ids(t, **k):
    return {f["rule_id"] for f in run_review(t, CFG, **k)}


def test_detects_all_text_categories():
    assert {"TONE-001", "TONE-002", "TONE-003", "CLM-001", "FACT-001", "CONF-001", "CONF-002", "MSG-001"} <= ids(BAD)


def test_fact_fix_preserves_intent():
    f = [x for x in run_review(BAD, CFG) if x["rule_id"] == "FACT-001"][0]
    r = apply_fix(BAD, f, CFG)
    assert r["ok"] and "Typically save 20-30%" in r["text"]


def test_safe_fixes_never_introduce_new_issues():
    r = apply_all_safe(BAD, CFG)
    assert not {"TONE-002", "CONF-001", "CONF-002", "FACT-001", "MSG-001"} & {f["rule_id"] for f in r["findings"]}


def test_clean_text_has_no_findings():
    assert run_review("Our solar panels come with a 25-year performance warranty. Terms apply.", CFG) == []


def test_accessibility_and_visual():
    f = run_review("Hello", CFG, has_image=True, alt_text="", visual={"text_color": "#aaaaaa", "bg_color": "#ffffff", "fonts": ["Comic Sans"], "colors": ["#ff00aa"]})
    assert {"A11Y-001", "A11Y-005", "VIS-001", "VIS-002"} <= {x["rule_id"] for x in f}
    assert contrast_ratio("#000000", "#ffffff") > 20


def test_disabled_rule_is_skipped():
    cfg = dict(CFG, disabled_rules=["TONE-002"])
    assert "TONE-002" not in {f["rule_id"] for f in run_review("Great!!", cfg)}


def test_workflow_routing_and_separation_of_duties():
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    P, M, L = {"X-User-Id": "priya"}, {"X-User-Id": "maya"}, {"X-User-Id": "leena"}
    body = {"brand_id": "solarly", "text": "Save up to 50%, guaranteed.", "title": "t", "channel": "instagram"}
    s = c.post("/api/submissions", json=body, headers=P).json()
    r = c.post(f"/api/submissions/{s['id']}/submit", json=body, headers=P).json()
    assert r["status"] == "escalated"
    assert c.post(f"/api/submissions/{s['id']}/decision", json={"decision": "approve"}, headers=M).status_code == 403
    assert c.post(f"/api/submissions/{s['id']}/decision", json={"decision": "approve"}, headers=L).json()["status"] == "approved"
    assert c.get("/api/audit").json()["chain"]["ok"]


def test_reel_analysis_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app
    a = TestClient(app).get("/api/reels/analysis?brand_id=ironpulse").json()
    assert a["analysis"]["count"] >= 8 and a["recommendations"]

def test_individual_correction_is_audited():
    from fastapi.testclient import TestClient
    from app.main import app

    c = TestClient(app)
    body = {
        "brand_id": BRANDS[0]["id"],
        "text": BAD,
        "channel": "instagram"
    }

    review = c.post("/api/review", json=body).json()
    finding = next(
        f for f in review["findings"]
        if f["rule_id"] == "FACT-001"
    )

    before = c.get("/api/audit").json()["events"]
    previous_ids = {event["id"] for event in before}

    response = c.post(
        "/api/apply-fix",
        json={**body, "finding": finding},
        headers={"X-User-Id": "priya"}
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True

    audit = c.get("/api/audit").json()
    assert audit["chain"]["ok"]

    new_events = [
        event for event in audit["events"]
        if event["id"] not in previous_ids
    ]

    assert any(
        event["action"] == "finding.fixed"
        and event["target"] == "FACT-001"
        and event["actor"] == "priya"
        for event in new_events
    )


def test_bulk_corrections_are_audited():
    from fastapi.testclient import TestClient
    from app.main import app

    c = TestClient(app)
    body = {
        "brand_id": BRANDS[0]["id"],
        "text": BAD,
        "channel": "instagram"
    }

    before = c.get("/api/audit").json()["events"]
    previous_ids = {event["id"] for event in before}

    response = c.post(
        "/api/apply-all-safe",
        json=body,
        headers={"X-User-Id": "priya"}
    )

    assert response.status_code == 200
    result = response.json()
    assert result["applied"]

    audit = c.get("/api/audit").json()
    assert audit["chain"]["ok"]

    new_events = [
        event for event in audit["events"]
        if event["id"] not in previous_ids
    ]

    bulk_events = [
        event for event in new_events
        if event["action"] == "finding.fixed"
        and event["detail"].get("method") == "apply_all_safe"
    ]

    assert len(bulk_events) == len(result["applied"])

def test_dismissal_is_audited():
    from fastapi.testclient import TestClient
    from app.main import app

    c = TestClient(app)

    before = c.get("/api/audit").json()["events"]
    previous_ids = {event["id"] for event in before}

    response = c.post(
        "/api/dismiss",
        json={
            "brand_id": BRANDS[0]["id"],
            "rule_id": "TONE-001",
            "reason": "Reviewed and accepted by the content team."
        },
        headers={"X-User-Id": "priya"}
    )

    assert response.status_code == 200

    audit = c.get("/api/audit").json()
    assert audit["chain"]["ok"]

    new_events = [
        event for event in audit["events"]
        if event["id"] not in previous_ids
    ]

    assert any(
        event["action"] == "finding.dismissed"
        and event["actor"] == "priya"
        for event in new_events
    )
