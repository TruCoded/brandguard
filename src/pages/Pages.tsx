import { useState, type ReactNode } from 'react'
import './pages.css'
import { Profile, Users, Settings } from './Account'
import { Search, Activity, Workflow } from './Extra'
import { MissionControl, Memory, Gate, Inbox, Viral, Leads, Impact, Plan, Agency } from './Pilot'
import { useProgress, levelOf, titleOf } from './xp'
import type { User } from '../auth'

const P: Record<string, ReactNode> = {
  shield: <><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
  film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" /></>,
  book: <path d="M4 5c4-1 6 .5 8 2v14c-2-1.5-4-3-8-2V5ZM20 5c-4-1-6 .5-8 2v14c2-1.5 4-3 8-2V5Z" />,
  db: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  mega: <><path d="m4 11 14-6v14L4 13v-2Z" /><path d="m7 14 2 6h4l-2-5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  home: <path d="M4 11 12 4l8 7v9H4v-9Z" />,
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  inbox: <><path d="M4 13h4l1 3h6l1-3h4" /><path d="M4 13 6 5h12l2 8v6H4v-6Z" /></>,
  flask: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
}
const Ic = ({ n, s = 18 }: { n: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
)

export const go = (id: string) => { window.location.hash = id; window.scrollTo(0, 0) }

const MODS = [
  { id: 'brand', n: 'Brand HQ', ic: 'shield' }, { id: 'cuttery', n: 'The Cuttery', ic: 'film' },
  { id: 'planning', n: 'Planning Hub', ic: 'clock' }, { id: 'studio', n: 'Creator’s Studio', ic: 'film' },
  { id: 'review', n: 'Content Review', ic: 'user', badge: 3 }, { id: 'library', n: 'Rule Library', ic: 'book' },
  { id: 'facts', n: 'Fact Library', ic: 'db' }, { id: 'approvals', n: 'Approvals', ic: 'check', badge: 5 },
  { id: 'campaign', n: 'Campaign Plaza', ic: 'mega' }, { id: 'treasury', n: 'The Treasury', ic: 'coin' },
  { id: 'insights', n: 'Insights', ic: 'chart' },
]
const PILOT = [{ id: 'pilot', n: 'Mission Control', ic: 'bolt' }, { id: 'memory', n: 'Brand Memory', ic: 'db' }, { id: 'gate', n: 'Release Gate', ic: 'shield' }, { id: 'inbox', n: 'Engagement Inbox', ic: 'inbox' }, { id: 'viral', n: 'Viral Lab', ic: 'flask' }, { id: 'leads', n: 'Lead Desk', ic: 'target' }, { id: 'impact', n: 'Impact', ic: 'chart' }, { id: 'plan', n: 'Pilot plan', ic: 'list' }, { id: 'agency', n: 'Agency Services', ic: 'mega' }]
const ACCOUNT = [{ id: 'activity', n: 'Activity log', ic: 'clock' }, { id: 'workflow', n: 'Workflow', ic: 'check' }, { id: 'users', n: 'Users and roles', ic: 'user' }, { id: 'settings', n: 'Settings', ic: 'menu' }, { id: 'profile', n: 'My profile', ic: 'user' }]

type K = '' | 'ok' | 'warn' | 'bad'
const Tag = ({ k = '', children }: { k?: K; children: ReactNode }) => <span className={`tag ${k}`}>{children}</span>
const Kpi = ({ b, s }: { b: string; s: string }) => <div className="card kpi"><b>{b}</b><span>{s}</span></div>
const Row = ({ t, s, r }: { t: ReactNode; s?: ReactNode; r?: ReactNode }) => <div className="row"><div className="g">{t}<small>{s}</small></div>{r}</div>
const Meter = ({ label, v, max = 100, warn, suffix = '%' }: { label: string; v: number; max?: number; warn?: boolean; suffix?: string }) => (
  <div><div className="lbl"><span>{label}</span><b>{v}{suffix}</b></div><div className="bar"><i style={{ width: `${(v / max) * 100}%`, background: warn ? 'var(--warn)' : undefined }} /></div></div>
)
const Card = ({ title, children, cls = '' }: { title?: string; children: ReactNode; cls?: string }) => <div className={`card ${cls}`}>{title && <h3>{title}</h3>}{children}</div>

function Head({ t, p, children, menu }: { t: string; p: string; children?: ReactNode; menu: () => void }) {
  return (
    <div className="top">
      <button className="btn menu" onClick={menu} aria-label="Menu"><Ic n="menu" /></button>
      <div><h1>{t}</h1><p>{p}</p></div>
      <div className="sp">{children}</div>
    </div>
  )
}

type Say = (m: string) => void

function BrandHQ({ say }: { say: Say }) {
  return <>
    <div className="grid g4"><Kpi b="124" s="Assets reviewed" /><Kpi b="18" s="Issues flagged" /><Kpi b="92%" s="Brand health score" /><Kpi b="5" s="Awaiting approval" /></div>
    <div className="grid g2 mt">
      <Card title="Activity">
        <Row t="Spring launch reel flagged" s="Unapproved claim · 10 min ago" r={<Tag k="bad">Alert</Tag>} />
        <Row t="Summer reel recap approved" s="Legal · 2 hours ago" r={<Tag k="ok">Approved</Tag>} />
        <Row t="New trend: “Day in my life”" s="Planning Hub · 4 hours ago" r={<Tag>Viable</Tag>} />
        <Row t="Fact “Free shipping over $50” changed" s="3 assets need a re-check" r={<Tag k="warn">Update</Tag>} />
      </Card>
      <Card title="Health by area">
        <Meter label="Visual rules" v={96} /><Meter label="Tone and voice" v={88} /><Meter label="Facts and claims" v={84} /><Meter label="Legal disclaimers" v={93} />
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn p sm" onClick={() => go('review')}>New review</button>
          <button className="btn sm" onClick={() => say('Invite link copied')}>Add user</button>
          <button className="btn sm" onClick={() => go('library')}>Update guideline</button>
        </div>
      </Card>
    </div>
  </>
}

function Cuttery() {
  const [zone, setZone] = useState(false)
  const [cap, setCap] = useState(true)
  return (
    <div className="grid g2">
      <Card title="Safe-zone check">
        <div className="phone"><div className="logo">BrandGuard</div><div className="ui" />{cap && <div className="cap"><b>@brand</b><br />New drop is live today</div>}{zone && <div className="zone" />}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
          <button className="btn sm" onClick={() => setZone(!zone)}>{zone ? 'Hide' : 'Show'} safe zones</button>
          <button className="btn sm" onClick={() => setCap(!cap)}>{cap ? 'Hide' : 'Show'} captions</button>
        </div>
        <div style={{ textAlign: 'center' }}><Tag k="ok">Logo clear of TikTok buttons</Tag></div>
      </Card>
      <div className="grid">
        <Card title="Audio governance">
          <Row t="Golden Hour Loop" s="Licensed · 0:30" r={<Tag k="ok">Cleared</Tag>} />
          <Row t="Street Beat 04" s="Licensed · 0:45" r={<Tag k="ok">Cleared</Tag>} />
          <Row t="Viral Remix 2024" s="Unlicensed sample" r={<Tag k="bad">Copyright risk</Tag>} />
        </Card>
        <Card title="Caption compliance">
          <Row t="Font: Manrope Bold" s="Approved typeface" r={<Tag k="ok">Pass</Tag>} />
          <Row t="White on #6D4AD4" s="Contrast 6.1 : 1" r={<Tag k="ok">Pass</Tag>} />
          <Row t="Position: bottom third" s="Overlaps the like button" r={<Tag k="warn">Fix</Tag>} />
        </Card>
      </div>
    </div>
  )
}

function Planning({ say }: { say: Say }) {
  const [cal, setCal] = useState<Record<string, string[]>>({ Mon: ['Spring teaser · Reels'], Tue: ['Product demo · TikTok'], Wed: [], Thu: ['Creator Q&A · Shorts'], Fri: [] })
  const [over, setOver] = useState('')
  const drop = (e: React.DragEvent, to: string) => {
    e.preventDefault(); setOver('')
    const [from, item] = e.dataTransfer.getData('t').split('|')
    if (!item || from === to) return
    setCal((c) => ({ ...c, [from]: c[from].filter((x) => x !== item), [to]: [...c[to], item] })); say(`Moved to ${to}`)
  }
  return <>
    <Card title="This week">
      <div className="cal">
        {Object.keys(cal).map((d) => (
          <div key={d} className={over === d ? 'over' : ''} onDragOver={(e) => { e.preventDefault(); setOver(d) }} onDragLeave={() => setOver('')} onDrop={(e) => drop(e, d)}>
            <h4>{d}</h4>
            {cal[d].map((t) => <div key={t} className="chip" draggable onDragStart={(e) => e.dataTransfer.setData('t', `${d}|${t}`)}>{t}</div>)}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 0 }}>Drag a post to another day to reschedule it.</p>
    </Card>
    <div className="grid g2 mt">
      <Card title="Resources">
        <Row t="Spring teaser" s="Editor: Priya · Designer: Leo" r={<Tag k="ok">Assigned</Tag>} />
        <Row t="Product demo" s="Creator: Jordan" r={<Tag k="warn">Needs editor</Tag>} />
        <Row t="Creator Q&A" s="Unassigned" r={<Tag k="bad">Open</Tag>} />
      </Card>
      <Card title="Trend tracker">
        <Row t="“Day in my life” format" s="Brand-safe" r={<Tag k="ok">Viable</Tag>} />
        <Row t="Rival-bashing challenge" s="Names a competitor" r={<Tag k="bad">Avoid</Tag>} />
        <Row t="Sped-up unboxing" s="Needs a disclaimer" r={<Tag k="warn">With changes</Tag>} />
      </Card>
    </div>
  </>
}

function Studio({ say }: { say: Say }) {
  const [brief, setBrief] = useState('')
  const [out, setOut] = useState('')
  const gen = () => {
    if (!brief.trim()) return say('Describe the video first')
    setOut(`Hook: Spring is here, and so are your new daily miles.\nScene: ${brief.slice(0, 60)}, close-up on the sneaker\nVoiceover: Built for everyday comfort. Find yours today.\nOn screen: Results may vary.`)
  }
  return (
    <div className="grid g2">
      <Card title="On-brand scriptwriter">
        <label htmlFor="brief" style={{ fontSize: 13, color: 'var(--mute)' }}>What is the video about?</label>
        <textarea id="brief" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="A 20-second teaser for the spring collection" />
        <button className="btn p" style={{ marginTop: 10 }} onClick={gen}>Write script</button>
        {out && <><div style={{ marginTop: 14, whiteSpace: 'pre-line', background: 'var(--bg)', padding: 12, borderRadius: 12 }}>{out}</div><p><Tag k="ok">Tone matches rules</Tag><Tag k="ok">No banned terms</Tag></p></>}
      </Card>
      <div className="grid">
        <Card title="Copy review">
          <textarea aria-label="Copy to review" style={{ minHeight: 80 }} defaultValue="Meet the sneaker that is better than anything else on the market." />
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => say('Copy sent to Content Review')}>Send to review</button>
        </Card>
        <Card title="Asset staging">
          <Row t="raw_spring_take3.mov" s="2.4 GB" r={<Tag k="ok">Staged</Tag>} />
          <Row t="broll_street.mp4" s="860 MB" r={<Tag k="ok">Staged</Tag>} />
          <Row t="project_spring.prproj" s="12 MB" r={<Tag>Working</Tag>} />
        </Card>
      </div>
    </div>
  )
}

const ISSUES: Record<string, { type: string; why: string; fix: string; text: string }> = {
  r1: { type: 'Unapproved claim', why: 'The Fact Library has no “#1” statement. Rule F-04: superlatives need proof.', fix: 'the most comfortable shoe we’ve made', text: 'the #1 shoe in the world' },
  r2: { type: 'Performance guarantee', why: 'Rule L-02: no performance guarantees without a legal disclaimer.', fix: 'is designed to support your run', text: 'guarantees you will run faster' },
  r3: { type: 'Competitor name', why: 'Rule T-07: never name a competitor.', fix: 'built for everyday miles', text: 'Nike-beating' },
}
function Review({ say }: { say: Say }) {
  const [fixed, setFixed] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState('r1')
  const left = Object.keys(ISSUES).filter((k) => !fixed[k])
  const M = ({ k }: { k: string }) => fixed[k]
    ? <mark className="fixed">{ISSUES[k].fix}</mark>
    : <mark tabIndex={0} onClick={() => setOpen(k)} onKeyDown={(e) => e.key === 'Enter' && setOpen(k)}>{ISSUES[k].text}</mark>
  const cur = ISSUES[open]
  return (
    <div className="grid g2">
      <Card title="Instagram caption draft">
        <p style={{ fontSize: 18, lineHeight: 1.7 }}>Our new sneaker is <M k="r1" /> and <M k="r2" />. It’s <M k="r3" /> comfort.</p>
        {left.length ? <Tag k="bad">{left.length} issues</Tag> : <Tag k="ok">Clean</Tag>}
        <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => { setFixed({}); setOpen('r1'); say('Scan complete: 3 issues') }}>Rescan</button>
      </Card>
      <Card title="Why it was flagged">
        {fixed[open] ? <p>Fixed. Rescan to confirm.</p> : <>
          <Tag k="bad">{cur.type}</Tag><p>{cur.why}</p>
          <div style={{ background: 'var(--okbg)', padding: 10, borderRadius: 10, marginBottom: 10 }}><small>Suggested fix</small><br /><b>{cur.fix}</b></div>
          <button className="btn p sm" onClick={() => { setFixed({ ...fixed, [open]: true }); const n = Object.keys(ISSUES).find((k) => k !== open && !fixed[k]); if (n) setOpen(n); say('Fix applied') }}>Apply fix</button>{' '}
          <button className="btn sm" onClick={() => say('Sent to Approvals')}>Request override</button>
        </>}
      </Card>
    </div>
  )
}

