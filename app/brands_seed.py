"""Seed brand knowledge bases, one per niche. Everything here is editable in the Guideline Manager."""

COMMON_RULES = ["TONE-001", "TONE-002", "TONE-003", "TERM-001", "MSG-001", "CLM-001", "FACT-001",
                "A11Y-001", "A11Y-002", "A11Y-003", "A11Y-004", "A11Y-005", "VIS-001", "VIS-002",
                "CONF-001", "CONF-002", "CONF-003", "CONF-004", "CH-001"]

HYPE = {"amazing": "", "incredible": "", "revolutionary": "new", "game-changing": "new",
        "unbeatable": "", "mind-blowing": "", "insane": "", "magical": ""}


def brand(id, name, niche, tagline, palette, fonts, terms, claims, facts, mandatory, codenames, hashtags, accent):
    return {
        "id": id, "name": name, "niche": niche,
        "config": {
            "tagline": tagline, "accent": accent, "palette": palette, "fonts": fonts,
            "terms": terms, "hype": HYPE, "claims": claims, "facts": facts, "mandatory": mandatory,
            "codenames": codenames, "acronyms": ["LED", "UPI", "SIP", "FAQ", "USA", "NASA", "HIIT", "SPF", "ROI"],
            "hashtags": hashtags, "disabled_rules": [],
        },
    }


