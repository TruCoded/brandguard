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
