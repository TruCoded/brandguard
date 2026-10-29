"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Pill } from "@/components/ui";
export default function Trust() {
  const { api, brand } = useApp(); const [D, setD] = useState(null);
  useEffect(() => { api(`/disclosure?brand_id=${brand}`).then(setD).catch(() => {}); }, [api, brand]);
  if (!D) return <p className="sub">Loading…</p>;
  return (<><h1>Privacy and AI use</h1><p className="sub">What runs on your machine, what can leave it, and who controls that.</p>
    <div className="grid g2">
      <Card><h2>External services</h2>{D.services.map(s => <p key={s.name}><b>{s.name}</b> <Pill kind={s.status === "on" ? "warn" : "ok"}>{s.status}</Pill><br /><span className="note">Used for: {s.used_for}. Data sent: {s.data_sent}.</span></p>)}</Card>
      <Card><h2>Runs locally, no data leaves</h2><ul>{D.local_only.map(x => <li key={x}>{x}</li>)}</ul></Card>
      <Card><h2>Human control</h2><ul><li>AI never approves or publishes. Approvals need a person, and nobody approves their own work.</li><li>Critical items need a written justification to override.</li><li>Text with confidential findings is never sent to an external AI.</li><li>Automation can be paused per brand, and test mode sends nothing.</li><li>Uncertain items are labelled “not verified” and routed to a person.</li></ul></Card>
      <Card><h2>Accessibility of this product</h2><p>Labelled form fields, keyboard focus styles, a skip link, colour never the only signal, dark mode, and reduced-motion support.</p></Card>
    </div></>);
}
