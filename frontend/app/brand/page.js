"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";
import { Card, Kpi, Pill, Sev, Field } from "@/components/ui";
import ListEditor, { objToList, listToObj } from "@/components/ListEditor";

const HOOKS = ["question", "myth-bust", "result-first", "pov", "tutorial"];
export default function BrandHQ() {
  const { api, brand, setBrand, me, say, brands } = useApp();
  const router = useRouter();
  const [B, setB] = useState(null); const [cfg, setCfg] = useState(null); const [meta, setMeta] = useState({ name: "", niche: "" });
  const [o, setO] = useState(null); const [dirty, setDirty] = useState(false);
  const [nb, setNb] = useState({ name: "", niche: "", template: "" });
  const admin = me.role === "admin", ro = !admin;
  const load = useCallback(async () => {
    const b = await api("/brands/" + brand); setB(b); setMeta({ name: b.name, niche: b.niche }); setDirty(false);
    const c = JSON.parse(JSON.stringify(b.config)); c.settings = { ...b.defaults, ...(c.settings || {}) }; c.playbook = c.playbook || {}; c.playbook.hooks = { ...(c.playbook.hooks || {}) }; setCfg(c);
    setO(await api(`/overview?brand_id=${brand}`));
  }, [api, brand]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api("/extract-guidelines", {
          filename: file.name,
          data_b64: reader.result
        });
        if (res.ok && res.extracted) {
          setExtractedData(res.extracted);
          say(`Extracted guidelines from ${file.name}`);
        }
      } catch (err) {
        say(err.message || "Failed to extract guidelines");
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyExtracted = () => {
    if (!extractedData) return;
    setCfg(c => {
      const next = { ...c };
      if (extractedData.tagline) next.tagline = extractedData.tagline;
      if (extractedData.palette?.length) next.palette = [...new Set([...next.palette, ...extractedData.palette])];
      if (extractedData.fonts?.length) next.fonts = [...new Set([...next.fonts, ...extractedData.fonts])];
      if (extractedData.hashtags?.length) next.hashtags = [...new Set([...(next.hashtags || []), ...extractedData.hashtags])];
      if (extractedData.acronyms?.length) next.acronyms = [...new Set([...(next.acronyms || []), ...extractedData.acronyms])];
      if (extractedData.terms && Object.keys(extractedData.terms).length) {
        next.terms = { ...(next.terms || {}), ...extractedData.terms };
      }
      if (extractedData.hype && Object.keys(extractedData.hype).length) {
        next.hype = { ...(next.hype || {}), ...extractedData.hype };
      }
      if (extractedData.claims?.length) {
        next.claims = [...(next.claims || []), ...extractedData.claims];
      }
      if (extractedData.mandatory?.length) {
        next.mandatory = [...(next.mandatory || []), ...extractedData.mandatory];
      }
      if (extractedData.facts?.length) {
        next.facts = [...(next.facts || []), ...extractedData.facts];
      }
      return next;
    });
    setDirty(true);
    setExtractedData(null);
    say("Extracted rules merged into Brand HQ! Click Save to apply.");
  };

  if (!B || !cfg) return <p className="sub">Loading…</p>;
  const set = (k, v) => { setCfg(c => ({ ...c, [k]: v })); setDirty(true); };
  const setS = (k, v) => set("settings", { ...cfg.settings, [k]: v });
  const csv = v => v.split(",").map(x => x.trim()).filter(Boolean);
  const save = async () => { await api("/brands/" + brand, { config: cfg, name: meta.name, niche: meta.niche }, "PUT"); say("BrandGuard settings saved and logged."); load(); };
  const rules = Object.entries(B.rules);
  const k = o?.kpis || {};
  return (<>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
      <div>
        <span className="crumb">Brand HQ</span>
        <h1>{meta.name}: brand command centre</h1>
        <p className="sub">Everything here is specific to this brand and niche. {ro ? "You are viewing in read-only mode. Switch to the Admin user to edit." : "Edit any section, then save once. Every change is versioned in the audit trail."}</p>
      </div>
      <div>
        <label className="btn" style={{
          cursor: ro ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(135deg, #47bfae 0%, #1f9d7a 100%)",
          opacity: ro ? 0.6 : 1
        }}>
          <span>📄</span>
          <span>{extracting ? "Extracting Rules from PDF..." : "Import Rules from PDF / Doc"}</span>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            disabled={ro || extracting}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
        </label>
      </div>
    </div>

    {extractedData && (
      <div style={{
        margin: "18px 0 24px 0",
        padding: "20px",
        borderRadius: "16px",
        background: "#ffffff",
        border: "2px solid #47bfae",
        boxShadow: "0 12px 28px rgba(71,191,174,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#171533", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✨</span> Extracted Brand Guidelines & Rules
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={applyExtracted} style={{ background: "#1f9d7a" }}>
              Merge & Apply to {meta.name}
            </button>
            <button className="btn alt" onClick={() => setExtractedData(null)}>
              Dismiss
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 13 }}>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>🎨 Colors / Palette:</strong>
            <div>{extractedData.palette?.length ? extractedData.palette.join(", ") : "None detected"}</div>
          </div>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>🔤 Detected Fonts:</strong>
            <div>{extractedData.fonts?.length ? extractedData.fonts.join(", ") : "None detected"}</div>
          </div>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>🚫 Avoid vs Prefer Terms:</strong>
            <div>
              {extractedData.terms && Object.keys(extractedData.terms).length
                ? Object.entries(extractedData.terms).map(([b, g]) => `${b} → ${g}`).join(", ")
                : "None detected"}
            </div>
          </div>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>⚖️ Unsupported Claims:</strong>
            <div>{extractedData.claims?.length ? `${extractedData.claims.length} claims found` : "None detected"}</div>
          </div>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>📊 Approved Facts:</strong>
            <div>{extractedData.facts?.length ? `${extractedData.facts.length} facts found` : "None detected"}</div>
          </div>
          <div style={{ background: "#f9f7ff", padding: 12, borderRadius: 10 }}>
            <strong>⚠️ Mandatory Disclaimers:</strong>
            <div>{extractedData.mandatory?.length ? extractedData.mandatory.map(m => m.text).join("; ") : "None detected"}</div>
          </div>
        </div>
      </div>
    )}

    <nav className="secnav" aria-label="Sections">{[["health", "Health"], ["identity", "Identity"], ["tone", "Tone and terms"], ["claims", "Claims"], ["rules", "Rules"], ["custom", "Custom rules"], ["mandatory", "Mandatory statements"], ["offers", "Offers"], ["playbook", "Niche playbook"], ["thresholds", "Thresholds"], ["ai", "AI and privacy"], ["brands", "Brands"]].map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}</nav>

    <div id="health" className="grid g4" style={{ marginBottom: 16 }}>
      <Kpi v={o?.stats.reviewed} l="pieces reviewed" /><Kpi v={o?.stats.flagged} l="issues flagged" /><Kpi v={o?.stats.compliance != null ? o.stats.compliance + "%" : null} l="compliance" />
      <Kpi v={k.approval_turnaround_hours != null ? k.approval_turnaround_hours + " h" : null} l="median approval time" />
      <Kpi v={k.correction_rate != null ? k.correction_rate + "%" : null} l="sent back for changes" /><Kpi v={k.minutes_saved ? Math.round(k.minutes_saved / 60 * 10) / 10 + " h" : null} l="est. time saved (assumed baselines)" /></div>
    <div className="grid g2" style={{ marginBottom: 24 }}>
      <Card><h2>Needs attention</h2>{o?.notifications.length ? o.notifications.map((n, i) => <p key={i}><Pill kind={n.level === "warn" ? "warn" : ""}>{n.level === "warn" ? "Soon" : "Note"}</Pill> {n.text}</p>) : <p className="note">Nothing needs attention.</p>}</Card>
      <Card><h2>What BrandGuard covers</h2>{o?.services.map(s => <p key={s.name}><a href={s.where}><b>{s.name}</b></a><br /><span className="note">{s.does}</span></p>)}</Card></div>

    <Card id="identity" style={{ marginBottom: 16 }}><h2>Identity</h2>
      <div className="grid g3">
        <Field label="Brand name" id="bn"><input id="bn" value={meta.name} disabled={ro} onChange={e => { setMeta({ ...meta, name: e.target.value }); setDirty(true); }} /></Field>
        <Field label="Niche (any text, for example 'pet care' or 'edtech')" id="ni"><input id="ni" value={meta.niche} disabled={ro} onChange={e => { setMeta({ ...meta, niche: e.target.value }); setDirty(true); }} /></Field>
        <Field label="Tagline" id="tg"><input id="tg" value={cfg.tagline || ""} disabled={ro} onChange={e => set("tagline", e.target.value)} /></Field>
        <Field label="Target audience" id="au"><input id="au" value={cfg.audience || ""} disabled={ro} onChange={e => set("audience", e.target.value)} /></Field>
        <Field label="Palette (hex, comma separated)" id="pl"><input id="pl" defaultValue={cfg.palette.join(", ")} disabled={ro} onBlur={e => set("palette", csv(e.target.value))} /></Field>
        <Field label="Approved fonts (comma separated)" id="fo"><input id="fo" defaultValue={cfg.fonts.join(", ")} disabled={ro} onBlur={e => set("fonts", csv(e.target.value))} /></Field>
        <Field label="Hashtags (comma separated)" id="ht"><input id="ht" defaultValue={(cfg.hashtags || []).join(", ")} disabled={ro} onBlur={e => set("hashtags", csv(e.target.value))} /></Field>
        <Field label="Allowed ALL-CAPS words (acronyms)" id="ac"><input id="ac" defaultValue={(cfg.acronyms || []).join(", ")} disabled={ro} onBlur={e => set("acronyms", csv(e.target.value))} /></Field>
        <Field label="Confidential codenames (never public)" id="cn"><input id="cn" defaultValue={(cfg.codenames || []).join(", ")} disabled={ro} onBlur={e => set("codenames", csv(e.target.value))} /></Field>
        <Field label="Booking link used in replies" id="bl"><input id="bl" value={cfg.booking_link || ""} disabled={ro} onChange={e => set("booking_link", e.target.value)} /></Field>
        <Field label="Support contact used in replies" id="sc"><input id="sc" value={cfg.support_contact || ""} disabled={ro} onChange={e => set("support_contact", e.target.value)} /></Field></div>
      <p>{cfg.palette.map(p => <span key={p} style={{ marginRight: 12 }}><span className="swatch" style={{ background: p }} />{p}</span>)}</p></Card>

    <div id="tone" className="grid g2" style={{ marginBottom: 16 }}>
      <Card><h2>Hype words</h2><p className="note">Replacement can be empty to remove the word.</p>
        <ListEditor readOnly={ro} items={objToList(cfg.hype, "word", "replacement")} onChange={l => set("hype", listToObj(l, "word", "replacement"))} fields={[{ k: "word", label: "Hype word" }, { k: "replacement", label: "Replace with" }]} blank={{ word: "", replacement: "" }} /></Card>
      <Card><h2>Terminology</h2><p className="note">Words to avoid and the approved alternative.</p>
        <ListEditor readOnly={ro} items={objToList(cfg.terms, "avoid", "prefer")} onChange={l => set("terms", listToObj(l, "avoid", "prefer"))} fields={[{ k: "avoid", label: "Avoid" }, { k: "prefer", label: "Prefer" }]} blank={{ avoid: "", prefer: "" }} /></Card></div>

    <Card id="claims" style={{ marginBottom: 16 }}><h2>Unsupported-claim patterns</h2><p className="note">Pattern is a regular expression. The fix keeps the message but only says what you can prove. Claims are never auto-applied without a human check.</p>
      <ListEditor readOnly={ro} items={cfg.claims} onChange={l => set("claims", l)} fields={[{ k: "label", label: "Name", w: 110 }, { k: "pattern", label: "Pattern (regex)", w: 200 }, { k: "fix", label: "Safe wording", w: 240 }]} blank={{ label: "", pattern: "", fix: "" }} /></Card>

    <Card id="rules" style={{ marginBottom: 16 }}><h2>Rules</h2><p className="note">Switch any rule on or off for this brand.</p>
      <div className="grid g3">{rules.map(([id, r]) => <label key={id} className="chk"><input type="checkbox" checked={r.enabled} disabled={ro} onChange={e => { const d = new Set(cfg.disabled_rules || []); e.target.checked ? d.delete(id) : d.add(id); set("disabled_rules", [...d]); setB(b => ({ ...b, rules: { ...b.rules, [id]: { ...r, enabled: e.target.checked } } })); }} /> <span>{r.title} <Sev s={r.severity} />{!r.builtin && <Pill>custom</Pill>}</span></label>)}</div></Card>

    <Card id="custom" style={{ marginBottom: 16 }}><h2>Your own rules</h2><p className="note">Add rules specific to your niche, such as banned medical claims, mandatory brand phrases or regulated wording. Leave “Fix” empty to flag only, or put replacement text. To remove a match entirely use a single space.</p>
      <ListEditor readOnly={ro} items={cfg.custom_rules || []} onChange={l => set("custom_rules", l.map(r => ({ ...r, id: r.id || "CUS-" + Math.random().toString(36).slice(2, 6).toUpperCase() })))}
        fields={[{ k: "id", label: "ID", w: 90 }, { k: "title", label: "Title", w: 150 }, { k: "category", label: "Category", type: "select", options: ["tone", "terminology", "messaging", "claims", "facts", "visual", "accessibility", "confidentiality", "legal", "custom"] },
          { k: "severity", label: "Severity", type: "select", options: ["minor", "major", "critical"] }, { k: "pattern", label: "Pattern (regex)", w: 180 }, { k: "fix", label: "Fix (optional)", w: 160 }, { k: "why", label: "Why it matters", w: 200 }, { k: "enabled", label: "On", type: "check" }]}
        blank={{ id: "", title: "", category: "custom", severity: "minor", pattern: "", fix: null, why: "", enabled: true }} addLabel="Add a custom rule" /></Card>

    <Card id="mandatory" style={{ marginBottom: 16 }}><h2>Mandatory statements</h2><p className="note">If the trigger pattern appears, this statement must be present. BrandGuard can add it for you.</p>
      <ListEditor readOnly={ro} items={cfg.mandatory} onChange={l => set("mandatory", l)} fields={[{ k: "id", label: "ID", w: 80 }, { k: "trigger", label: "Trigger (regex)", w: 220 }, { k: "text", label: "Required statement", w: 260 }]} blank={{ id: "", trigger: "", text: "" }} /></Card>

    <Card id="offers" style={{ marginBottom: 16 }}><h2>Offers</h2><p className="note">Drafts that mention an offer outside its dates are flagged critical. Live offers must carry their terms. Prices in replies come from here.</p>
      <ListEditor readOnly={ro} items={cfg.offers || []} onChange={l => set("offers", l.map(r => ({ ...r, id: r.id || "offer-" + Math.random().toString(36).slice(2, 6), status: "approved" })))}
        fields={[{ k: "name", label: "Name", w: 140 }, { k: "keywords", label: "Phrases that mention it", type: "csv", w: 170 }, { k: "price", label: "Price or benefit", w: 170 }, { k: "start", label: "Start", type: "date" }, { k: "end", label: "End", type: "date" }, { k: "terms", label: "Terms", w: 220 }]}
        blank={{ id: "", name: "", keywords: [], price: "", start: "", end: "", terms: "" }} addLabel="Add an offer" /></Card>

    <Card id="playbook" style={{ marginBottom: 16 }}><h2>Niche playbook</h2><p className="note">Used by the reel planner and Agent studio. Use {"{topic}"} where the topic should appear.</p>
      <div className="grid g2"><Field label="Audience" id="pa"><input id="pa" value={cfg.playbook.audience || ""} disabled={ro} onChange={e => set("playbook", { ...cfg.playbook, audience: e.target.value })} /></Field>
        <Field label="Proof to show on camera" id="pp"><input id="pp" value={cfg.playbook.proof || ""} disabled={ro} onChange={e => set("playbook", { ...cfg.playbook, proof: e.target.value })} /></Field>
        {HOOKS.map(h => <Field key={h} label={`${h} hook template`} id={"h" + h}><input id={"h" + h} value={cfg.playbook.hooks[h] || ""} disabled={ro} onChange={e => set("playbook", { ...cfg.playbook, hooks: { ...cfg.playbook.hooks, [h]: e.target.value } })} /></Field>)}</div></Card>

    <Card id="thresholds" style={{ marginBottom: 16 }}><h2>Thresholds and routing</h2><div className="grid g4">
      {[["max_sentence_words", "Max words per sentence"], ["min_contrast", "Minimum contrast ratio"], ["caps_min_len", "Shouting: ALL-CAPS from N letters"], ["fact_stale_days", "Fact review window (days)"], ["safe_fix_confidence", "Confidence for 'safe' fixes (0-1)"], ["max_replies_24h", "Max auto-replies per person per day"], ["palette_tolerance", "Palette colour tolerance"]].map(([key, lbl]) =>
        <Field key={key} label={lbl} id={key}><input id={key} type="number" step="any" value={cfg.settings[key]} disabled={ro} onChange={e => setS(key, +e.target.value)} /></Field>)}</div>
      <p className="field-label">Severities that need an authorised reviewer (others go to a manager)</p>
      <div className="row">{["minor", "major", "critical"].map(s => <label key={s} className="chk"><input type="checkbox" disabled={ro || s === "critical"} checked={cfg.settings.reviewer_severities.includes(s) || s === "critical"} onChange={e => setS("reviewer_severities", e.target.checked ? [...new Set([...cfg.settings.reviewer_severities, s])] : cfg.settings.reviewer_severities.filter(x => x !== s))} /> {s}{s === "critical" ? " (always)" : ""}</label>)}</div></Card>

    <Card id="ai" style={{ marginBottom: 16 }}><h2>AI and privacy</h2>
      <label className="chk"><input type="checkbox" checked={!!cfg.allow_external_ai} disabled={ro} onChange={e => set("allow_external_ai", e.target.checked)} /> Allow AI rewrites through an external provider</label>
      <p className="note">Off by default. When on, only non-confidential draft text and your approved facts are sent, and every rewrite is re-checked by the rule engine. Text with critical findings is never sent. See <a href="/trust">Privacy and AI use</a>.</p></Card>

    <Card id="brands" style={{ marginBottom: 16 }}><h2>Brands and niches</h2>
      <p className="note">Create another brand for a new client or niche. Copy a similar brand's rules as a starting point, or start blank.</p>
      <div className="grid g3"><Field label="Brand name" id="nbn"><input id="nbn" value={nb.name} disabled={ro} onChange={e => setNb({ ...nb, name: e.target.value })} /></Field>
        <Field label="Niche" id="nbi"><input id="nbi" value={nb.niche} disabled={ro} onChange={e => setNb({ ...nb, niche: e.target.value })} placeholder="e.g. pet care" /></Field>
        <Field label="Start from" id="nbt"><select id="nbt" value={nb.template} disabled={ro} onChange={e => setNb({ ...nb, template: e.target.value })}><option value="">Blank brand</option>{brands.map(b => <option key={b.id} value={b.id}>Copy rules from {b.name}</option>)}</select></Field></div>
      <div className="row" style={{ marginTop: 12 }}><button className="btn" disabled={ro || !nb.name.trim()} onClick={async () => { const r = await api("/brands", nb); say("Brand created."); setBrand(r.id); setNb({ name: "", niche: "", template: "" }); window.location.reload(); }}>Create brand</button>
        <button className="btn bad" disabled={ro} onClick={async () => { if (confirm(`Delete ${B.name}? Submissions and history stay in the audit trail.`)) { await api("/brands/" + brand, undefined, "DELETE"); setBrand(brands.find(b => b.id !== brand)?.id); window.location.reload(); } }}>Delete this brand</button></div></Card>

    {!ro && <div className="savebar"><span className="note">{dirty ? "You have unsaved changes." : "All changes saved."}</span><div className="row"><button className="btn alt" onClick={load} disabled={!dirty}>Discard</button><button className="btn" onClick={save} disabled={!dirty}>Save BrandGuard settings</button></div></div>}
  </>);
}