BRANDS = [
    brand("solarly", "Solarly", "energy", "Clean power, plainly explained.",
          ["#0B5D3B", "#F5B700", "#FFFFFF", "#1A1A2E", "#E8F5EE"], ["Inter", "Poppins"],
          {"users": "customers", "cheap": "affordable", "solar panels": "solar panels"},
          [{"pattern": r"guarantee[ds]?", "fix": "backed by our 25-year performance warranty", "label": "guarantee"},
           {"pattern": r"(?:the\s+)?best(?:\s+on the market)?", "fix": "built to last", "label": "best"},
           {"pattern": r"#1|number one|no\.\s?1", "fix": "trusted by homeowners", "label": "#1"},
           {"pattern": r"zero\s+(?:electricity\s+)?bills?", "fix": "lower electricity bills", "label": "zero bills"}],
          [{"id": "FACT-SAVE", "label": "Typical bill savings", "pattern": r"save\s+(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*%",
            "min": 20, "max": 30, "replacement": "typically save 20-30%", "source": "Field study FY25, internal", "reviewed": "2026-08-01"},
           {"id": "FACT-WARRANTY", "label": "Performance warranty", "pattern": r"(\d+)[-\s]*year\s+(?:performance\s+)?warranty",
            "min": 25, "max": 25, "replacement": "25-year performance warranty", "source": "Warranty policy v4", "reviewed": "2026-07-15"}],
          [{"id": "terms", "trigger": r"\d+\s*%|offer|discount|free", "text": "Terms apply."}],
          ["Project Falcon", "Falcon", "Atlas-Q4"], ["#SolarlyHome", "#CleanEnergy", "#RooftopSolar", "#SaveOnPower"], "#F5B700"),
    brand("ironpulse", "IronPulse", "fitness", "Train smart. Stay consistent.",
          ["#111827", "#FF5D5D", "#FFFFFF", "#22C55E", "#F3F4F6"], ["Montserrat", "Inter"],
          {"members": "community", "workout plan": "training plan", "diet": "nutrition plan"},
          [{"pattern": r"guarantee[ds]?", "fix": "designed to support your progress", "label": "guarantee"},
           {"pattern": r"(?:the\s+)?best(?:\s+gym)?", "fix": "built for consistency", "label": "best"},
           {"pattern": r"lose\s+\d+\s*(?:kg|lbs?|pounds)\s+in\s+\w+\s+(?:days?|weeks?)", "fix": "build a routine you can sustain", "label": "rapid weight loss"},
           {"pattern": r"burn\s+fat\s+fast", "fix": "train consistently", "label": "fat fast"}],
          [{"id": "FACT-TRIAL", "label": "Free trial length", "pattern": r"(\d+)[-\s]*day\s+free\s+trial",
            "min": 7, "max": 7, "replacement": "7-day free trial", "source": "Pricing page Oct 2026", "reviewed": "2026-10-01"},
           {"id": "FACT-PRICE", "label": "Monthly plan price", "pattern": r"(?:₹|rs\.?\s?)(\d{3,5})\s*/\s*month",
            "min": 999, "max": 999, "replacement": "₹999/month", "source": "Pricing page Oct 2026", "reviewed": "2026-10-01"}],
          [{"id": "disc", "trigger": r"lose|weight|fat|results", "text": "Results vary. Consult a professional before starting."}],
          ["Project Titan", "Titan-X"], ["#IronPulse", "#TrainSmart", "#FitnessIndia", "#GymTips"], "#FF5D5D"),
    brand("glowlab", "GlowLab", "skincare", "Skincare that respects your skin.",
          ["#7A1F5C", "#FFD6E8", "#FFFFFF", "#2D2D2D", "#FFF4F9"], ["DM Sans", "Playfair Display"],
          {"anti-aging": "skin-supporting", "flawless": "even-looking", "customers": "customers"},
          [{"pattern": r"guarantee[ds]?", "fix": "dermatologist-tested", "label": "guarantee"},
           {"pattern": r"(?:the\s+)?best(?:\s+serum)?", "fix": "gentle on skin", "label": "best"},
           {"pattern": r"cures?\s+(?:acne|eczema|pigmentation)", "fix": "helps support clearer-looking skin", "label": "cure"},
           {"pattern": r"100\s*%\s+(?:safe|natural|effective)", "fix": "made with carefully selected ingredients", "label": "100%"}],
          [{"id": "FACT-NIACIN", "label": "Niacinamide strength", "pattern": r"(\d+(?:\.\d+)?)\s*%\s+niacinamide",
            "min": 5, "max": 5, "replacement": "5% niacinamide", "source": "Formulation sheet v3", "reviewed": "2026-09-10"}],
          [{"id": "patch", "trigger": r"serum|cream|acid|retinol|niacinamide", "text": "Patch test before use."}],
          ["Project Bloom", "Bloom-V2"], ["#GlowLab", "#SkincareRoutine", "#SkinCareIndia", "#SensitiveSkin"], "#FFD6E8"),
    brand("paysmart", "PaySmart", "fintech", "Money, made simple.",
          ["#1D4ED8", "#10B981", "#FFFFFF", "#0F172A", "#EFF6FF"], ["Inter", "Sora"],
          {"cheap": "low-cost", "free money": "cashback", "users": "customers"},
          [{"pattern": r"guarantee[ds]?\s+returns?", "fix": "returns are subject to market risk", "label": "guaranteed returns"},
           {"pattern": r"risk[-\s]free", "fix": "designed with safeguards", "label": "risk-free"},
           {"pattern": r"(?:the\s+)?best(?:\s+app)?", "fix": "built for everyday payments", "label": "best"},
           {"pattern": r"double\s+your\s+money", "fix": "grow your savings over time", "label": "double money"}],
          [{"id": "FACT-CASHBACK", "label": "Cashback rate", "pattern": r"(\d+(?:\.\d+)?)\s*%\s+cashback",
            "min": 2, "max": 2, "replacement": "2% cashback", "source": "Rewards T&C v7", "reviewed": "2026-09-20"}],
          [{"id": "risk", "trigger": r"invest|returns|mutual fund|sip", "text": "Investments are subject to market risks."}],
          ["Project Nova", "Nova-Beta"], ["#PaySmart", "#UPI", "#PersonalFinance", "#MoneyTips"], "#10B981"),
    brand("brewhouse", "BrewHouse", "food", "Small-batch coffee, slow mornings.",
          ["#3E2723", "#F2C078", "#FFFFFF", "#FAF3E0", "#8D6E63"], ["Lora", "Inter"],
          {"cheap": "great value", "guys": "everyone", "customers": "guests"},
          [{"pattern": r"guarantee[ds]?", "fix": "made fresh every morning", "label": "guarantee"},
           {"pattern": r"(?:the\s+)?best(?:\s+coffee)?(?:\s+in\s+town)?", "fix": "roasted in small batches", "label": "best"},
           {"pattern": r"healthiest", "fix": "made with simple ingredients", "label": "healthiest"}],
          [{"id": "FACT-ROAST", "label": "Roasting frequency", "pattern": r"roasted\s+every\s+(\d+)\s+days?",
            "min": 3, "max": 3, "replacement": "roasted every 3 days", "source": "Ops handbook", "reviewed": "2026-08-30"}],
          [{"id": "allergen", "trigger": r"cake|cookie|brownie|pastry|nut", "text": "Contains allergens. Ask our team."}],
          ["Project Bean", "Bean-9"], ["#BrewHouse", "#SmallBatchCoffee", "#CoffeeLovers", "#SlowMornings"], "#F2C078"),
]

