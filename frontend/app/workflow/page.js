"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { Card } from "@/components/ui";
const L = { draft: "Draft", in_review: "With manager", escalated: "With reviewer", changes_requested: "Changes requested", approved: "Approved", published: "Published" };
export default function Workflow() {
  const { api, brand } = useApp(); const [W, setW] = useState(null);
  useEffect(() => { api(`/workflow?brand_id=${brand}`).then(setW).catch(() => {}); }, [api, brand]);
  if (!W) return <p className="sub">Loading…</p>;
  return (<><span className="crumb">Workflow</span><h1>How content moves through BrandGuard</h1>
    <p className="sub">Automation does the checking. People make the decisions.</p>
    <div className="steps" style={{ margin: "16px 0" }}>{W.steps.map(([t, d]) => <div key={t}><h3>{t}</h3><p className="note">{d}</p></div>)}</div>
    <h2>Right now</h2><div className="pipe" style={{ marginBottom: 18 }}>{Object.entries(W.counts).map(([k, v]) => <div key={k}><b>{v}</b><span>{L[k]}</span></div>)}</div>
    <Card><h2>Who decides</h2><table><tbody>
      <tr><td>No issues or only minor ones</td><td>{W.reviewer_severities.includes("minor") ? "Authorised reviewer" : "Manager"}</td></tr>
      <tr><td>Major issues (claims, facts, offers, visuals, accessibility)</td><td>{W.reviewer_severities.includes("major") ? "Authorised reviewer" : "Manager"}</td></tr>
      <tr><td>Critical issues (confidential information, expired offers)</td><td>Authorised reviewer only. Override needs a written justification.</td></tr>
      <tr><td>Creator disagrees with a finding</td><td>Dismisses with a reason. Logged and counted in Insights.</td></tr>
      <tr><td>Any status change</td><td>Recorded in the hash-chained audit trail</td></tr></tbody></table>
      <p className="note">Routing thresholds are set per brand in <Link href="/brand/#thresholds">Brand HQ</Link>.</p></Card></>);
}
