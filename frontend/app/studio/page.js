"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { Card, Kpi, Field, Pill, Sev } from "@/components/ui";
export default function Studio() {
  const { api, brand, say } = useApp();
  const [S, setS] = useState(null); const [topic, setTopic] = useState(""); const [goal, setGoal] = useState("conversions");
  const [agent, setAgent] = useState(""); const [busy, setBusy] = useState(false); const [out, setOut] = useState(null);
  const load = useCallback(async () => setS(await api(`/studio/status?brand_id=${brand}&agent=${agent}`)), [api, brand, agent]);
  useEffect(() => { load().catch(() => {}); const t = setInterval(() => load().catch(() => {}), 2500); return () => clearInterval(t); }, [load]);
  const run = async () => { if (!topic.trim()) return say("Give the studio a topic."); setBusy(true); try { setOut(await api("/studio/run", { brand_id: brand, topic, goal })); say("Done. A person still has to approve it."); load(); } finally { setBusy(false); } };
  if (!S) return <p className="sub">Loading…</p>;
  const g = S.global;
  return (<>
    <h1>Agent studio</h1>
    <p className="sub">Your small AI marketing department. Each agent does one job using the same rule engine, facts and analytics as the rest of the product. Work stops at a human approval.</p>
    <div className="grid g4" style={{ margin: "16px 0" }}><Kpi v={g.tasks_done} l="tasks done" /><Kpi v={g.success_rate + "%"} l="success rate" /><Kpi v={g.avg_seconds + "s"} l="average run time" /><Kpi v={Math.round(g.minutes_saved / 60 * 10) / 10 + " h"} l="est. time saved" hint={S.disclaimer} /><Kpi v={g.xp} l="XP earned" /></div>
    <div className="floor" style={{ marginBottom: 18 }}><div className="houses">
      {S.agents.map(a => <button key={a.id} className={`house ${a.state}`} onClick={() => setAgent(agent === a.id ? "" : a.id)} aria-pressed={agent === a.id} title={a.job}>
        <span className="av" aria-hidden="true">{a.icon}</span><br /><b>{a.name}</b> <span className="st">{a.state}</span><br /><span className="note">{a.last || a.job}</span></button>)}</div></div>
    <div className="grid g2">
      <Card><h2>Give the department a job</h2>
        <Field label="Topic" id="tp"><input id="tp" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. rooftop solar subsidy" /></Field>
        <Field label="Goal" id="gl"><select id="gl" value={goal} onChange={e => setGoal(e.target.value)}><option value="conversions">Conversions</option><option value="reach">Reach</option><option value="saves">Saves</option><option value="traffic">Link clicks</option></select></Field>
        <div style={{ marginTop: 12 }}><button className="btn" onClick={run} disabled={busy}>{busy ? "Working…" : "Run pipeline"}</button></div>
        <p className="note">Director → Analyst → Scriptwriter → QA editor → Compliance → Producer → Post-producer. Nothing is published.</p>
        {out && <div style={{ marginTop: 14 }}><h3>Result</h3>
          <p><b>Caption after safe fixes</b></p><div className="card flat" style={{ whiteSpace: "pre-wrap" }}>{out.caption}</div>
          {out.remaining_findings.length > 0 && <><p><b>Still needs a person</b></p>{out.remaining_findings.map((f, i) => <p key={i}><Sev s={f.severity} /> {f.title}: <mark className="ev">{f.evidence}</mark></p>)}</>}
          <p>Sent to <b>{out.route === "escalated" ? "a Reviewer" : "a Manager"}</b>. <Link href={`/queue/?id=${out.submission_id}`}>Open submission #{out.submission_id}</Link> · added to the calendar.</p>
          <h3>Edit kit</h3><ul>{out.edit_kit.map((k, i) => <li key={i}>{k}</li>)}</ul><p className="note">Estimated {out.minutes_saved_estimate} minutes of manual work (assumed baselines). {out.note}</p></div>}</Card>
      <Card><div className="row space"><h2>Execution log {agent && <Pill>{agent}</Pill>}</h2>{agent && <button className="btn sm alt" onClick={() => setAgent("")}>All agents</button>}</div>
        <div className="log" role="log">{S.log.map((e, i) => <div key={i}><span className="note">{e.ts}</span><b>{e.agent}</b><span className="kind">{e.kind}</span><span>{e.message}</span></div>)}{!S.log.length && <p className="note">No activity yet. Run the pipeline.</p>}</div>
        <h3 style={{ marginTop: 14 }}>Task board</h3>{S.tasks.slice(0, 6).map(t => <p key={t.id}><Pill kind={t.status}>{t.status}</Pill> {t.title} <span className="note">{t.minutes_saved ? `· ~${t.minutes_saved} min saved` : ""}</span></p>)}</Card>
    </div></>);
}