USERS = [
    {"id": "priya", "name": "Priya (Creator)", "role": "creator", "team": "Social"},
    {"id": "arjun", "name": "Arjun (Agency creator)", "role": "creator", "team": "Agency"},
    {"id": "maya", "name": "Maya (Marketing manager)", "role": "manager", "team": "Marketing"},
    {"id": "leena", "name": "Leena (Legal reviewer)", "role": "reviewer", "team": "Legal"},
    {"id": "admin", "name": "Admin (Brand admin)", "role": "admin", "team": "Brand"},
]

NICHE_PLAYBOOKS = {
    "energy": {"audience": "homeowners 28-55 comparing bills and subsidies",
               "hooks": {"question": "Is your electricity bill really {topic}?", "myth-bust": "Myth: {topic}. Here is what actually happens.",
                         "result-first": "This is what {topic} did to one family's bill.", "pov": "POV: you finally understand {topic}.",
                         "tutorial": "3 steps to {topic} before the summer bill hits."},
               "proof": "bill screenshots, install time-lapses, subsidy walk-throughs"},
    "fitness": {"audience": "beginners and returning gym-goers 18-35",
                "hooks": {"question": "Why does {topic} stall for most people?", "myth-bust": "Stop believing this about {topic}.",
                          "result-first": "12 weeks of {topic}: what actually changed.", "pov": "POV: you stopped skipping {topic}.",
                          "tutorial": "The 30-second form check for {topic}."},
                "proof": "form demos, client journeys (with consent), rep-by-rep cues"},
    "skincare": {"audience": "skin-conscious women and men 18-34",
                 "hooks": {"question": "Are you using {topic} in the right order?", "myth-bust": "Myth: {topic}. Dermatology says otherwise.",
                           "result-first": "{topic}: 4-week skin diary, no filters.", "pov": "POV: your routine finally matches your skin.",
                           "tutorial": "How to layer {topic} without irritation."},
                 "proof": "ingredient explainers, texture shots, unfiltered diaries"},
    "fintech": {"audience": "first-time investors and UPI users 20-40",
                "hooks": {"question": "Do you know where your {topic} actually goes?", "myth-bust": "Myth: {topic}. The fine print says this.",
                          "result-first": "How we reduced {topic} fees to zero for one user.", "pov": "POV: you finally read the {topic} terms.",
                          "tutorial": "Set up {topic} in under 60 seconds."},
                "proof": "screen recordings, fee breakdowns, plain-language terms"},
    "food": {"audience": "local food lovers and coffee fans 18-40",
             "hooks": {"question": "Would you try {topic} before 9am?", "myth-bust": "Myth: {topic}. Baristas disagree.",
                       "result-first": "From bean to cup: {topic} in 20 seconds.", "pov": "POV: slow morning, {topic}.",
                       "tutorial": "How we make {topic} at home-friendly scale."},
             "proof": "pour shots, ASMR audio, behind-the-bar moments"},
}


# ---------------------------------------------------------------- BrandGuard workspace additions: offers, engagement, controls
from datetime import date, timedelta as _td

