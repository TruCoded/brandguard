"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Pill } from "@/components/ui";
export default function Audit() {
  const { api } = useApp(); const [A, setA] = useState(null);
  useEffect(() => { api("/audit?limit=150").then(setA).catch(() => {}); }, [api]);
  if (!A) return <p className="sub">Loading…</p>;
  return (<><h1>Audit trail</h1><p className="sub">Each entry is chained to the previous one with a hash. If any record is edited, the chain breaks.</p>
    <p><Pill kind={A.chain.ok ? "ok" : "bad"}>{A.chain.ok ? "Chain verified" : "Chain broken at #" + A.chain.broken_at}</Pill></p>
    <Card><div className="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>Target</th><th>Detail</th><th>Hash</th></tr></thead><tbody>
      {A.events.map(e => <tr key={e.id}><td>{e.ts.replace("T", " ")}</td><td>{e.actor}</td><td>{e.action}</td><td>{e.target}</td><td className="note">{JSON.stringify(e.detail)}</td><td className="note">{e.hash}</td></tr>)}</tbody></table></div></Card></>);
}
