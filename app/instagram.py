"""'Sign in with Instagram' (Instagram API with Instagram Login) + reel insights import.
Needs a Meta app with instagram_business_basic + instagram_business_manage_insights and a Business/Creator account.
Verify current permissions and metric names in Meta's docs before going live: they change."""
import os, httpx
from .reels import classify_caption

GRAPH = "https://graph.instagram.com/v21.0"


def configured():
    return bool(os.getenv("INSTAGRAM_APP_ID") and os.getenv("INSTAGRAM_APP_SECRET"))


def login_url(state):
    redirect = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:8000/api/instagram/callback")
    return ("https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1"
            f"&client_id={os.environ['INSTAGRAM_APP_ID']}&redirect_uri={redirect}&response_type=code"
            f"&scope=instagram_business_basic,instagram_business_manage_insights&state={state}")


def exchange_code(code):
    redirect = os.getenv("INSTAGRAM_REDIRECT_URI", "http://localhost:8000/api/instagram/callback")
    r = httpx.post("https://api.instagram.com/oauth/access_token", data={
        "client_id": os.environ["INSTAGRAM_APP_ID"], "client_secret": os.environ["INSTAGRAM_APP_SECRET"],
        "grant_type": "authorization_code", "redirect_uri": redirect, "code": code}, timeout=30)
    r.raise_for_status()
    short = r.json()["access_token"]
    r2 = httpx.get("https://graph.instagram.com/access_token", params={
        "grant_type": "ig_exchange_token", "client_secret": os.environ["INSTAGRAM_APP_SECRET"], "access_token": short}, timeout=30)
    r2.raise_for_status()
    return r2.json()["access_token"]


def fetch_reels(token, limit=50):
    r = httpx.get(f"{GRAPH}/me/media", params={
        "fields": "id,caption,media_product_type,timestamp,permalink,like_count,comments_count", "limit": limit, "access_token": token}, timeout=30)
    r.raise_for_status()
    rows = []
    for m in r.json().get("data", []):
        if m.get("media_product_type") != "REELS":
            continue
        ins = {}
        try:
            ir = httpx.get(f"{GRAPH}/{m['id']}/insights", params={
                "metric": "views,reach,saved,shares,ig_reels_avg_watch_time", "access_token": token}, timeout=30)
            ir.raise_for_status()
            ins = {d["name"]: (d["values"][0]["value"] if d.get("values") else 0) for d in ir.json().get("data", [])}
        except Exception:
            pass
        hook, cta = classify_caption(m.get("caption"))
        ts = m.get("timestamp", "")
        rows.append({"id": m["id"], "caption": (m.get("caption") or "")[:200], "posted_at": ts,
                     "hour": int(ts[11:13]) if len(ts) > 13 else None, "duration": None, "hook_type": hook, "cta_type": cta,
                     "views": ins.get("views", 0), "reach": ins.get("reach", 0), "avg_watch_sec": round(ins.get("ig_reels_avg_watch_time", 0) / 1000, 1),
                     "likes": m.get("like_count", 0), "comments": m.get("comments_count", 0), "shares": ins.get("shares", 0),
                     "saves": ins.get("saved", 0), "profile_visits": 0, "link_clicks": 0, "leads": 0, "permalink": m.get("permalink")})
    return rows


def publish_reel(token, video_url, caption, dry_run=True):
    """Instagram Content Publishing: create a REELS container, wait until FINISHED, then publish.
    UNTESTED against live Meta. Requires instagram_business_content_publish and a publicly reachable video URL."""
    if dry_run:
        return {"ok": True, "delivery": "simulated", "note": "Dry run: nothing was sent to Instagram."}
    import time
    r = httpx.post(f"{GRAPH}/me/media", data={"media_type": "REELS", "video_url": video_url, "caption": caption, "access_token": token}, timeout=60)
    r.raise_for_status()
    cid = r.json()["id"]
    for _ in range(30):
        st = httpx.get(f"{GRAPH}/{cid}", params={"fields": "status_code", "access_token": token}, timeout=30).json().get("status_code")
        if st == "FINISHED":
            break
        if st == "ERROR":
            return {"ok": False, "delivery": "failed", "note": "Instagram rejected the video."}
        time.sleep(4)
    pr = httpx.post(f"{GRAPH}/me/media_publish", data={"creation_id": cid, "access_token": token}, timeout=60)
    pr.raise_for_status()
    return {"ok": True, "delivery": "confirmed", "external_id": pr.json().get("id")}