_T = date.today()
_OFFERS = {
    "solarly": [("Diwali Solar Offer", ["diwali offer", "diwali solar"], "3kW system from ₹1,85,000 after subsidy", "Valid till {end}. Subsidy eligibility applies."),
                ("Monsoon Saver", ["monsoon saver", "monsoon offer"], "Free site survey", "Valid till {end}.")],
    "ironpulse": [("Festive Fit Month", ["festive fit"], "₹999/month for 3 months", "Valid till {end}. New members only."),
                  ("Summer Shred", ["summer shred"], "20% off annual plan", "Valid till {end}.")],
    "glowlab": [("Glow Week", ["glow week"], "15% off first order", "Valid till {end}. One use per customer."),
                ("Spring Sample", ["spring sample"], "Free sample with any order", "Valid till {end}.")],
    "paysmart": [("Diwali Cashback", ["diwali cashback"], "2% cashback up to ₹200", "Valid till {end}. Cap applies."),
                 ("Summer Rewards", ["summer rewards"], "1% extra cashback", "Valid till {end}.")],
    "brewhouse": [("Winter Brew Pass", ["brew pass", "winter brew"], "5 coffees for the price of 4", "Valid till {end}. One pass per guest."),
                  ("Monsoon Mug", ["monsoon mug"], "Free mug with 500g beans", "Valid till {end}.")],
}


def _offers(bid):
    (a, ak, ap, at), (b, bk, bp, bt) = _OFFERS[bid]
    live_end, dead_end = _T + _td(days=18), _T - _td(days=20)
    return [{"id": f"{bid}-live", "name": a, "keywords": ak, "price": ap, "start": (_T - _td(days=10)).isoformat(), "end": live_end.isoformat(),
             "terms": at.format(end=live_end.strftime("%d %b %Y")), "owner": "maya", "status": "approved"},
            {"id": f"{bid}-old", "name": b, "keywords": bk, "price": bp, "start": (_T - _td(days=80)).isoformat(), "end": dead_end.isoformat(),
             "terms": bt.format(end=dead_end.strftime("%d %b %Y")), "owner": "maya", "status": "expired"}]


for _b in BRANDS:
    _c = _b["config"]
    _c["offers"] = _offers(_b["id"])
    _c["allow_external_ai"] = False          # admin must opt in before any text leaves the organisation
    _c["booking_link"] = "https://example.com/book"
    _c["support_contact"] = "support@example.com"
    _c["audience"] = NICHE_PLAYBOOKS[_b["niche"]]["audience"]
    _c["playbook"] = {k: (dict(v) if isinstance(v, dict) else v) for k, v in NICHE_PLAYBOOKS[_b["niche"]].items()}
    _c["custom_rules"] = []
    _c["settings"] = {}

AGENTS = [
    {"id": "director", "name": "Director", "icon": "🎬", "job": "Turns a goal into a brief: objective, audience, channel, offer."},
    {"id": "analyst", "name": "Analyst", "icon": "📊", "job": "Reads reel analytics, ranks what worked, proposes one test."},
    {"id": "scriptwriter", "name": "Scriptwriter", "icon": "✍️", "job": "Hooks, timed script, CTA and caption from approved facts."},
    {"id": "qa", "name": "QA editor", "icon": "✅", "job": "Runs the BrandGuard rules and applies safe fixes."},
    {"id": "compliance", "name": "Compliance", "icon": "⚖️", "job": "Routes risky claims, offers and confidential items to people."},
    {"id": "producer", "name": "Producer", "icon": "🗓️", "job": "Places approved work on the calendar at the best slot."},
    {"id": "postproducer", "name": "Post-producer", "icon": "🎞️", "job": "Prepares the shot list and edit kit for the reel."},
    {"id": "community", "name": "Community", "icon": "💬", "job": "Answers comments and DMs from approved templates, escalates the rest."},
]
# Baseline minutes a person needs for the same task (ASSUMPTIONS: replace with your measured medians)
BASELINE_MINUTES = {"brief": 20, "analysis": 30, "script": 45, "qa": 25, "compliance": 15, "calendar": 10, "editkit": 20, "reply": 3}
