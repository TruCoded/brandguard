"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { Card, Field, Pill } from "@/components/ui";
const blank = { title: "", date: "", time: "19:00", channel: "instagram", format: "reel", objective: "conversions", audience: "", funnel_stage: "awareness", approval_deadline: "", notes: "" };
export default function Calendar() {
  const { api, brand, say } = useApp();
  const [items, setItems] = useState([]);
  const [f, setF] = useState(blank);
  const [offers, setOffers] = useState([]);
  const load = useCallback(async () => { setItems(await api(`/calendar?brand_id=${brand}`)); setOffers(await api(`/offers?brand_id=${brand}`)); }, [api, brand]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const add = async () => { if (!f.title || !f.date) return say("Title and date are required."); await api("/calendar", { ...f, brand_id: brand }); setF(blank); load(); };
  const plan = async () => { const r = await api("/calendar/plan", { brand_id: brand, weeks: 2, per_week: 3 }); say(`Planned ${r.length} items from your best patterns.`); load(); };
  const byDate = items.reduce((a, i) => ((a[i.date] = a[i.date] || []).push(i), a), {});
  return (<>
    <h1>Content calendar</h1>
    <p className="sub">Plan from the objective, audience, channel, offer status and past performance. Times are recommendations from your own data, not guarantees.</p>
    <div className="grid g2">
      <Card><h2>Add an item</h2>
        <Field label="Title" id="ti"><input id="ti" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid g2" style={{ gap: 8 }}>
          <Field label="Date" id="da"><input id="da" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Time" id="tm"><input id="tm" type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
          <Field label="Channel" id="ch"><select id="ch" value={f.channel} onChange={e => setF({ ...f, channel: e.target.value })}>{["instagram", "youtube", "tiktok", "linkedin", "x", "email"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Format" id="fm"><select id="fm" value={f.format} onChange={e => setF({ ...f, format: e.target.value })}>{["reel", "carousel", "post", "story", "email"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Objective" id="ob"><select id="ob" value={f.objective} onChange={e => setF({ ...f, objective: e.target.value })}>{["conversions", "reach", "saves", "traffic"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Funnel stage" id="fs"><select id="fs" value={f.funnel_stage} onChange={e => setF({ ...f, funnel_stage: e.target.value })}>{["awareness", "consideration", "conversion", "retention"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Approval deadline" id="ad"><input id="ad" type="date" value={f.approval_deadline} onChange={e => setF({ ...f, approval_deadline: e.target.value })} /></Field>
          <Field label="Audience" id="au"><input id="au" value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })} /></Field>
        </div>
        <div className="row" style={{ marginTop: 12 }}><button className="btn" onClick={add}>Add to calendar</button><button className="btn go" onClick={plan}>Auto-plan 2 weeks</button></div>
      </Card>
      <Card><h2>Offers and their dates</h2>
        {offers.map(o => <p key={o.id}><Pill kind={o.state}>{o.state}</Pill> <b>{o.name}</b>: {o.price}<br /><span className="note">{o.start} to {o.end}{o.state === "live" ? ` · ${o.days_left} days left` : ""}. {o.terms}</span></p>)}
        <p className="note">Drafts that mention an expired offer are flagged as critical and cannot be published.</p></Card>
    </div>
    <h2 style={{ marginTop: 24 }}>Schedule</h2>
    <div className="week">{Object.keys(byDate).sort().map(d => <div className="day" key={d}><h4>{new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</h4>
      {byDate[d].map(i => <span key={i.id} className={`chip ${i.deadline_risk ? "risk" : ""}`} title={i.notes}>{i.time} {i.title}<br /><span className="note">{i.status}{i.deadline_risk ? " · approval due soon" : ""}</span>
        {i.submission_id && <><br /><Link href={`/queue/?id=${i.submission_id}`}>open #{i.submission_id}</Link></>}
        <br /><a href="#" onClick={async e => { e.preventDefault(); await api(`/calendar/${i.id}`, undefined, "DELETE"); load(); }}>remove</a></span>)}</div>)}
      {!items.length && <p className="note">Nothing scheduled yet.</p>}</div>
  </>);
}