function Library({ say }: { say: Say }) {
  const [tone, setTone] = useState([70, 40, 55])
  const sw: [string, string][] = [['Primary purple', '#6D4AD4'], ['Ink', '#171533'], ['Lavender', '#ECE6FC'], ['Mint', '#47BFAE']]
  const sl = [['Authoritative', 'Playful'], ['Formal', 'Casual'], ['Serious', 'Witty']]
  return <>
    <div className="grid g2">
      <Card title="Visual guidelines">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{sw.map(([n, h]) => <div key={h} style={{ textAlign: 'center', fontSize: 12 }}><div style={{ width: 64, height: 48, borderRadius: 10, background: h, border: '1px solid var(--line)' }} />{n}<br />{h}</div>)}</div>
        <Row t="Typeface" s="Manrope headings, DM Sans body" /><Row t="Logo clear space" s="Height of the “B” on all sides" /><Row t="Contrast minimum" s="4.5 : 1 for text" />
      </Card>
      <Card title="Tone and voice">
        {sl.map(([a, b], i) => <div className="range" key={a}><span>{a}</span><input type="range" aria-label={`${a} to ${b}`} value={tone[i]} onChange={(e) => setTone(tone.map((v, j) => (j === i ? +e.target.value : v)))} /><span style={{ textAlign: 'right' }}>{b}</span></div>)}
        <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 4 }}>Forbidden terms</p>
        {['guaranteed', '#1', 'cheap', 'Nike', 'Adidas'].map((x) => <Tag key={x} k="bad">{x}</Tag>)}
        <div style={{ marginTop: 12 }}><button className="btn sm" onClick={() => say('Tone saved')}>Save tone</button></div>
      </Card>
    </div>
    <Card title="Formatting rules" cls="mt">
      <Row t="Financial posts" s="Include a risk disclaimer" r={<Tag k="ok">Active</Tag>} />
      <Row t="Sponsored content" s="Add #ad in the first line" r={<Tag k="ok">Active</Tag>} />
      <Row t="Regional promos" s="Show the local terms link" r={<Tag k="ok">Active</Tag>} />
    </Card>
  </>
}

