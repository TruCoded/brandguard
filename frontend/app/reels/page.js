"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";
import { Card, Kpi, Field, Plot, PALETTE as P, Pill } from "@/components/ui";
export default function Reels() {
  const { api, brand, say, setDraft } = useApp();
  const router = useRouter();
  const [platform, setPlatform] = useState("instagram");
  const [A, setA] = useState(null); const [st, setSt] = useState({}); const [trends, setTrends] = useState([]);
  const [csv, setCsv] = useState(null); const [topic, setTopic] = useState(""); const [goal, setGoal] = useState("conversions");
  const [idea, setIdea] = useState(null); const [p, setP] = useState({ hook_type: "question", cta_type: "comment-keyword", duration: 25, hour: 19 }); const [pred, setPred] = useState(null);
  const [tr, setTr] = useState({ kind: "format", label: "", note: "" });
  const load = useCallback(async () => { setA(await api(`/reels/analysis?brand_id=${brand}&platform=${platform}`)); setSt(await api(`/reels/status?brand_id=${brand}`)); setTrends(await api(`/trends?brand_id=${brand}`)); }, [api, brand, platform]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  if (!A) return <p className="sub">Loading…</p>;
  const a = A.analysis, rows = a.reels || [];
  const grp = (dim, label) => ({ type: "bar", data: { labels: a.groups[dim].map(g => `${g.name} (n=${g.n})`), datasets: [{ label, data: a.groups[dim].map(g => g.score), backgroundColor: P.plum }] }, options: { indexAxis: "y" } });
  const funnel = rows.length ? ["reach", "profile_visits", "link_clicks", "leads"].map(k => rows.reduce((s, r) => s + (r[k] || 0), 0)) : [];
  return (<>
    <h1>Reel studio</h1>
    <p className="sub">Compare each reel with your own baseline, see which hooks, lengths, CTAs and posting times work for {A.niche} audiences, and plan the next one. Directional guidance, not a promise of virality.</p>
    <Card style={{ marginBottom: 18 }}><div className="row space"><div>
      <div className="row"><b>Platform</b><select aria-label="Platform" style={{ width: 160 }} value={platform} onChange={e => setPlatform(e.target.value)}><option value="instagram">Instagram Reels</option><option value="youtube">YouTube Shorts</option><option value="tiktok">TikTok</option></select>
        <Pill>{A.source === "demo" ? "Demo data" : A.source === "real" ? "Your data" : "No data"}</Pill></div>
      <p className="note">Sign in with Instagram to analyse real reels, import a CSV from any platform, or explore with demo data.</p></div>
      <div className="row"><button className="btn" onClick={async () => { try { const r = await api(`/instagram/login?brand_id=${brand}`); window.location.href = r.url; } catch (e) { } }}>{st.connected ? "Refresh from Instagram" : "Sign in with Instagram"}</button>
        <button className="btn alt" onClick={async () => { await api(`/reels/demo?brand_id=${brand}&platform=${platform}`, {}); load(); }}>New demo data</button>
        <button className="btn alt" onClick={() => setCsv(csv === null ? "" : null)}>Import CSV</button></div></div>
      {csv !== null && <><Field label="Paste CSV. Header: caption,posted_at,hour,duration,views,reach,avg_watch_sec,likes,comments,shares,saves,profile_visits,link_clicks,leads" id="csv"><textarea id="csv" rows={5} value={csv} onChange={e => setCsv(e.target.value)} /></Field>
        <button className="btn sm" style={{ marginTop: 8 }} onClick={async () => { const r = await api("/reels/import", { brand_id: brand, platform, csv_text: csv }); say(`Imported ${r.imported} reels.`); setCsv(null); load(); }}>Import</button></>}</Card>
    {a.count ? <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Kpi v={a.count} l="reels analysed" /><Kpi v={a.above} l="above baseline" /><Kpi v={a.baseline.retention ? Math.round(a.baseline.retention * 100) + "%" : null} l="median watch-through" />
        <Kpi v={(a.baseline.conversion_rate * 100).toFixed(2) + "%"} l="median conversion (reach to lead or click)" /></div>
      <div className="grid g2">
        <Card><h2>Every reel against your baseline</h2><p className="note">1.0 is your median. Score blends watch-through (35%), shares (20%), saves (15%) and conversions (30%).</p>
          <Plot config={{ type: "bar", data: { labels: rows.map((_, i) => i + 1), datasets: [{ label: "Score vs baseline", data: rows.map(r => r.score), backgroundColor: rows.map(r => r.label === "above baseline" ? P.mint : r.label === "below baseline" ? P.coral : P.sun) }, { type: "line", label: "Baseline", data: rows.map(() => 1), borderColor: P.plum, pointRadius: 0 }] } }} /></Card>
        <Card><h2>What to repeat</h2>{A.recommendations.map((r, i) => <p key={i}><b>{r.advice}.</b><br /><span className="note">{r.evidence} · {r.confidence}</span></p>)}</Card>
        <Card><h2>Hook types</h2><Plot config={grp("hook_type", "Median score vs baseline")} /></Card>
        <Card><h2>CTA types: score and conversion</h2><Plot config={{ type: "bar", data: { labels: a.groups.cta_type.map(g => `${g.name} (n=${g.n})`), datasets: [{ label: "Score vs baseline", data: a.groups.cta_type.map(g => g.score), backgroundColor: P.plum }, { label: "Conversion % of reach", data: a.groups.cta_type.map(g => g.conversion), backgroundColor: P.sun }] } }} /></Card>
        <Card><h2>Length</h2><Plot config={grp("duration", "Median score vs baseline")} /></Card>
        <Card><h2>Posting time</h2><Plot config={grp("posting_time", "Median score vs baseline")} /></Card>
        <Card><h2>Funnel</h2><p className="note">Reach to profile visits to link clicks to leads, summed across reels.</p>
          <Plot config={{ type: "bar", data: { labels: ["Reach", "Profile visits", "Link clicks", "Leads"], datasets: [{ label: "People", data: funnel, backgroundColor: [P.sky, P.plum, P.sun, P.mint] }] }, options: { indexAxis: "y", scales: { x: { type: "logarithmic" } } } }} /></Card>
        <Card><h2>Trend board</h2><p className="note">There is no live trend feed. Add what you or your analyst see working in the niche. Active trends feed the Agent studio.</p>
          {trends.filter(t => t.active).map(t => <p key={t.id}><Pill>{t.kind}</Pill> <b>{t.label}</b> <span className="note">{t.note}</span> <a href="#" onClick={async e => { e.preventDefault(); await api(`/trends/${t.id}`, undefined, "DELETE"); load(); }}>retire</a></p>)}
          <div className="row"><select aria-label="Trend kind" style={{ width: 110 }} value={tr.kind} onChange={e => setTr({ ...tr, kind: e.target.value })}>{["format", "audio", "topic", "hook"].map(x => <option key={x}>{x}</option>)}</select>
            <input aria-label="Trend label" placeholder="What is trending" value={tr.label} onChange={e => setTr({ ...tr, label: e.target.value })} style={{ flex: 1 }} />
            <button className="btn sm" onClick={async () => { if (tr.label) { await api("/trends", { ...tr, brand_id: brand }); setTr({ ...tr, label: "" }); load(); } }}>Add</button></div></Card>
      </div></> : <Card><p className="empty">No reels yet. Use demo data or import a CSV.</p></Card>}
    <div className="grid g2" style={{ marginTop: 18 }}>
      <Card><h2>Plan your next reel</h2>
        <Field label="Topic" id="tp"><input id="tp" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. rooftop solar subsidy" /></Field>
        <Field label="Goal" id="gl"><select id="gl" value={goal} onChange={e => setGoal(e.target.value)}><option value="conversions">Conversions (leads)</option><option value="reach">Reach</option><option value="saves">Saves</option><option value="traffic">Link clicks</option></select></Field>
        <div style={{ marginTop: 12 }}><button className="btn" onClick={async () => { if (!topic.trim()) return say("Enter a topic first."); setIdea(await api("/reels/ideas", { brand_id: brand, topic, goal, platform })); }}>Generate plan</button></div>
        {idea && <><h3 style={{ marginTop: 14 }}>Hook options</h3>{idea.hooks.map((h, i) => <p key={i}>{h.from_your_data ? "★ " : ""}<b>{h.type}:</b> {h.text}</p>)}<p className="note">★ is your best-performing hook type so far.</p>
          <h3>Script ({idea.target_seconds}s)</h3><div className="timeline">{idea.script.map((s, i) => <div key={i}><b>{s.time} {s.beat}</b><br />{s.do}</div>)}</div>
          <h3>CTA</h3><p>{idea.cta.text}</p><h3>Caption</h3><div className="card flat" style={{ whiteSpace: "pre-wrap" }}>{idea.caption}</div>
          <div className="row" style={{ marginTop: 10 }}><button className="btn sm go" onClick={() => { setDraft({ title: "Reel: " + topic, text: idea.caption, channel: platform, has_image: false, alt_text: "", visual: {} }); router.push("/review"); }}>Check caption with BrandGuard</button></div></>}</Card>
      <Card><h2>Estimate a planned reel</h2><p className="note">Uses your own history. More reels, better estimate.</p>
        <div className="grid g2" style={{ gap: 8 }}>
          <Field label="Hook" id="ph"><select id="ph" value={p.hook_type} onChange={e => setP({ ...p, hook_type: e.target.value })}>{["question", "myth-bust", "result-first", "pov", "tutorial"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="CTA" id="pc"><select id="pc" value={p.cta_type} onChange={e => setP({ ...p, cta_type: e.target.value })}>{["comment-keyword", "link-in-bio", "save-this", "follow", "none"].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Length (seconds)" id="pd"><input id="pd" type="number" min={5} max={180} value={p.duration} onChange={e => setP({ ...p, duration: +e.target.value })} /></Field>
          <Field label="Hour posted (0-23)" id="pt"><input id="pt" type="number" min={0} max={23} value={p.hour} onChange={e => setP({ ...p, hour: +e.target.value })} /></Field></div>
        <div style={{ marginTop: 12 }}><button className="btn alt" onClick={async () => setPred(await api("/reels/predict", { brand_id: brand, platform, ...p }))}>Estimate</button></div>
        {pred && <><p style={{ marginTop: 12 }}><b>{pred.label}</b>{pred.expected_vs_baseline ? ` · about ${pred.expected_vs_baseline}x your baseline` : ""}</p><p className="note">{pred.note}{pred.based_on_min_reels ? ` Based on at least ${pred.based_on_min_reels} comparable reels per factor.` : ""}</p></>}</Card>
    </div></>);
}
