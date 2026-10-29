"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Field, Pill } from "@/components/ui";
export default function Engagement() {
  const { api, brand, me, say } = useApp();
  const [S, setS] = useState(null); const [sim, setSim] = useState({ handle: "ravi_k", text: "How much does it cost?", kind: "comment" }); const [res, setRes] = useState(null);
  const [rule, setRule] = useState({ keyword: "", template: "" });
  const load = useCallback(async () => setS(await api(`/engagement/state?brand_id=${brand}`)), [api, brand]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  if (!S) return <p className="sub">Loading…</p>;
  const canSwitch = ["manager", "admin"].includes(me.role);
  const sw = async (key, value) => { await api("/engagement/switch", { brand_id: brand, key, value }); load(); };
  const send = async () => { setRes(await api("/engagement/simulate", { brand_id: brand, ...sim })); load(); };
  const tone = a => a === "replied" ? "ok" : a === "escalated" || a === "paused" ? "warn" : "";
  return (<>
    <h1>Comments and DMs</h1>
    <p className="sub">Approved replies for known questions, handoff to a person for everything else. Prices come from the live approved offer, never from a prompt. Messages are only called delivered when a connected service confirms it.</p>
    <Card style={{ marginBottom: 18 }}><div className="row space"><div><b>Safety switches</b><p className="note">Per-user limit: {S.max_replies_per_user_24h} replies per 24 hours. Duplicate events are ignored. Opt-outs are honoured.</p></div>
      <div className="row"><label className="chk"><input type="checkbox" checked={S.paused} disabled={!canSwitch} onChange={e => sw("paused", e.target.checked)} /> Pause all automation</label>
        <label className="chk"><input type="checkbox" checked={S.test_mode} disabled={!canSwitch} onChange={e => sw("test", e.target.checked)} /> Test mode (nothing is sent)</label></div></div>
      {!canSwitch && <p className="note">Only a Manager or Admin can change these.</p>}</Card>
    <div className="grid g2">
      <Card><h2>Try an incoming message</h2>
        <div className="grid g2" style={{ gap: 8 }}><Field label="Handle" id="hd"><input id="hd" value={sim.handle} onChange={e => setSim({ ...sim, handle: e.target.value })} /></Field>
          <Field label="Type" id="kd"><select id="kd" value={sim.kind} onChange={e => setSim({ ...sim, kind: e.target.value })}><option value="comment">Comment</option><option value="dm">DM</option><option value="story_reply">Story reply</option></select></Field></div>
        <Field label="Message" id="mg"><textarea id="mg" rows={3} value={sim.text} onChange={e => setSim({ ...sim, text: e.target.value })} /></Field>
        <p className="note">Try: “CHECKLIST”, “how much?”, “can I book a demo?”, “I want a refund”, “I will call my lawyer”, “stop messaging me”.</p>
        <div style={{ marginTop: 10 }}><button className="btn" onClick={send}>Send</button></div>
        {res && <div className="sugg" style={{ marginTop: 12 }}><p><Pill kind={tone(res.action)}>{res.action}</Pill> intent: <b>{res.intent}</b></p>
          {res.reply && <p>Reply: “{res.reply}”</p>}<p className="note">Delivery: {res.delivery}{res.handoff ? ` · handoff: ${res.handoff}` : ""}{res.template_version ? ` · template ${res.template_version}` : ""}</p></div>}</Card>
      <Card><h2>Keyword replies</h2>
        {S.rules.map(r => <p key={r.id}><b>{r.keyword}</b> v{r.version}<br /><span className="note">{r.template}</span></p>)}
        {canSwitch && <><Field label="New keyword" id="kw"><input id="kw" value={rule.keyword} onChange={e => setRule({ ...rule, keyword: e.target.value })} /></Field>
          <Field label="Approved reply" id="kt"><textarea id="kt" rows={2} style={{ minHeight: 60 }} value={rule.template} onChange={e => setRule({ ...rule, template: e.target.value })} /></Field>
          <div style={{ marginTop: 8 }}><button className="btn sm" onClick={async () => { if (rule.keyword && rule.template) { await api("/engagement/rules", { brand_id: brand, ...rule }); setRule({ keyword: "", template: "" }); say("Saved as a new version."); load(); } }}>Save rule</button></div></>}
        <p className="note">Run your reply text through Review before activating it.</p></Card>
      <Card><h2>Recent events</h2><div className="tablewrap"><table><thead><tr><th>Who</th><th>Message</th><th>Intent</th><th>Result</th></tr></thead><tbody>
        {S.events.slice(0, 12).map((e, i) => <tr key={i}><td>@{e.handle}</td><td>{e.text}</td><td>{e.intent}</td><td><Pill kind={tone(e.action)}>{e.action}</Pill><br /><span className="note">{e.delivery}{e.handoff ? ` · ${e.handoff}` : ""}</span></td></tr>)}
        {!S.events.length && <tr><td colSpan={4} className="empty">No events yet.</td></tr>}</tbody></table></div></Card>
      <Card><h2>Leads</h2><p className="note">Created from price and demo questions. Qualify with one clarifying question, never invent availability.</p><div className="tablewrap"><table><thead><tr><th>Who</th><th>Need</th><th>Intent</th><th>Owner</th></tr></thead><tbody>
        {S.leads.map(l => <tr key={l.id}><td>@{l.handle}</td><td>{l.need}</td><td>{l.intent}</td><td>{l.owner}</td></tr>)}{!S.leads.length && <tr><td colSpan={4} className="empty">No leads yet.</td></tr>}</tbody></table></div></Card>
    </div></>);
}
