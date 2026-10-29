"""Multi-format ingestion: pull reviewable text out of txt/md/html/docx/pdf. Runs locally."""
import io, re


def extract_text(filename: str, data: bytes) -> str:
    n = filename.lower()
    if n.endswith((".txt", ".md", ".csv")):
        return data.decode("utf-8", "ignore")
    if n.endswith((".html", ".htm")):
        t = data.decode("utf-8", "ignore")
        t = re.sub(r"(?is)<(script|style).*?</\1>", " ", t)
        t = re.sub(r"(?i)<br\s*/?>|</p>|</h\d>|</li>", "\n", t)
        return re.sub(r"[ \t]+", " ", re.sub(r"<[^>]+>", "", t)).strip()
    if n.endswith(".docx"):
        import docx
        d = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in d.paragraphs if p.text.strip())
    if n.endswith(".pdf"):
        from pypdf import PdfReader
        return "\n".join((pg.extract_text() or "") for pg in PdfReader(io.BytesIO(data)).pages).strip()
    raise ValueError("Unsupported file type. Use txt, md, html, docx or pdf (images go to image review).")


def extract_guidelines(text: str) -> dict:
    """Extract brand rules, palette, banned terms, claims, facts and mandatory statements from document text."""
    result = {
        "tagline": "",
        "palette": [],
        "fonts": [],
        "terms": {},
        "hype": {},
        "claims": [],
        "facts": [],
        "mandatory": [],
        "hashtags": [],
        "acronyms": []
    }

    if not text:
        return result

    # 1. Extract Hex Colors
    hex_matches = re.findall(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", text)
    if hex_matches:
        # Deduplicate preserving order, uppercase
        seen_hex = set()
        for h in hex_matches:
            hu = h.upper()
            if hu not in seen_hex:
                seen_hex.add(hu)
                result["palette"].append(hu)
        result["palette"] = result["palette"][:6]

    # 2. Extract Fonts (e.g., Font: Inter, Roboto, Poppins)
    font_matches = re.findall(r"(?:font|typeface|typography)[:\s]+([A-Za-z\s,]+)", text, re.I)
    common_fonts = ["Inter", "Poppins", "Roboto", "Montserrat", "Lato", "Open Sans", "Helvetica", "Arial", "Lora", "Merriweather", "Playfair Display", "DM Sans"]
    detected_fonts = []
    for f in common_fonts:
        if re.search(r"\b" + re.escape(f) + r"\b", text, re.I):
            detected_fonts.append(f)
    result["fonts"] = detected_fonts[:3] if detected_fonts else ["Inter"]

    # 3. Extract Hashtags
    hashtags = re.findall(r"#[A-Za-z0-9_]{3,30}\b", text)
    if hashtags:
        result["hashtags"] = list(dict.fromkeys(hashtags))[:8]

    # 4. Extract Acronyms / ALL-CAPS words
    acronyms = re.findall(r"\b[A-Z]{2,6}\b", text)
    common_stop = {"AND", "THE", "FOR", "NOT", "WITH", "YOU", "ARE", "ALL", "NEW", "OUR", "WHY", "PDF", "DOC", "USA"}
    valid_acrs = [a for a in dict.fromkeys(acronyms) if a not in common_stop]
    if valid_acrs:
        result["acronyms"] = valid_acrs[:10]

    # 5. Extract Terminology (Avoid vs Prefer / Do vs Don't)
    # Patterns like:
    # "avoid 'cheap', use 'affordable'"
    # "do not say 'customers', say 'community'"
    # "'workout plan' -> 'training plan'"
    # "Avoid: cheap | Prefer: affordable"
    avoid_prefer_patterns = [
        r"(?:avoid|don'?t\s+say|never\s+use)\s+['\"“]?([a-zA-Z\s]{2,25})['\"”]?\s+(?:use|say|prefer|instead\s+use)\s+['\"“]?([a-zA-Z\s]{2,25})['\"”]?",
        r"(?:use|prefer|say)\s+['\"“]?([a-zA-Z\s]{2,25})['\"”]?\s+(?:instead\s+of|rather\s+than)\s+['\"“]?([a-zA-Z\s]{2,25})['\"”]?",
        r"['\"“]?([a-zA-Z\s]{2,25})['\"”]?\s*(?:->|=>|–>|→)\s*['\"“]?([a-zA-Z\s]{2,25})['\"”]?",
        r"(?:Avoid|Don'?t):\s*([a-zA-Z\s,]+)\s*(?:Prefer|Do|Use):\s*([a-zA-Z\s,]+)",
    ]

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.search(avoid_prefer_patterns[0], line, re.I)
        if m:
            bad, good = m.group(1).strip().lower(), m.group(2).strip().lower()
            if bad and good and bad != good:
                result["terms"][bad] = good
                continue

        m = re.search(avoid_prefer_patterns[1], line, re.I)
        if m:
            good, bad = m.group(1).strip().lower(), m.group(2).strip().lower()
            if bad and good and bad != good:
                result["terms"][bad] = good
                continue

        m = re.search(avoid_prefer_patterns[2], line)
        if m:
            bad, good = m.group(1).strip().lower(), m.group(2).strip().lower()
            if bad and good and bad != good and len(bad.split()) <= 4 and len(good.split()) <= 4:
                result["terms"][bad] = good
                continue

    # 6. Extract Claims (e.g. "Never guarantee...", "Avoid unverified superlatives like #1")
    claim_keywords = [
        ("guarantee", r"guarantee[ds]?", "backed by our warranty/policy"),
        ("the best", r"(?:the\s+)?best(?:\s+on the market)?", "built with care"),
        ("#1 / Number One", r"#1|number one|no\.\s?1", "trusted by customers"),
        ("100% / Guaranteed results", r"100%\s*(?:satisfaction|success|results)?", "proven quality"),
        ("instant / immediate results", r"(?:instant|immediate)\s+(?:results|transformation)", "gradual and sustainable progress"),
    ]
    for label, pat, fix in claim_keywords:
        if re.search(pat, text, re.I):
            result["claims"].append({"label": label, "pattern": pat, "fix": fix})

    # 7. Extract Mandatory statements / Disclaimers
    # Looking for statements following "must include", "required disclaimer", "mandatory"
    disclaimers = re.findall(r"(?:must\s+include|mandatory\s+statement|required\s+disclaimer|always\s+add)[:\s]+[\"“']?([^\"”\n\.]{8,120})", text, re.I)
    if disclaimers:
        for idx, d in enumerate(disclaimers[:3]):
            clean_d = d.strip().strip("'\"“”")
            result["mandatory"].append({
                "id": f"mand-{idx+1}",
                "trigger": r"\d+\s*%|offer|discount|price|free",
                "text": clean_d
            })
    else:
        # Check for standard legal phrases
        if re.search(r"terms\s+apply", text, re.I):
            result["mandatory"].append({"id": "terms", "trigger": r"\d+\s*%|offer|discount|price|free", "text": "Terms apply."})
        if re.search(r"subject\s+to\s+market\s+risk", text, re.I):
            result["mandatory"].append({"id": "risk", "trigger": r"invest|returns|sip", "text": "Subject to market risks."})

    # 8. Extract Facts (Percentages, metrics, warranty, timeline)
    fact_matches = re.findall(r"(\d+(?:\.\d+)?)\s*%\s*([a-zA-Z\s]{4,35})", text)
    for idx, (num, label) in enumerate(fact_matches[:4]):
        val = float(num)
        result["facts"].append({
            "id": f"FACT-{idx+1}",
            "label": label.strip().capitalize(),
            "pattern": r"(\d+(?:\.\d+)?)\s*%\s*" + re.escape(label.strip()[:15]),
            "min": round(max(0, val * 0.8), 1),
            "max": round(val * 1.2, 1),
            "replacement": f"{num}% {label.strip()}",
            "source": "Brand Guidelines Document",
            "reviewed": "2026-10-01"
        })

    # 9. Extract Hype words
    common_hype = ["amazing", "incredible", "unbeatable", "revolutionary", "game-changing", "miracle", "insane", "magical"]
    for hw in common_hype:
        if re.search(r"\b" + re.escape(hw) + r"\b", text, re.I):
            result["hype"][hw] = ""

    # Tagline extraction
    tagline_match = re.search(r"(?:tagline|slogan|motto)[:\s]+[\"“']?([^\"”\n]{5,60})", text, re.I)
    if tagline_match:
        result["tagline"] = tagline_match.group(1).strip().strip("'\"“”")

    return result
