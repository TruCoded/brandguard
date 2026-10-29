"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/ctx";
export const ShieldIcon = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></svg>;
const MORE = [["/calendar", "Content calendar"], ["/reels", "Reel studio"], ["/studio", "Agent studio"], ["/engagement", "Comments and DMs"], ["/publish", "Publishing"], ["/workflow", "Workflow"], ["/audit", "Audit trail"], ["/team", "Team and roles"], ["/trust", "Privacy and AI use"], ["/search", "Search"]];

export default function Shell({ children }) {
  const { brands, brand, setBrand, toast, ready, isLoggedIn, me, logout } = useApp();
  const path = (usePathname() || "/").replace(/\/$/, "") || "/";
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const home = path === "/" || path === "/dashboard";

  // Global Route Guard: If not logged in and trying to access any page other than "/" or "/login", redirect to "/login"
  useEffect(() => {
    if (ready && !isLoggedIn && path !== "/" && path !== "/login") {
      router.push("/login");
    }
  }, [ready, isLoggedIn, path, router]);

  const mainNav = isLoggedIn
    ? [["/", "Dashboard"], ["/review", "Content Review"], ["/brand", "Rule Library"], ["/facts", "Fact Library"], ["/queue", "Approvals"], ["/insights", "Insights"]]
    : [];

  return (<>
    <a className="skip" href="#main">Skip to content</a>
    <header className="topbar">
      <Link className="brand" href={isLoggedIn ? "/dashboard" : "/"} aria-label="BrandGuard home">
        <span className="brand__mark"><ShieldIcon /></span>
        <span>BrandGuard</span>
      </Link>
      <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
      <nav className={open ? "is-open" : ""} aria-label="Primary navigation" onClick={() => setOpen(false)}>
        {mainNav.map(([h, t]) => <Link key={h} href={h} className={path === h ? "active" : ""}>{t}</Link>)}
        {isLoggedIn && (
          <details className="more"><summary>More ▾</summary><div className="menu">{MORE.map(([h, t]) => <Link key={h} href={h} className={path === h ? "active" : ""}>{t}</Link>)}</div></details>
        )}
      </nav>
      <div className="ctx">
        {brands && brands.length > 0 && (
          <select aria-label="Brand" value={brand} onChange={e => setBrand(e.target.value)}>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {isLoggedIn && me ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", background: "rgba(109,74,212,0.12)", color: "#6d4ad4", padding: "4px 8px", borderRadius: "6px", fontWeight: "600" }}>
              {me.name} ({me.role})
            </span>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              style={{
                fontSize: "12px",
                background: "transparent",
                border: "1px solid #d1d5db",
                padding: "4px 8px",
                borderRadius: "6px",
                cursor: "pointer",
                color: "#4b5563"
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              fontSize: "13px",
              background: "#6d4ad4",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600"
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
    <div id="main" tabIndex={-1} style={{ outline: "none" }}>
      {ready ? (home ? children : <main className="page">{children}</main>) : <main className="page"><p className="sub">Loading…</p></main>}
    </div>
    <div id="toast" className={toast ? "show" : ""} role="status" aria-live="polite">{toast}</div>
  </>);
}
