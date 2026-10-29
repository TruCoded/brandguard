"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";

const P = { shield: <><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>, sparkle: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>, arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>, play: <path d="m9 7 8 5-8 5V7Z" />,
  file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>, warning: <><path d="m12 3 9 17H3l9-17Z" /><path d="M12 9v4M12 17h.01" /></>,
  snow: <><path d="M12 2v20M4 7l16 10M4 17 20 7" /><path d="m9 4 3 3 3-3M9 20l3-3 3 3" /></>, minus: <path d="M5 12h14" />, plus: <path d="M5 12h14M12 5v14" />, menu: <path d="M9 6h11M9 12h11M9 18h11" />,
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />, rotate: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
  film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>, book: <path d="M4 5c4-1 6 .5 8 2v14c-2-1.5-4-3-8-2V5ZM20 5c-4-1-6 .5-8 2v14c2-1.5 4-3 8-2V5Z" />,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />, megaphone: <><path d="m4 11 14-6v14L4 13v-2Z" /><path d="m7 14 2 6h4l-2-5" /></>, coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3 1.1 0 2-.1 2.9-.4M3 11v4c0 1.7 2.7 3 6 3" /><ellipse cx="16" cy="15" rx="5" ry="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" /></>, check: <><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>, x: <path d="m6 6 12 12M18 6 6 18" /> };
export const Icon = ({ name, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;

const homes = [[8, 52, "#a981e8"], [17, 25, "#f19b82"], [28, 82, "#ee9d69"], [39, 56, "#8b74df"], [52, 12, "#f4ae72"], [63, 64, "#7dc6b8"], [70, 15, "#9175df"], [79, 78, "#ea937e"], [89, 32, "#67baa8"], [93, 64, "#e2a95e"]];
function Building({ stop, active }) {
  const floors = stop.size === "large" ? 4 : stop.size === "medium" ? 3 : 2;
  return (<div className={`building building--${stop.size} building--${stop.motion}${active ? " is-active" : ""}`} style={{ "--accent": stop.color }}>
    <div className="building__flag" /><div className="person" aria-hidden="true"><span className="person__head" /><span className="person__body" /><span className="person__arm person__arm--left" /><span className="person__arm person__arm--right" /></div>
    <div className="building__roof"><span><Icon name={stop.icon} size={17} /></span></div>
    <div className="building__body">{Array.from({ length: floors * 2 }).map((_, i) => <i key={i} />)}</div><div className="building__steps" /></div>);
}

export default function Island() {
  const { api, brand, brandInfo } = useApp();
  const router = useRouter();
  const [o, setO] = useState(null);
  const [activeId, setActiveId] = useState("brand");
  const [frozen, setFrozen] = useState(false), [rotating, setRotating] = useState(true), [zoom, setZoom] = useState(1), [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { api(`/overview?brand_id=${brand}`).then(setO).catch(() => {}); }, [brand, api]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 2200); return () => clearTimeout(t); }, [notice]);
  const st = o?.stats || {}, k = o?.kpis || {};
  const hrs = k.minutes_saved ? `${Math.round(k.minutes_saved / 60 * 10) / 10} h saved` : "run the studio";
  const stops = useMemo(() => [
    { id: "studio", name: "Creator's Studio", short: "Agent studio", note: "AI agents turn a topic into a brief, script, checked caption and edit kit. People still approve.", icon: "film", color: "#8257e8", x: 20, y: 78, size: "small", motion: "sway", stat: `${k.studio_tasks || 0} runs done`, href: "/studio" },
    { id: "planning", name: "Planning Hub", short: "Content calendar", note: "Plan from objective, audience, offers and past performance. Deadlines and approvals stay visible.", icon: "clock", color: "#ef9a67", x: 24, y: 49, size: "medium", motion: "pulse", stat: `${st.drafts ?? 0} drafts open`, href: "/calendar" },
    { id: "review", name: "Content Review", short: "Claims and compliance", note: "Check tone, terms, claims, facts, offers, accessibility and visuals before anything goes live.", icon: "user", color: "#7655da", x: 27, y: 32, size: "small", motion: "nod", stat: `${st.flagged ?? 0} issues flagged`, href: "/review" },
    { id: "cuttery", name: "The Cuttery", short: "Reel studio", note: "Baselines, best hooks, CTAs and posting windows from your own reels, plus a reel planner.", icon: "film", color: "#39354b", x: 40, y: 14, size: "small", motion: "bounce", stat: "Reels analytics", href: "/reels" },
    { id: "brand", name: "Brand HQ", short: `${st.reviewed ?? 0} reviewed · ${st.flagged ?? 0} flagged`, note: "Your command centre. Customise identity, rules, facts, offers, thresholds and AI settings for this brand.", icon: "shield", color: "#7052dd", x: 52, y: 21, size: "large", motion: "float", stat: st.compliance != null ? `${st.compliance}% compliance` : "Set up your brand", href: "/brand" },
    { id: "library", name: "Rule Library", short: `${st.rules ?? 0} rules active`, note: "Built-in rules plus your own custom rules. Switch any rule on or off per brand.", icon: "book", color: "#886ce8", x: 75, y: 31, size: "medium", motion: "tilt", stat: `${st.rules ?? 0} rules active`, href: "/brand#rules" },
    { id: "facts", name: "Fact Library", short: `${st.facts ?? 0} facts verified`, note: "One trusted source for figures and approved wording, each with a source and a review date.", icon: "database", color: "#47bfae", x: 86, y: 50, size: "large", motion: "bounce", stat: st.stale_facts ? `${st.stale_facts} need review` : `${st.facts ?? 0} facts verified`, href: "/facts" },
    { id: "approvals", name: "Approvals", short: `${st.pending ?? 0} pending`, note: "Managers and authorised reviewers decide with full context. Nobody approves their own work.", icon: "check", color: "#a775e6", x: 70, y: 70, size: "medium", motion: "nod", stat: `${st.pending ?? 0} pending`, href: "/queue" },
    { id: "campaign", name: "Campaign Plaza", short: "Comments and DMs", note: "Approved replies for known questions, handoff for everything else, with pause and test mode.", icon: "megaphone", color: "#6754d9", x: 51, y: 76, size: "medium", motion: "sway", stat: "Replies and leads", href: "/engagement" },
    { id: "insights", name: "Insights", short: "Repeat mistakes", note: "See repeated mistakes and which rules people dismiss so often they are probably unclear.", icon: "chart", color: "#5caab1", x: 35, y: 71, size: "small", motion: "tilt", stat: "Guideline health", href: "/insights" },
    { id: "treasury", name: "The Pier", short: "Publishing and time saved", note: "Re-checked, approved posts are scheduled here. Dry run by default, with a pause switch.", icon: "coins", color: "#eeb143", x: 89, y: 79, size: "small", motion: "pulse", stat: hrs, href: "/publish" },
  ], [o]);
  const active = stops.find(s => s.id === activeId) || stops[0];
  const go = href => router.push(href);
  return (<main className={`app${frozen ? " is-frozen" : ""}`} style={{ background: "transparent" }}>
    <section className="hero">
      <div className="hero__wash" />
      <div className="copy">
        <div className="eyebrow"><Icon name="sparkle" size={15} /> AI-powered brand governance</div>
        <h1>Every piece of content.<br /><span>On-brand by design.</span></h1>
        <p>{brandInfo?.name ? `${brandInfo.name}: ` : ""}Review content, catch unsupported claims and outdated facts, apply approved fixes, and keep a human in control of every decision.</p>
        <div className="searchbox"><Icon name="search" size={18} />
          <input aria-label="Explore your brand workspace" placeholder="Explore your brand workspace" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") go(`/search/?q=${encodeURIComponent(q)}`); }} />
          <button onClick={() => go("/review")}>Enter BrandGuard <Icon name="arrow" size={16} /></button></div>
        <button className="workflow" onClick={() => go("/workflow")}><span><Icon name="play" size={13} /></span> View workflow</button>
        <div className="metrics">
          <div><Icon name="file" /><strong>{st.reviewed ?? "–"}</strong><small>pieces reviewed</small></div>
          <div><Icon name="warning" /><strong>{st.flagged ?? "–"}</strong><small>issues flagged</small></div>
          <div><Icon name="check" /><strong>{st.compliance != null ? st.compliance + "%" : "–"}</strong><small>compliance</small></div></div>
      </div>
      <div className="map-area">
        <div className="map-toolbar">
          <button className={frozen ? "active" : ""} onClick={() => setFrozen(v => !v)}><Icon name="snow" size={15} /> {frozen ? "Resume view" : "Freeze view"}</button>
          <div className="zoom-control"><button onClick={() => setZoom(v => Math.max(.84, +(v - .08).toFixed(2)))} aria-label="Zoom out"><Icon name="minus" size={14} /></button><span>Zoom {Math.round(zoom * 100)}%</span><button onClick={() => setZoom(v => Math.min(1.16, +(v + .08).toFixed(2)))} aria-label="Zoom in"><Icon name="plus" size={14} /></button></div>
          <button onClick={() => go("/audit")}><Icon name="menu" size={15} /> Activity log</button></div>
        <div className="side-tools"><button onClick={() => setZoom(1)} aria-label="Reset zoom"><Icon name="expand" /></button><button className={rotating ? "active" : ""} onClick={() => setRotating(v => !v)} aria-label="Toggle rotation"><Icon name="rotate" /></button></div>
        <div className="scene-frame"><div className={`scene${rotating ? " is-rotating" : ""}`} style={{ "--zoom": zoom }}>
          <div className="cloud cloud--one" /><div className="cloud cloud--two" /><div className="island-shadow" />
          <div className="island"><div className="island__grass" />
            <svg className="roads" viewBox="0 0 840 490" preserveAspectRatio="none" aria-hidden="true"><path d="M45 270 C135 180 195 185 275 210 S395 225 430 145 S555 80 650 125 S740 205 805 180" /><path d="M90 390 C190 330 265 370 335 305 S445 235 510 280 S635 365 795 360" /><path d="M195 78 C240 145 270 215 245 320 S230 405 280 455" /><path d="M515 35 C505 105 530 170 610 210 S735 270 770 420" /><path d="M405 130 C415 205 430 285 420 435" /></svg>
            <div className="lake"><span className="boat" /></div><div className="path path--one" /><div className="path path--two" />
            <div className="village" aria-hidden="true">{homes.map((h, i) => <span className="mini-home" key={i} style={{ "--home-x": `${h[0]}%`, "--home-y": `${h[1]}%`, "--home-color": h[2], "--home-delay": `${i * -.23}s` }}><i /><b /></span>)}</div>
            <div className="trees">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ "--i": i, "--x": `${5 + (i * 23) % 90}%`, "--y": `${5 + (i * 37) % 82}%` }} />)}</div></div>
          {stops.map(s => <button className={`stop stop--${s.id}${activeId === s.id ? " is-active" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%`, "--accent": s.color }} key={s.id} onClick={() => { setActiveId(s.id); setNotice(`${s.name} selected`); }} onDoubleClick={() => go(s.href)} aria-label={`Visit ${s.name}`}>
            <Building stop={s} active={activeId === s.id} /><span className="stop__label"><span className="stop__icon"><Icon name={s.icon} size={16} /></span><span><strong>{s.name}</strong><small>{s.short}</small></span></span></button>)}
          <div className="issue-pill"><span>!</span> {o ? `${(o.notifications || []).length} things need attention` : "loading"}</div></div></div>
        <aside className="stop-detail" style={{ "--accent": active.color, cursor: "pointer" }} onClick={() => go(active.href)} title={`Open ${active.name}`}>
          <button className="stop-detail__close" onClick={e => { e.stopPropagation(); setNotice("Detail minimised"); }} aria-label="Close detail"><Icon name="x" size={15} /></button>
          <div className="stop-detail__icon"><Icon name={active.icon} size={20} /></div>
          <div><small>Now visiting</small><strong>{active.name}</strong><p>{active.note}</p><span>{active.stat}</span>
            <button style={{ display: "block", marginTop: 8, border: 0, background: "none", padding: 0, fontWeight: 700, color: active.color, textDecoration: "underline", cursor: "pointer" }} onClick={e => { e.stopPropagation(); go(active.href); }}>Open page</button></div></aside>
        <div className="rotation-status"><i className={rotating ? "active" : ""} /> {rotating ? "World rotates clockwise" : "World rotation paused"}</div>
      </div>
    </section>
    <div className={`toast${notice ? " show" : ""}`} role="status"><Icon name="check" size={16} /> {notice}</div>
  </main>);
}
