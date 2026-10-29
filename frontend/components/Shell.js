"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/ctx";
export const ShieldIcon = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></svg>;
const MAIN = [["/", "Overview"], ["/review", "Content Review"], ["/brand", "Rule Library"], ["/facts", "Fact Library"], ["/queue", "Approvals"], ["/insights", "Insights"]];
const MORE = [["/calendar", "Content calendar"], ["/reels", "Reel studio"], ["/studio", "Agent studio"], ["/engagement", "Comments and DMs"], ["/publish", "Publishing"], ["/workflow", "Workflow"], ["/audit", "Audit trail"], ["/team", "Team and roles"], ["/trust", "Privacy and AI use"], ["/search", "Search"]];
export default function Shell({ children }) {
  const { brands, users, brand, user, setBrand, setUser, toast, ready, brandInfo } = useApp();
  const path = (usePathname() || "/").replace(/\/$/, "") || "/";
  const [open, setOpen] = useState(false);
  const home = path === "/";
  return (<>
    <a className="skip" href="#main">Skip to content</a>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="BrandGuard home"><span className="brand__mark"><ShieldIcon /></span><span>BrandGuard</span></Link>
      <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
      <nav className={open ? "is-open" : ""} aria-label="Primary navigation" onClick={() => setOpen(false)}>
        {MAIN.map(([h, t]) => <Link key={h} href={h} className={path === h ? "active" : ""}>{t}</Link>)}
        <details className="more"><summary>More ▾</summary><div className="menu">{MORE.map(([h, t]) => <Link key={h} href={h} className={path === h ? "active" : ""}>{t}</Link>)}</div></details>
      </nav>
      <div className="ctx">
        <select aria-label="Brand" value={brand} onChange={e => setBrand(e.target.value)}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <select aria-label="Signed in as" value={user} onChange={e => setUser(e.target.value)}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      </div>
    </header>
    <div id="main" tabIndex={-1} style={{ outline: "none" }}>{ready ? (home ? children : <main className="page">{children}</main>) : <main className="page"><p className="sub">Loading…</p></main>}</div>
    <div id="toast" className={toast ? "show" : ""} role="status" aria-live="polite">{toast}</div>
  </>);
}
