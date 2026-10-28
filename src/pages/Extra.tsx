import { useState } from 'react'
import './pages.css'

const to = (id: string) => { window.location.hash = id; window.scrollTo(0, 0) }

type Item = { t: string; s: string; to: string; kind: string }
const INDEX: Item[] = [
  { t: 'Brand HQ', s: 'Compliance dashboard, activity feed and quick actions', to: 'brand', kind: 'Page' },
  { t: 'The Cuttery', s: 'TikTok safe zones, licensed audio, caption compliance', to: 'cuttery', kind: 'Page' },
  { t: 'Planning Hub', s: 'Content calendar, resources and trend tracker', to: 'planning', kind: 'Page' },
  { t: 'Creator’s Studio', s: 'On-brand scriptwriter, copy review and asset staging', to: 'studio', kind: 'Page' },
  { t: 'Content Review', s: 'AI scans with explanations and smart fixes', to: 'review', kind: 'Page' },
  { t: 'Rule Library', s: 'Visual guidelines, tone and voice, formatting rules', to: 'library', kind: 'Page' },
  { t: 'Fact Library', s: 'Approved claims, legal disclaimers, auto-updater', to: 'facts', kind: 'Page' },
  { t: 'Approvals', s: 'Role-based workflows, comments and audit trail', to: 'approvals', kind: 'Page' },
  { t: 'Campaign Plaza', s: 'Brand-safe keywords, ad variation checker, funnel', to: 'campaign', kind: 'Page' },
  { t: 'The Treasury', s: 'Payouts, budget tracking and penalty ROI', to: 'treasury', kind: 'Page' },
  { t: 'Insights', s: 'Recurring mistakes, guideline gaps, team performance', to: 'insights', kind: 'Page' },
  { t: 'Users and roles', s: 'Invite teammates and set roles', to: 'users', kind: 'Page' },
  { t: 'Settings', s: 'Workspace and notification preferences', to: 'settings', kind: 'Page' },
  { t: 'Activity log', s: 'Everything that happened in your workspace', to: 'activity', kind: 'Page' },
  { t: 'Workflow', s: 'How content moves from plan to publish', to: 'workflow', kind: 'Page' },
  { t: 'Mission Control', s: 'Level, XP, daily missions, pipeline and global pause', to: 'pilot', kind: 'Page' },
  { t: 'Brand Memory', s: 'Versioned facts, offers, claims, audience and platform rules', to: 'memory', kind: 'Page' },
  { t: 'Release Gate', s: 'Check drafts for expired offers, unsupported claims and missing terms', to: 'gate', kind: 'Page' },
  { t: 'Engagement Inbox', s: 'Comment and DM rules, test mode, rate limits and handoffs', to: 'inbox', kind: 'Page' },
  { t: 'Viral Lab', s: 'Baseline comparison, patterns and one test at a time', to: 'viral', kind: 'Page' },
  { t: 'Lead Desk', s: 'Qualify leads by need, fit and intent', to: 'leads', kind: 'Page' },
  { t: 'Impact', s: 'Time saved, cost comparison, reliability and supported roles', to: 'impact', kind: 'Page' },
  { t: 'Pilot plan', s: 'Phases, exit tests, definition of done and first decisions', to: 'plan', kind: 'Page' },
  { t: 'Agency Services', s: 'Service lines and influencer disclosure checks', to: 'agency', kind: 'Page' },
  { t: 'Free shipping over $60', s: 'Approved claim · Pricing sheet', to: 'facts', kind: 'Fact' },
  { t: 'Founded in 2012', s: 'Approved claim · Company records', to: 'facts', kind: 'Fact' },
  { t: 'Results may vary.', s: 'Legal disclaimer · Performance claims', to: 'facts', kind: 'Fact' },
  { t: 'Primary purple #6D4AD4', s: 'Visual guideline · Color', to: 'library', kind: 'Rule' },
  { t: 'Forbidden terms', s: 'Tone rule · guaranteed, #1, cheap, competitor names', to: 'library', kind: 'Rule' },
  { t: 'Sponsored content needs #ad', s: 'Formatting rule', to: 'library', kind: 'Rule' },
  { t: 'Spring launch reel', s: 'Awaiting Legal approval', to: 'approvals', kind: 'Asset' },
  { t: 'Viral Remix 2024', s: 'Audio · Copyright risk', to: 'cuttery', kind: 'Asset' },
  { t: 'best shoe ever', s: 'Keyword · Blocked', to: 'campaign', kind: 'Keyword' },
]

