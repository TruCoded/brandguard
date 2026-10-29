"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Kpi, Plot, PALETTE as P } from "@/components/ui";
const LBL = { draft: "Draft", in_review: "With manager", escalated: "With reviewer", changes_requested: "Changes requested", approved: "Approved", published: "Published" };
export default function Insights() {
  const { api, brand } = useApp(); const [I, setI] = useState(null);
  useEffect(() => { api(`/insights?brand_id=${brand}`).then(setI).catch(() => {}); }, [api, brand]);
  if (!I) return <p className="sub">Loading…</p>;
  return (<>
    <h1>Insights</h1><p className="sub">Where creators trip up, and which rules may be the problem.</p>
    <div className="grid g4" style={{ margin: "16px 0" }}>{Object.entries(I.pipeline).map(([k, v]) => <Kpi key={k} v={v} l={LBL[k]} />)}</div>
    <div className="grid g2">
      <Card><h2>Issues by rule</h2><Plot config={{ type: "bar", data: { labels: I.by_rule.map(r => r.rule_id), datasets: [{ label: "Fixed", data: I.by_rule.map(r => r.fixed), backgroundColor: P.mint }, { label: "Dismissed", data: I.by_rule.map(r => r.dismissed), backgroundColor: P.coral }, { label: "Shown", data: I.by_rule.map(r => r.shown), backgroundColor: P.sun }] }, options: { scales: { x: { stacked: true }, y: { stacked: true } } } }} /></Card>
      <Card><h2>Issues by category</h2><Plot config={{ type: "doughnut", data: { labels: Object.keys(I.by_category), datasets: [{ data: Object.values(I.by_category), backgroundColor: [P.mint, P.sun, P.coral, P.plum, P.sky, "#f78fb3", "#9aa5b1", "#f59e0b"] }] } }} /></Card>
      <Card><h2>Handled findings by team</h2><Plot config={{ type: "bar", data: { labels: Object.keys(I.by_team), datasets: [{ label: "Fixed or dismissed", data: Object.values(I.by_team), backgroundColor: P.plum }] } }} /></Card>
      <Card><h2>Rules that may be unclear</h2>
        {I.unclear_rules.map(u => <div key={u.rule_id} className="finding major"><b>{u.rule_id} {u.title}</b><br />{Math.round(u.dismissal_rate * 100)}% dismissed across {u.n} findings. Common reason: “{u.top_reason}”.<p className="note">{u.advice}</p></div>)}
        {!I.unclear_rules.length && <p className="empty">No rule is dismissed unusually often.</p>}</Card>
    </div></>);
}