function Facts() {
  const claims = [['Founded in 2012', 'Company records', 'Verified'], ['Free shipping over $60', 'Pricing sheet', 'New'], ['4.8 average rating', 'Reviews export, Oct 2026', 'Verified'], ['Ships to 40 countries', 'Logistics team', 'Verified']]
  return <>
    <div className="card" style={{ borderColor: 'var(--warn)' }}><b>Fact changed:</b> “Free shipping over $50” is now “over $60”. <Tag k="warn">3 approved assets affected</Tag> <button className="btn sm" onClick={() => go('review')}>Review assets</button></div>
    <Card title="Approved claims" cls="mt scroll"><table><thead><tr><th>Claim</th><th>Source</th><th>Status</th></tr></thead><tbody>{claims.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><Tag k={r[2] === 'New' ? 'warn' : 'ok'}>{r[2]}</Tag></td></tr>)}</tbody></table></Card>
    <Card title="Legal disclaimers" cls="mt">
      <Row t="Results may vary." s="All regions · Performance claims" /><Row t="Offer valid in the US only." s="US · Promotions" /><Row t="Prices include VAT." s="EU · Pricing" />
    </Card>
  </>
}

function Approvals({ say }: { say: Say }) {
  const [items, setItems] = useState([
    { t: 'Spring launch reel', w: 'Legal', st: 'pending', c: ['Check the pricing disclaimer on frame 4.'] },
    { t: 'Q4 email hero copy', w: 'Brand Manager', st: 'pending', c: [] as string[] },
    { t: 'Partner webinar ad set', w: 'Marketing Director', st: 'pending', c: ['Waiting on the partner logo.'] },
    { t: 'Summer reel recap', w: 'Legal', st: 'approved', c: [] as string[] },
  ])
  const [audit, setAudit] = useState(['Maya approved “Summer reel recap” · 2 hours ago', 'Sam commented on “Spring launch reel” · 3 hours ago', 'Rule “Competitor names” updated by Ana · yesterday'])
  const decide = (i: number, st: string) => {
    setItems(items.map((a, j) => (j === i ? { ...a, st } : a)))
    setAudit([`You ${st === 'approved' ? 'approved' : 'requested changes on'} “${items[i].t}” · just now`, ...audit]); say(st === 'approved' ? 'Approved' : 'Changes requested')
  }
  return (
    <div className="grid g2">
      <Card title="Queue">
        {items.map((a, i) => (
          <div className="row" key={a.t}>
            <div className="g"><b>{a.t}</b><small>{a.w} · {a.c.length} comments</small>{a.c.map((c) => <small key={c}>“{c}”</small>)}</div>
            {a.st === 'pending' ? <><button className="btn sm" onClick={() => decide(i, 'changes')}>Request changes</button><button className="btn p sm" onClick={() => decide(i, 'approved')}>Approve</button></>
              : <Tag k={a.st === 'approved' ? 'ok' : 'warn'}>{a.st === 'approved' ? 'Approved' : 'Changes requested'}</Tag>}
          </div>
        ))}
      </Card>
      <Card title="Audit trail">
        {audit.map((a) => <Row key={a} t={a} />)}
        <h3 style={{ margin: '16px 0 4px', fontSize: 16 }}>Routing</h3>
        <Row t="Claims and pricing" s="Legal" /><Row t="Campaign creative" s="Marketing Director" /><Row t="Everyday posts" s="Brand Manager" />
      </Card>
    </div>
  )
}

