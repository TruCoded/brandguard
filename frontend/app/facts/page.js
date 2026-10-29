"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Pill, Kpi } from "@/components/ui";
import ListEditor from "@/components/ListEditor";
export default function Facts() {
  const { api, brand, me, say } = useApp();
  const [B, setB] = useState(null); const [facts, setFacts] = useState([]); const [dirty, setDirty] = useState(false); const [test, setTest] = useState({ text: "", out: null });
  const load = useCallback(async () => { const b = await api("/brands/" + brand); setB(b); setFacts(b.config.facts.map(({ stale, ...f }) => f)); setDirty(false); }, [api, brand]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  if (!B) return <p className="sub">Loading…</p>;
  const ro = me.role !== "admin", days = B.config.settings?.fact_stale_days ?? B.defaults.fact_stale_days;
  const stale = f => f.reviewed && (Date.now() - new Date(f.reviewed)) / 864e5 > days;
  const save = async () => { const cfg = { ...B.config, facts: facts.map(f => ({ ...f, min: +f.min, max: +f.max })) }; await api("/brands/" + brand, { config: cfg }, "PUT"); say("Fact library saved."); load(); };
  return (<>
    <span className="crumb">Fact Library</span><h1>Approved facts for {B.name}</h1>
    <p className="sub">The only numbers and claims BrandGuard will accept or use in a fix. Each fact has a pattern that finds it in content, an approved range, approved wording, a source and a review date. AI is never allowed to invent facts.</p>
    <div className="grid g4" style={{ margin: "14px 0" }}><Kpi v={facts.length} l="facts" /><Kpi v={facts.filter(stale).length} l="past review window" /><Kpi v={days} l="review window (days)" /></div>
    <Card><ListEditor readOnly={ro} items={facts} onChange={l => { setFacts(l); setDirty(true); }} addLabel="Add a fact"
      fields={[{ k: "id", label: "ID", w: 110 }, { k: "label", label: "Fact", w: 150 }, { k: "pattern", label: "Pattern (regex, group 1 = the number)", w: 240 }, { k: "min", label: "Min", type: "number", w: 70 }, { k: "max", label: "Max", type: "number", w: 70 }, { k: "replacement", label: "Approved wording", w: 190 }, { k: "source", label: "Source", w: 160 }, { k: "reviewed", label: "Reviewed", type: "date" }]}
      blank={{ id: "FACT-NEW", label: "", pattern: "", min: 0, max: 0, replacement: "", source: "", reviewed: new Date().toISOString().slice(0, 10) }} />
      <p>{facts.filter(stale).map(f => <Pill key={f.id} kind="warn">{f.label}: review due</Pill>)}</p>
      {!ro && <div className="row" style={{ marginTop: 12 }}><button className="btn" disabled={!dirty} onClick={save}>Save fact library</button></div>}{ro && <p className="note">Only a Brand Admin can edit facts. Every change is logged.</p>}</Card>
    <Card style={{ marginTop: 16 }}><h2>Test a sentence</h2><p className="note">See how the fact checks treat a piece of copy before you publish it.</p>
      <textarea aria-label="Test text" rows={2} style={{ minHeight: 60 }} value={test.text} onChange={e => setTest({ ...test, text: e.target.value })} placeholder="Save up to 50% on your bills" />
      <div style={{ marginTop: 8 }}><button className="btn alt" onClick={async () => { const r = await api("/review", { brand_id: brand, text: test.text }); setTest({ ...test, out: r.findings.filter(f => f.category === "facts") }); }}>Check facts</button></div>
      {test.out && (test.out.length ? test.out.map((f, i) => <p key={i}><mark className="ev">{f.evidence}</mark> → {f.suggestion}<br /><span className="note">{f.why}</span></p>) : <p className="note">No fact conflicts found.</p>)}</Card>
  </>);
}
