"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";
import { Card, Sev, Field, fileToB64 } from "@/components/ui";

export default function Review() {
  const { api, brand, draft: d, setDraft, say, brandInfo } = useApp();
  const router = useRouter();
  const [findings, setFindings] = useState([]);
  const [route, setRoute] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [img, setImg] = useState(null);
  const [aiOn, setAiOn] = useState(false);
  const t = useRef();
  const set = p => setDraft(x => ({ ...x, ...p }));
  const body = useCallback(() => ({ brand_id: brand, text: d.text, channel: d.channel, visual: d.visual, alt_text: d.alt_text, has_image: d.has_image }), [brand, d]);
  const check = useCallback(async () => { const r = await api("/review", body()); setFindings(r.findings); setRoute(r.route); setAiOn(r.ai_available); }, [api, body]);
  useEffect(() => { clearTimeout(t.current); if (d.text.trim()) t.current = setTimeout(() => check().catch(() => {}), 450); else setFindings([]); }, [d.text, d.channel, d.has_image, d.alt_text, JSON.stringify(d.visual), brand]);
  const open = findings.filter(f => !dismissed.find(x => x.rule_id === f.rule_id && x.evidence.toLowerCase() === f.evidence.toLowerCase()));
  const apply = async f => { const r = await api("/apply-fix", { ...body(), finding: f }); if (r.ok) { set({ text: r.text }); say("Fix applied and re-checked."); } else say(r.reason); };
  const ai = async f => { const r = await api("/ai-rewrite", { ...body(), finding: f }); if (r.ok) { set({ text: r.text }); say("AI rewrite passed the rule engine."); } else say(r.reason); };
  const dismiss = async f => { const reason = prompt("Why are you dismissing this? (required, it is logged)"); if (!reason) return; await api("/dismiss", { brand_id: brand, rule_id: f.rule_id, reason }); setDismissed(x => [...x, { rule_id: f.rule_id, evidence: f.evidence, reason }]); };
  const safe = async () => { const r = await api("/apply-all-safe", body()); set({ text: r.text }); say(r.applied.length ? `Applied ${r.applied.length} safe fix(es).` : "Nothing safe to apply automatically."); };
  const submit = async () => {
    if (!d.text.trim()) return say("Add some content first.");
    const s = await api("/submissions", { ...body(), title: d.title || "Untitled", dismissals: dismissed });
    const r = await api(`/submissions/${s.id}/submit`, { ...body(), title: d.title, dismissals: dismissed });
    say(`Submitted. Routed to ${r.status === "escalated" ? "a Reviewer" : "a Manager"}.`); setDismissed([]); router.push(`/queue/?id=${s.id}`);
  };
  const onFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    const b64 = await fileToB64(f);
    if (/\.(png|jpe?g|webp|gif)$/i.test(f.name)) { const r = await api("/review-image", { brand_id: brand, filename: f.name, data_b64: b64, alt_text: d.alt_text }); setImg(r); set({ has_image: true }); say("Image checked locally."); }
    else { const r = await api("/extract", { filename: f.name, data_b64: b64 }); set({ text: r.text }); say(r.truncated ? "Extracted the first 20,000 characters." : "Text extracted."); }
  };
  const list = v => v.split(",").map(s => s.trim()).filter(Boolean);
  const crit = open.filter(f => f.severity === "critical").length, maj = open.filter(f => f.severity === "major").length;
  const imgFindings = img ? img.findings.filter(f => !(f.rule_id === "A11Y-001" && d.alt_text.trim())) : [];
  return (<>
    <h1>Review content before it goes live</h1>
    <p className="sub">Paste a draft, or upload a text, HTML, Word or PDF file or an image. BrandGuard checks it against the guidelines, approved facts and offers for {brandInfo?.name}, explains each issue and suggests a fix that keeps your message.</p>
    <div className="split">
      <Card aria-label="Draft">
        <Field label="Title" id="t"><input id="t" value={d.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. October savings post" /></Field>
        <div className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}><Field label="Channel" id="ch"><select id="ch" value={d.channel} onChange={e => set({ channel: e.target.value })}>{["instagram", "linkedin", "x", "facebook", "youtube", "tiktok", "email", "web"].map(c => <option key={c}>{c}</option>)}</select></Field></div>
          <label className="chk"><input type="checkbox" checked={d.has_image} onChange={e => set({ has_image: e.target.checked })} /> Post includes an image</label>
        </div>
        <Field label="Content" id="x"><textarea id="x" rows={9} value={d.text} onChange={e => set({ text: e.target.value })} placeholder="Our amazing panels are the BEST on the market!! Save up to 50% on your bills, guaranteed." /></Field>
        <p className="note">{d.text.length} characters</p>
        {d.has_image && <Field label="Alt text" id="alt"><input id="alt" value={d.alt_text} onChange={e => set({ alt_text: e.target.value })} placeholder="Describe the image in one sentence" /></Field>}
        <Field label="Upload a file (txt, md, html, docx, pdf) or an image (png, jpg, webp)" id="fu"><input id="fu" type="file" accept=".txt,.md,.html,.htm,.docx,.pdf,.png,.jpg,.jpeg,.webp,.gif" onChange={onFile} /></Field>
        <details style={{ marginTop: 10 }}><summary>Visual specification (optional)</summary>
          <Field label="Text colour" id="tc"><input id="tc" value={d.visual.text_color || ""} placeholder="#aaaaaa" onChange={e => set({ visual: { ...d.visual, text_color: e.target.value.trim() } })} /></Field>
          <Field label="Background colour" id="bc"><input id="bc" value={d.visual.bg_color || ""} placeholder="#ffffff" onChange={e => set({ visual: { ...d.visual, bg_color: e.target.value.trim() } })} /></Field>
          <Field label="Other colours used (comma separated)" id="cl"><input id="cl" defaultValue={(d.visual.colors || []).join(", ")} placeholder="#ff00aa, #0b5d3b" onBlur={e => set({ visual: { ...d.visual, colors: list(e.target.value) } })} /></Field>
          <Field label="Fonts used (comma separated)" id="fn"><input id="fn" defaultValue={(d.visual.fonts || []).join(", ")} placeholder="Comic Sans, Inter" onBlur={e => set({ visual: { ...d.visual, fonts: list(e.target.value) } })} /></Field>
        </details>
        <div className="row" style={{ marginTop: 16 }}><button className="btn go" onClick={safe}>Apply all safe fixes</button><button className="btn" onClick={submit}>Submit for approval</button></div>
      </Card>
      <section aria-live="polite">
        {img && <Card flat style={{ marginBottom: 12 }}><h3>Image check ({img.size[0]}×{img.size[1]})</h3>
          <p>{img.dominant.map(c => <span key={c.hex} style={{ marginRight: 10 }}><span className="swatch" style={{ background: c.hex }} />{c.hex} {Math.round(c.share * 100)}%</span>)}</p>
          {imgFindings.map(f => <p key={f.id}><Sev s={f.severity} /> <b>{f.title}</b>: {f.evidence}<br /><span className="note">{f.why}</span></p>)}
          {!imgFindings.length && <p className="note">No image issues found. Colour checks flag only large areas far from every brand colour.</p>}</Card>}
        {!d.text.trim() ? <Card flat><p className="empty">Paste some content to see findings.</p></Card> : <>
          <Card flat style={{ marginBottom: 12 }}><div className="row space"><div><b>{open.length} issue{open.length === 1 ? "" : "s"}</b> · {crit} critical · {maj} major{dismissed.length ? ` · ${dismissed.length} dismissed` : ""}</div>{route && <div>Would go to: <b>{route.status === "escalated" ? "Reviewer" : "Manager"}</b></div>}</div></Card>
          {!open.length && <Card><p className="empty">No open issues. Ready to submit.</p></Card>}
          {open.map(f => <article key={f.id} className={`finding ${f.severity}`}>
            <div className="row space"><div><b>{f.title}</b> <Sev s={f.severity} /></div><span className="note">{f.rule_id}</span></div>
            <p>Found: <mark className="ev">{f.evidence}</mark></p><p className="note">{f.why}</p>
            {f.suggestion !== null && f.start >= 0 && <div className="sugg"><b>Suggested fix:</b> {f.suggestion === "" ? "remove it" : `“${f.suggestion.trim()}”`}<br /><span className="note">{f.intent_note}</span></div>}
            <div className="row space"><span className="note">Confidence <span className="bar"><i style={{ width: f.confidence * 100 + "%" }} /></span> {Math.round(f.confidence * 100)}%{f.fix_type === "deterministic" ? (f.confidence >= 0.9 ? " · safe to apply" : " · human check recommended") : ""}</span>
              <span className="row">{f.suggestion !== null && f.start >= 0 && <button className="btn sm go" onClick={() => apply(f)}>Apply fix</button>}
                {f.start >= 0 && f.category !== "confidentiality" && f.category !== "offers" && <button className="btn sm alt" onClick={() => ai(f)}>Ask AI to rewrite</button>}
                <button className="btn sm alt" onClick={() => dismiss(f)}>Dismiss</button></span></div></article>)}
          {open.length > 0 && !aiOn && <p className="note">AI rewrites are off (rules-only mode). They need an API key and a Brand Admin opt-in under Guidelines.</p>}
        </>}
      </section>
    </div>
  </>);
}
