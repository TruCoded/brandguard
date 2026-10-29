"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { Card, Pill } from "@/components/ui";
export default function Search() {
  const { api, brand } = useApp(); const [q, setQ] = useState(""); const [res, setRes] = useState([]);
  useEffect(() => { setQ(new URLSearchParams(window.location.search).get("q") || ""); }, []);
  useEffect(() => { const t = setTimeout(() => api(`/search?brand_id=${brand}&q=${encodeURIComponent(q)}`).then(setRes).catch(() => {}), 200); return () => clearTimeout(t); }, [q, brand, api]);
  return (<><span className="crumb">Search</span><h1>Explore your brand workspace</h1>
    <input aria-label="Search" autoFocus style={{ maxWidth: 520, marginBottom: 16 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search rules, facts, terms, offers, submissions, calendar, trends" />
    <h3>{q.trim() ? `${res.length} result${res.length === 1 ? "" : "s"} for “${q.trim()}”` : "Everything in your workspace"}</h3>
    <div className="grid g2">{res.map((r, i) => <Card key={i}><Pill>{r.type}</Pill> <Link href={r.href}><b>{r.title}</b></Link><p className="note">{r.detail}</p></Card>)}</div></>);
}