function Campaign() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ q: string; bad: boolean } | null>(null)
  const [scan, setScan] = useState(false)
  const kws: [string, boolean][] = [['spring running shoes', false], ['best shoe ever', true], ['sneakers vs Nike', true], ['comfortable daily trainers', false]]
  const fun: [string, string, number][] = [['Impressions', '210k', 100], ['Clicks', '9.4k', 60], ['Leads', '1.2k', 32], ['Customers', '310', 14]]
  return <>
    <div className="grid g2">
      <Card title="Keyword check">
        <input type="search" aria-label="Check a keyword" placeholder="Type a keyword and press Enter" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) setRes({ q, bad: /best|nike|adidas|cheap|#1|guarant/i.test(q) }) }} />
        {res && <p><Tag k={res.bad ? 'bad' : 'ok'}>{res.bad ? 'Not brand-safe' : 'Approved'}</Tag> “{res.q}”</p>}
        {kws.map(([k, b]) => <Row key={k} t={k} r={<Tag k={b ? 'bad' : 'ok'}>{b ? 'Blocked' : 'Approved'}</Tag>} />)}
      </Card>
      <Card title="Ad variations">
        <p>500 dynamic variations ready to scan.</p>
        <button className="btn p" onClick={() => setScan(true)}>Scan all</button>
        {scan && <div style={{ marginTop: 14 }}><Tag k="ok">471 passed</Tag><Tag k="warn">21 need edits</Tag><Tag k="bad">8 blocked</Tag><div className="bar" style={{ marginTop: 10 }}><i style={{ width: '94%' }} /></div></div>}
      </Card>
    </div>
    <Card title="Funnel for on-brand content" cls="mt">{fun.map(([l, v, w]) => <div key={l} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px', gap: 10, alignItems: 'center', margin: '10px 0' }}><span>{l}</span><div className="bar"><i style={{ width: `${w}%` }} /></div><b>{v}</b></div>)}</Card>
  </>
}

function Treasury() {
  return <>
    <div className="grid g3"><Kpi b="$18,400" s="Saved by catching errors" /><Kpi b="$42,900" s="Spent this quarter" /><Kpi b="$6,250" s="Payouts pending" /></div>
    <div className="grid g2 mt">
      <Card title="Creator and agency payouts">
        <Row t="Jordan · Spring teaser" s="Paid after approval" r={<Tag k="ok">$1,200</Tag>} />
        <Row t="Studio North · Reel pack" s="Waiting on approval" r={<Tag k="warn">$3,400</Tag>} />
        <Row t="Priya · Edits" s="Published Oct 24" r={<Tag k="ok">$1,650</Tag>} />
      </Card>
      <Card title="Budget by campaign"><Meter label="Spring launch" v={72} suffix="% used" /><Meter label="Always-on social" v={48} suffix="% used" /><Meter label="Partner webinar" v={91} warn suffix="% used" /></Card>
    </div>
  </>
}

function Insights() {
  return <>
    <div className="grid g2">
      <Card title="Most broken rules"><Meter label="Unapproved claims" v={34} max={40} suffix="" /><Meter label="Competitor names" v={22} max={40} suffix="" /><Meter label="Missing disclaimer" v={17} max={40} suffix="" /><Meter label="Caption contrast" v={9} max={40} suffix="" /></Card>
      <Card title="Guideline gaps">
        <Row t="Influencer tone" s="11 overrides this month" r={<Tag k="warn">Unclear</Tag>} />
        <Row t="Meme formats" s="6 creator disputes" r={<Tag k="warn">Unclear</Tag>} />
        <Row t="Partner co-branding" s="No rule yet" r={<Tag k="bad">Missing</Tag>} />
      </Card>
    </div>
    <Card title="Team performance" cls="mt scroll"><table><thead><tr><th>Creator</th><th>Compliance</th><th>Avg. review time</th></tr></thead><tbody>{[['Jordan', '97%', '3 h'], ['Priya', '94%', '5 h'], ['Leo', '88%', '9 h']].map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></Card>
  </>
}

const INFO: Record<string, [string, string]> = {
  brand: ['Brand HQ', 'Brand health across every asset.'], cuttery: ['The Cuttery', 'Check cuts for TikTok before you post.'],
  planning: ['Planning Hub', 'Plan shorts and reels across platforms.'], studio: ['Creator’s Studio', 'Write scripts that follow your rules.'],
  review: ['Content Review', 'Scan before you publish.'], library: ['Rule Library', 'Your visual, tone and format rules.'],
  facts: ['Fact Library', 'Claims you can publish safely.'], approvals: ['Approvals', 'Sign off with a clear record.'],
  campaign: ['Campaign Plaza', 'Keep search and ads on-brand.'], treasury: ['The Treasury', 'Payouts, budgets and savings.'],
  insights: ['Insights', 'Learn where rules break and where guidelines are unclear.'],
  users: ['Users and roles', 'Control who can review, approve and publish.'], settings: ['Settings', 'Workspace and notification preferences.'], profile: ['My profile', 'Your details and password.'],
  pilot: ['Mission Control', 'Run the marketing department like a game. Earn XP for real work.'], memory: ['Brand Memory', 'One versioned source of truth for facts, offers and rules.'],
  gate: ['Release Gate', 'Every claim, price and offer date checked before release.'], inbox: ['Engagement Inbox', 'Approved replies, clear limits and human handoffs.'],
  viral: ['Viral Lab', 'Compare each post with your own baseline. No guarantees.'], leads: ['Lead Desk', 'Need, fit and intent decide where a lead goes.'],
  impact: ['Impact', 'Prove time and cost saved with your own numbers.'], plan: ['Pilot plan', 'Phases, exit tests and decisions before launch.'], agency: ['Agency Services', 'Four service lines and influencer partnerships.'],
  search: ['Search', 'Find pages, facts, rules and assets.'], activity: ['Activity log', 'Everything that happened in your workspace.'], workflow: ['Workflow', 'How content moves from plan to publish.'],
}

export default function Pages({ route: raw, user, setUser, signOut }: { route: string; user: User | null; setUser: (u: User) => void; signOut: () => void }) {
  const [route, ...rest] = raw.split('/')
  const arg = decodeURIComponent(rest.join('/'))
  const prog = useProgress()
  const lv = levelOf(prog.xp)
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const say: Say = (m) => { setMsg(m); window.setTimeout(() => setMsg(''), 2200) }
  const [title, sub] = INFO[route] ?? INFO.brand
  const view: Record<string, ReactNode> = {
    brand: <BrandHQ say={say} />, cuttery: <Cuttery />, planning: <Planning say={say} />, studio: <Studio say={say} />,
    review: <Review say={say} />, library: <Library say={say} />, facts: <Facts />, approvals: <Approvals say={say} />,
    campaign: <Campaign />, treasury: <Treasury />, insights: <Insights />,
    users: <Users say={say} />, settings: <Settings say={say} />, profile: user ? <Profile key={user.email} user={user} setUser={setUser} say={say} /> : null,
    pilot: <MissionControl say={say} />, memory: <Memory say={say} />, gate: <Gate say={say} />, inbox: <Inbox say={say} />, viral: <Viral say={say} />, leads: <Leads say={say} />, impact: <Impact say={say} />, plan: <Plan say={say} />, agency: <Agency say={say} />,
    search: <Search key={arg} q={arg} />, activity: <Activity />, workflow: <Workflow />,
  }
  return (
    <div className="bgx">
      <aside className={open ? 'open' : ''}>
        <a className="brand" href="#" aria-label="Back to BrandGuard home"><span className="brand__mark"><Ic n="shield" /></span><span>BrandGuard</span></a>
        <input type="search" aria-label="Search BrandGuard" placeholder="Search" style={{ margin: '0 0 10px', width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', background: 'var(--bg)' }} onKeyDown={(e) => { if (e.key === 'Enter') { setOpen(false); go('search/' + encodeURIComponent(e.currentTarget.value)) } }} />
        <button className="nav" onClick={() => go('')}><Ic n="home" />Brand town</button>
        {MODS.map((m) => <button key={m.id} className={`nav${route === m.id ? ' on' : ''}`} aria-current={route === m.id ? 'page' : undefined} onClick={() => { setOpen(false); go(m.id) }}><Ic n={m.ic} />{m.n}{m.badge && <span className="n">{m.badge}</span>}</button>)}
        <div className="side-h">BrandPilot</div>
        {PILOT.map((m) => <button key={m.id} className={`nav${route === m.id ? ' on' : ''}`} aria-current={route === m.id ? 'page' : undefined} onClick={() => { setOpen(false); go(m.id) }}><Ic n={m.ic} />{m.n}</button>)}
        <div className="side-foot"><div className="xpchip">Level {lv.lvl} · {titleOf(lv.lvl)} · {prog.xp} XP</div>{ACCOUNT.map((m) => <button key={m.id} className={`nav${route === m.id ? ' on' : ''}`} aria-current={route === m.id ? 'page' : undefined} onClick={() => { setOpen(false); go(m.id) }}><Ic n={m.ic} />{m.n}</button>)}{user ? <><div style={{ padding: '8px 10px' }}>{user.name}<br />{user.role}</div><button className="btn sm" style={{ marginLeft: 10 }} onClick={signOut}>Sign out</button></> : <button className="btn p sm" style={{ marginLeft: 10 }} onClick={() => go('signin')}>Sign in</button>}</div>
      </aside>
      <main>
        <Head t={title} p={sub} menu={() => setOpen(!open)} />
        {view[route] ?? view.brand}
      </main>
      {msg && <div role="status" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#171533', color: '#fff', padding: '10px 18px', borderRadius: 12, zIndex: 80 }}>{msg}</div>}
    </div>
  )
}