export function Search({ q }: { q: string }) {
  const [term, setTerm] = useState(q)
  const hits = INDEX.filter((i) => `${i.t} ${i.s} ${i.kind}`.toLowerCase().includes(term.trim().toLowerCase()))
  return <>
    <div className="card">
      <label htmlFor="gs" className="muted">Search pages, facts, rules, assets and keywords</label>
      <input id="gs" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Try “disclaimer” or “approvals”" style={{ marginTop: 6 }} />
    </div>
    <div className="card mt">
      <h3>{term.trim() ? `${hits.length} result${hits.length === 1 ? '' : 's'} for “${term.trim()}”` : 'Everything in your workspace'}</h3>
      {hits.length === 0 && <p className="muted">Nothing matches. Check the spelling or search for a page name like “Rule Library”.</p>}
      {hits.map((h) => <div className="row" key={h.t + h.to}><div className="g"><b>{h.t}</b><small>{h.s}</small></div><span className="tag">{h.kind}</span><button className="btn sm" onClick={() => to(h.to)}>Open</button></div>)}
    </div>
  </>
}

const FEED = [
  { t: 'Spring launch reel flagged', s: 'Unapproved claim · Content Review', w: '10 min ago', k: 'Alerts', tag: 'bad', go: 'review' },
  { t: 'Viral Remix 2024 blocked', s: 'Copyright risk · The Cuttery', w: '1 hour ago', k: 'Alerts', tag: 'bad', go: 'cuttery' },
  { t: 'Summer reel recap approved', s: 'Legal · Approvals', w: '2 hours ago', k: 'Approvals', tag: 'ok', go: 'approvals' },
  { t: 'Fact “Free shipping over $50” changed', s: '3 assets need a re-check · Fact Library', w: '3 hours ago', k: 'Alerts', tag: 'warn', go: 'facts' },
  { t: 'Trend “Day in my life” marked viable', s: 'Planning Hub', w: '4 hours ago', k: 'Team', tag: '', go: 'planning' },
  { t: 'Competitor rule updated by Ana', s: 'Rule Library', w: 'Yesterday', k: 'Team', tag: '', go: 'library' },
  { t: 'Q4 email hero copy approved', s: 'Brand Manager · Approvals', w: 'Yesterday', k: 'Approvals', tag: 'ok', go: 'approvals' },
  { t: 'Priya joined the workspace', s: 'Users and roles', w: '2 days ago', k: 'Team', tag: '', go: 'users' },
]
export function Activity() {
  const [f, setF] = useState('All')
  const list = FEED.filter((x) => f === 'All' || x.k === f)
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {['All', 'Alerts', 'Approvals', 'Team'].map((x) => <button key={x} className={`btn sm${f === x ? ' p' : ''}`} aria-pressed={f === x} onClick={() => setF(x)}>{x}</button>)}
      </div>
      {list.map((a) => <div className="row" key={a.t}><div className="g"><b>{a.t}</b><small>{a.s} · {a.w}</small></div>{a.tag && <span className={`tag ${a.tag}`}>{a.k}</span>}<button className="btn sm" onClick={() => to(a.go)}>Open</button></div>)}
    </div>
  )
}

const STEPS = [
  ['Plan', 'Schedule shorts and reels, assign creators and check which trends are safe.', 'planning', 'Planning Hub'],
  ['Write', 'Draft scripts with the on-brand writer and polish the copy.', 'studio', 'Creator’s Studio'],
  ['Cut', 'Edit short video with safe zones, licensed audio and approved captions.', 'cuttery', 'The Cuttery'],
  ['Review', 'Scan text, images and video. Every flag cites the rule it breaks.', 'review', 'Content Review'],
  ['Approve', 'Route to Legal, the Marketing Director or the Brand Manager.', 'approvals', 'Approvals'],
  ['Launch', 'Run brand-safe keywords and check ad variations at scale.', 'campaign', 'Campaign Plaza'],
  ['Learn', 'See which rules break most and where guidelines are unclear.', 'insights', 'Insights'],
]
export function Workflow() {
  return (
    <div className="card">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {STEPS.map((s, i) => <li className="row" key={s[0]}><div className="av" style={{ width: 38, height: 38, fontSize: 15 }}>{i + 1}</div><div className="g"><b>{s[0]}</b><small>{s[1]}</small></div><button className="btn sm" onClick={() => to(s[2])}>Open {s[3]}</button></li>)}
      </ol>
    </div>
  )
}
