"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Field, Pill } from "@/components/ui";
export default function Publish() {
  const { api, brand, me, say } = useApp();
  const [S, setS] = useState(null); const [f, setF] = useState({ submission_id: "", platform: "instagram", scheduled_at: "", video_url: "" });
  const load = useCallback(async () => setS(await api(`/publish?brand_id=${brand}`)), [api, brand]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  if (!S) return <p className="sub">Loading…</p>;
  const ok = ["manager", "reviewer", "admin"].includes(me.role);
  const schedule = async () => { if (!f.submission_id || !f.scheduled_at) return say("Choose an approved item and a time."); const r = await api("/publish", { ...f, submission_id: +f.submission_id, brand_id: brand }); say(r.status === "blocked" ? "Blocked: " + r.reasons[0] : "Scheduled."); load(); };
  const run = async j => { const r = await api(`/publish/${j}/run`, {}); say(r.status === "blocked" ? "Blocked: " + r.reasons[0] : r.status === "dry_run_ok" ? "Dry run passed. Nothing was sent." : r.status); load(); };
  const tone = s => s === "published" || s === "dry_run_ok" ? "ok" : s === "blocked" || s === "failed" ? "bad" : "warn";
  return (<>
    <h1>Publishing</h1>
    <p className="sub">Only approved content can be scheduled. Every item is re-checked at schedule time and again at run time, so an offer that expired after approval is caught. Duplicates are refused.</p>
    <Card style={{ marginBottom: 18 }}><div className="row space"><div><b>Mode:</b> <Pill kind={S.live_enabled ? "warn" : "ok"}>{S.live_enabled ? "Live publishing enabled" : "Dry run (nothing is sent)"}</Pill>
      <p className="note">Live publishing needs PUBLISH_LIVE=1, a connected Instagram account with the publishing permission, and a public video URL. It is untested against live Meta.</p></div>
      <label className="chk"><input type="checkbox" checked={S.paused} disabled={!["manager", "admin"].includes(me.role)} onChange={async e => { await api("/publish/pause", { brand_id: brand, key: "paused", value: e.target.checked }); load(); }} /> Pause publishing</label></div></Card>
    <div className="grid g2">
      <Card><h2>Schedule an approved item</h2>
        <Field label="Approved item" id="si"><select id="si" value={f.submission_id} onChange={e => setF({ ...f, submission_id: e.target.value })}><option value="">Choose…</option>{S.approved.map(a => <option key={a.id} value={a.id}>#{a.id} {a.title}</option>)}</select></Field>
        <Field label="Platform" id="pf"><select id="pf" value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}><option>instagram</option></select></Field>
        <Field label="When" id="wh"><input id="wh" type="datetime-local" value={f.scheduled_at} onChange={e => setF({ ...f, scheduled_at: e.target.value })} /></Field>
        <Field label="Public video URL (for live publishing only)" id="vu"><input id="vu" value={f.video_url} onChange={e => setF({ ...f, video_url: e.target.value })} /></Field>
        <div style={{ marginTop: 12 }}><button className="btn" disabled={!ok} onClick={schedule}>Schedule</button></div>{!ok && <p className="note">Only a Manager or Reviewer can schedule.</p>}</Card>
      <Card><h2>Jobs</h2><div className="tablewrap"><table><thead><tr><th>Job</th><th>When</th><th>Status</th><th /></tr></thead><tbody>
        {S.jobs.map(j => <tr key={j.id}><td>#{j.id} (item #{j.submission_id})</td><td>{j.scheduled_at}</td><td><Pill kind={tone(j.status)}>{j.status}</Pill>{j.result?.blocked_because && <p className="note">{j.result.blocked_because[0]}</p>}</td>
          <td>{ok && !["published", "dry_run_ok"].includes(j.status) && <button className="btn sm" onClick={() => run(j.id)}>Run now</button>}</td></tr>)}
        {!S.jobs.length && <tr><td colSpan={4} className="empty">No jobs yet.</td></tr>}</tbody></table></div></Card>
    </div></>);
}
