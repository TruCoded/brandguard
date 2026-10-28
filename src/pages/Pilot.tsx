import { useState, type ReactNode } from 'react'
import { award, setCheck, setPaused, resetProgress, useProgress, levelOf, titleOf, LEVEL_SIZE } from './xp'
import './pages.css'

type K = '' | 'ok' | 'warn' | 'bad'
type Say = (m: string) => void
const to = (id: string) => { window.location.hash = id; window.scrollTo(0, 0) }
const Tag = ({ k = '', children }: { k?: K; children: ReactNode }) => <span className={`tag ${k}`}>{children}</span>
const Card = ({ title, children, cls = '' }: { title?: string; children: ReactNode; cls?: string }) => <div className={`card ${cls}`}>{title && <h3>{title}</h3>}{children}</div>
const Meter = ({ label, v, suffix = '%' }: { label: string; v: number; suffix?: string }) => <div><div className="lbl"><span>{label}</span><b>{v}{suffix}</b></div><div className="bar"><i style={{ width: `${Math.min(100, v)}%` }} /></div></div>
const MODE: Record<string, K> = { Automate: 'ok', Assist: '', Human: 'warn' }
const earn = (say: Say, n: number, id: string, label: string) => { if (award(n, id)) say(`+${n} XP · ${label}`) }

/* ---------- Mission Control ---------- */
const STAGES: [string, string, string, number, string][] = [
  ['Plan', 'Build the calendar from objective, audience, offer status and team capacity.', 'planning', 14, 'Planning Hub'],
  ['Create', 'Draft hooks, scripts and captions from approved brand facts.', 'studio', 9, 'Creator’s Studio'],
  ['Verify', 'The release gate checks every claim, price and offer date.', 'gate', 6, 'Release Gate'],
  ['Approve', 'Authorised people sign off on the exact version.', 'approvals', 5, 'Approvals'],
  ['Publish', 'Schedule through a verified channel connection.', 'cuttery', 3, 'The Cuttery'],
  ['Engage', 'Answer comments and DMs with approved templates. Hand off the rest.', 'inbox', 128, 'Engagement Inbox'],
  ['Measure', 'Compare results with your own baseline.', 'viral', 12, 'Viral Lab'],
  ['Improve', 'Turn findings into the next brief and test.', 'insights', 4, 'Insights'],
]
const MISSIONS: { id: string; t: string; xp: number; to: string }[] = [
  { id: 'gate-clean', t: 'Clear a draft in the Release Gate', xp: 40, to: 'gate' },
  { id: 'memory-edit', t: 'Update a fact in Brand Memory', xp: 25, to: 'memory' },
  { id: 'inbox-test', t: 'Test an engagement rule in the Inbox', xp: 20, to: 'inbox' },
  { id: 'viral-test', t: 'Start a test in Viral Lab', xp: 20, to: 'viral' },
  { id: 'lead-route', t: 'Route a lead in Lead Desk', xp: 20, to: 'leads' },
  { id: 'impact-calc', t: 'Change a number in the Impact calculator', xp: 20, to: 'impact' },
  { id: 'plan-exit', t: 'Pass an exit test in the Pilot plan', xp: 10, to: 'plan' },
]
const BADGES: [string, string, string][] = [['gate-clean', 'Gatekeeper', 'Cleared a draft'], ['memory-edit', 'Librarian', 'Updated a fact'], ['inbox-test', 'Responder', 'Tested a rule'], ['viral-test', 'Analyst', 'Started a test'], ['lead-route', 'Scout', 'Routed a lead'], ['impact-calc', 'Accountant', 'Ran the numbers']]

export function MissionControl({ say }: { say: Say }) {
  const p = useProgress()
  const { lvl, into } = levelOf(p.xp)
  const [stage, setStage] = useState(2)
  const st = STAGES[stage]
  const doneCount = MISSIONS.filter((m) => p.done.includes(m.id)).length
  return <>
    <div className="grid g2">
      <Card>
        <div className="lvl">
          <div className="lvl__badge" aria-hidden="true">{lvl}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>Level {lvl} · {titleOf(lvl)}</h3>
            <span className="muted">{into} / {LEVEL_SIZE} XP to level {lvl + 1} · {p.xp} XP total</span>
            <div className="bar xp" role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={LEVEL_SIZE} aria-label="XP to next level"><i style={{ width: `${(into / LEVEL_SIZE) * 100}%` }} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={() => { resetProgress(); say('Progress reset') }}>Reset progress</button>
        </div>
      </Card>
      <Card title="Global pause">
        <div className="row"><div className="g"><label htmlFor="pause"><b>{p.paused ? 'Publishing and automation are paused' : 'Publishing and automation are running'}</b></label><small>Stops every scheduled post and automatic reply until you resume. New messages go to a person.</small></div>
          <input id="pause" type="checkbox" role="switch" className="sw" checked={p.paused} onChange={(e) => { setPaused(e.target.checked); say(e.target.checked ? 'Everything paused' : 'Resumed') }} /></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}><Tag k="ok">Automate: exact rules</Tag><Tag>Assist: AI drafts, you edit</Tag><Tag k="warn">Human: you decide</Tag></div>
      </Card>
    </div>
    <Card title="The pipeline" cls="mt">
      <div className="pipe" role="tablist" aria-label="Marketing pipeline">
        {STAGES.map((x, i) => <button key={x[0]} role="tab" aria-selected={i === stage} className={`pipe__s${i === stage ? ' on' : ''}`} onClick={() => { setStage(i); earn(say, 5, `stage-${x[0]}`, `Explored ${x[0]}`) }}><b>{x[3]}</b><span>{x[0]}</span></button>)}
      </div>
      <div className="row"><div className="g"><b>{st[0]}</b><small>{st[1]}</small></div><button className="btn p sm" onClick={() => to(st[2])}>Open {st[4]}</button></div>
    </Card>
    <div className="grid g2 mt">
      <Card title={`Today’s missions · ${doneCount}/${MISSIONS.length}`}>
        {MISSIONS.map((m) => { const d = p.done.includes(m.id); return <div className="row" key={m.id}><span className={`tick${d ? ' on' : ''}`} aria-hidden="true">{d ? '✓' : ''}</span><div className="g"><b style={d ? { textDecoration: 'line-through', color: 'var(--mute)' } : undefined}>{m.t}</b><small>+{m.xp} XP</small></div>{d ? <Tag k="ok">Done</Tag> : <button className="btn sm" onClick={() => to(m.to)}>Go</button>}</div> })}
      </Card>
      <Card title="Badges">
        <div className="badges">{BADGES.map(([id, n, d]) => { const on = p.done.includes(id); return <div key={id} className={`badge${on ? ' on' : ''}`}><div className="badge__i" aria-hidden="true">{on ? '★' : '🔒'}</div><b>{n}</b><small>{on ? d : 'Locked'}</small></div> })}</div>
      </Card>
    </div>
  </>
}

/* ---------- Brand Memory ---------- */
type Rec = { id: string; type: string; name: string; value: string; owner: string; ver: number; status: 'Approved' | 'Pending approval'; to?: string }
const DEPENDENTS: Record<string, string[]> = {
  offer: ['Spring teaser reel (scheduled Fri)', 'Price DM template', 'Q4 email hero'],
  product: ['Size guide carousel', 'FAQ reply templates'],
  claim: ['Homepage banner', 'Ad set “Partner webinar”'],
}
const TODAY = '2026-10-29'
export function Memory({ say }: { say: Say }) {
  const [recs, setRecs] = useState<Rec[]>([
    { id: 'brand', type: 'Brand identity', name: 'Tone', value: 'Friendly, direct, no hype', owner: 'Ana', ver: 3, status: 'Approved' },
    { id: 'visual', type: 'Visual system', name: 'Primary colour and type', value: '#6D4AD4 · Manrope + DM Sans', owner: 'Leo', ver: 5, status: 'Approved' },
    { id: 'product', type: 'Product facts', name: 'Cloudline trainer', value: '240 g · sizes 36–47 · 30-day returns', owner: 'Priya', ver: 2, status: 'Approved' },
    { id: 'offer', type: 'Offers', name: 'Autumn offer', value: '15% off · online only · ends 2026-11-30', owner: 'Sam', ver: 1, status: 'Approved', to: '2026-11-30' },
    { id: 'offer-old', type: 'Offers', name: 'Spring sale', value: '30% off · ended 2026-10-15', owner: 'Sam', ver: 4, status: 'Approved', to: '2026-10-15' },
    { id: 'claim', type: 'Claims and proof', name: '4.8 average rating', value: 'Reviews export, Oct 2026 · review by 2027-01-31', owner: 'Maya', ver: 2, status: 'Approved', to: '2027-01-31' },
    { id: 'audience', type: 'Audience rules', name: 'Runners 25–45', value: 'Intent: sizing, price or demo question. No sensitive-trait inference.', owner: 'Ana', ver: 1, status: 'Approved' },
    { id: 'platform', type: 'Platform rules', name: 'Instagram connected', value: 'Publish: yes · DM triggers: keywords only · 2 replies per user per day', owner: 'Sam', ver: 2, status: 'Approved' },
  ])
  const [edit, setEdit] = useState('')
  const [draft, setDraft] = useState('')
  const [recheck, setRecheck] = useState<string[]>([])
  const save = (r: Rec) => {
    if (!draft.trim()) return say('A record can’t be empty')
    setRecs(recs.map((x) => (x.id === r.id ? { ...x, value: draft.trim(), ver: x.ver + 1, status: 'Pending approval' } : x)))
    const deps = DEPENDENTS[r.id.split('-')[0]] ?? [`Content using “${r.name}”`]
    setRecheck([...new Set([...recheck, ...deps])]); setEdit('')
    earn(say, 25, 'memory-edit', 'Fact updated'); say(`Version ${r.ver + 1} saved. ${deps.length} items need a recheck`)
  }
  return <>
    {recheck.length > 0 && <Card title={`${recheck.length} items need a recheck`} cls="warnline">
      <p className="muted" style={{ marginTop: 0 }}>A fact changed, so everything that uses it must be checked again before it goes out.</p>
      {recheck.map((d) => <div className="row" key={d}><div className="g">{d}</div><Tag k="warn">Stale</Tag><button className="btn sm" onClick={() => { setRecheck(recheck.filter((x) => x !== d)); earn(say, 5, `recheck-${d}`, 'Rechecked') ; say('Rechecked against the new version') }}>Recheck</button><button className="btn sm" onClick={() => to('gate')}>Open gate</button></div>)}
    </Card>}
    <Card title="One source of truth" cls={recheck.length ? 'mt scroll' : 'scroll'}>
      <table><thead><tr><th>Record</th><th>Value</th><th>Owner</th><th>Version</th><th>Status</th><th /></tr></thead><tbody>
        {recs.map((r) => { const exp = !!r.to && r.to < TODAY; return <tr key={r.id}>
          <td><b>{r.name}</b><br /><span className="muted">{r.type}</span></td>
          <td style={{ minWidth: 220 }}>{edit === r.id ? <input type="text" aria-label={`Edit ${r.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} /> : r.value}</td>
          <td>{r.owner}</td><td>v{r.ver}</td>
          <td>{exp ? <Tag k="bad">Expired · blocks scheduling</Tag> : <Tag k={r.status === 'Approved' ? 'ok' : 'warn'}>{r.status}</Tag>}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{edit === r.id ? <><button className="btn p sm" onClick={() => save(r)}>Save</button> <button className="btn sm" onClick={() => setEdit('')}>Cancel</button></>
            : <><button className="btn sm" onClick={() => { setEdit(r.id); setDraft(r.value) }}>Edit</button>{r.status === 'Pending approval' && <> <button className="btn p sm" onClick={() => { setRecs(recs.map((x) => (x.id === r.id ? { ...x, status: 'Approved' } : x))); say('Approved by a person') }}>Approve</button></>}</>}</td></tr> })}
      </tbody></table>
      <p className="muted">Checked against 29 Oct 2026. Every record has an owner, a version and an approval status.</p>
    </Card>
  </>
}

/* ---------- Release Gate ---------- */
type F = { rule: string; title: string; sev: 'High' | 'Medium' | 'Low'; quote: string; why: string; source: string; reviewer: string; fix?: { from: string; to: string }; status: 'open' | 'awaiting' }
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function check(text: string, held: string[]): F[] {
  const out: F[] = []
  const add = (f: Omit<F, 'status'>) => out.push({ ...f, status: held.includes(f.rule + f.quote) ? 'awaiting' : 'open' })
  const m1 = text.match(/until\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i)
  if (m1) {
    const d = `2026-${String(MONTHS.indexOf(m1[1].toLowerCase()) + 1).padStart(2, '0')}-${m1[2].padStart(2, '0')}`
    if (d < TODAY) add({ rule: 'OFFER-01', title: 'Expired promotion', sev: 'High', quote: m1[0], why: `This offer ended on ${d}. Scheduling is blocked.`, source: 'Offers · Spring sale v4', reviewer: 'Sam (offer owner)', fix: { from: m1[0], to: 'until Nov 30' } })
  }
  const m2 = text.match(/(\d{1,2})%\s*off/i)
  if (m2 && m2[1] !== '15') add({ rule: 'OFFER-02', title: 'Outdated offer detail', sev: 'Medium', quote: m2[0], why: `The approved current offer is 15% off, not ${m2[1]}%.`, source: 'Offers · Autumn offer v1', reviewer: 'Sam (offer owner)', fix: { from: m2[0], to: '15% off' } })
  const m3 = text.match(/(make[s]? you run faster|guarantee[sd]?[^.!,]*|proven to[^.!,]*)/i)
  if (m3) add({ rule: 'CLAIM-01', title: 'Unsupported performance claim', sev: 'High', quote: m3[0], why: 'No evidence is on file for this claim. Add proof or rewrite it.', source: 'Claims and proof · none found', reviewer: 'Maya (Legal)', fix: { from: m3[0], to: 'are built for everyday comfort' } })
  const m4 = text.match(/#1[^.!,]*|number one[^.!,]*|best [a-z ]*ever/i)
  if (m4) add({ rule: 'CLAIM-02', title: 'Superlative not verified', sev: 'Medium', quote: m4[0], why: 'Marked “not verified”. BrandPilot never invents a source.', source: 'Claims and proof · none found', reviewer: 'Maya (Legal)', fix: { from: m4[0], to: 'a customer favourite' } })
  const m5 = text.match(/customers say[^.!]*|“[^”]+”/i)
  if (m5) add({ rule: 'PROOF-01', title: 'Testimonial needs evidence', sev: 'Medium', quote: m5[0], why: 'Quote the real review with permission, or remove it.', source: 'Claims and proof · no matching review', reviewer: 'Sam (Marketing Director)' })
  const m6 = text.match(/better than [a-z]+|(?:beats|vs\.?)\s+[a-z]+/i)
  if (m6) add({ rule: 'COMP-01', title: 'Comparative claim', sev: 'High', quote: m6[0], why: 'Naming a competitor needs evidence and a legal check.', source: 'Rule Library · T-07', reviewer: 'Maya (Legal)', fix: { from: m6[0], to: 'made for your pace' } })
  const m7 = text.match(/\b(cure[sd]?|medical|diagnos\w+|invest\w*|guaranteed returns)\b/i)
  if (m7) add({ rule: 'REG-01', title: 'Regulated or sensitive wording', sev: 'High', quote: m7[0], why: 'Never auto-approved. A person must decide.', source: 'Rule Library · REG', reviewer: 'Maya (Legal)' })
  if (/%\s*off|offer|sale/i.test(text) && !/terms|conditions|t&c|eligib/i.test(text)) add({ rule: 'OFFER-03', title: 'Missing offer terms', sev: 'Low', quote: '', why: 'Add the eligibility and exclusions so every channel matches.', source: 'Offers · Autumn offer v1', reviewer: 'Sam (offer owner)', fix: { from: '', to: ' Online only. Terms apply.' } })
  return out
}
const SAMPLE = 'Spring Sale: 30% off all sneakers until Oct 15! Our shoes make you run faster and are the #1 choice. Customers say they are the best shoes ever. Better than Nike.'
export function Gate({ say }: { say: Say }) {
  const [text, setText] = useState(SAMPLE)
  const [found, setFound] = useState<F[] | null>(null)
  const [stale, setStale] = useState(false)
  const [held, setHeld] = useState<string[]>([])
  const [fixed, setFixed] = useState(0)
  const [sent, setSent] = useState(false)
  const run = (t = text, h = held) => { setFound(check(t, h)); setStale(false); setSent(false) }
  const apply = (f: F) => {
    const t = f.fix!.from ? text.replace(f.fix!.from, f.fix!.to) : text + f.fix!.to
    setText(t); setFixed(fixed + 1); run(t); earn(say, 5, `gatefix-${f.rule}`, 'Finding fixed')
  }
  const hold = (f: F) => { const h = [...held, f.rule + f.quote]; setHeld(h); run(text, h); say(`Sent to ${f.reviewer}`) }
  const open = found?.filter((f) => f.status === 'open').length ?? 0
  const waiting = found?.filter((f) => f.status === 'awaiting').length ?? 0
  const canSend = found !== null && !stale && open === 0
  const sev = (s: F['sev']): K => (s === 'High' ? 'bad' : s === 'Medium' ? 'warn' : '')
  return (
    <div className="grid g2">
      <Card title="Draft caption">
        <label htmlFor="draft" className="muted">Paste a draft. Checks run against the approved facts, offers and rules.</label>
        <textarea id="draft" style={{ marginTop: 6, minHeight: 150 }} value={text} onChange={(e) => { setText(e.target.value); if (found) setStale(true) }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn p" onClick={() => { run(); say('Checks complete') }}>Run checks</button>
          <button className="btn" onClick={() => { setText(SAMPLE); setFound(null); setFixed(0); setHeld([]); setSent(false); setStale(false) }}>Reset sample</button>
          {fixed > 0 && <Tag k="ok">{fixed} fixed</Tag>}
        </div>
        {stale && <p role="status" className="muted" style={{ color: 'var(--warn)' }}>The text changed. Run the checks again before sending.</p>}
        <div className="row" style={{ marginTop: 10 }}>
          <div className="g"><b>{sent ? 'Sent to approval' : canSend ? 'Ready for approval' : found ? `${open} open ${open === 1 ? 'finding' : 'findings'} block release` : 'Run the checks to unlock release'}</b><small>{waiting ? `${waiting} waiting on a reviewer. They stay attached to this version.` : 'Approved wording only. A person still signs off.'}</small></div>
          <button className="btn p" disabled={!canSend || sent} onClick={() => { setSent(true); if (!waiting) earn(say, 40, 'gate-clean', 'Clean draft sent'); say('Sent to Approvals') }}>Send to approval</button>
        </div>
      </Card>
      <Card title={found ? `Findings (${found.length})` : 'Findings'}>
        {!found && <p className="muted">Nothing checked yet. Run the checks to see each finding, its rule and its source.</p>}
        {found && found.length === 0 && <p><Tag k="ok">Clean</Tag> No findings on this version.</p>}
        {found?.map((f) => <div key={f.rule + f.quote} className="finding">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><b>{f.title}</b><Tag k={sev(f.sev)}>{f.sev}</Tag><Tag>{f.rule}</Tag>{f.status === 'awaiting' && <Tag k="warn">Waiting on reviewer</Tag>}</div>
          {f.quote && <p className="quote">“{f.quote}”</p>}
          <p className="muted" style={{ margin: '4px 0' }}>{f.why}<br />Source: {f.source} · Reviewer: {f.reviewer}</p>
          {f.status === 'open' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {f.fix && <button className="btn p sm" onClick={() => apply(f)}>Apply fix</button>}
            <button className="btn sm" onClick={() => hold(f)}>Send to reviewer</button></div>}
        </div>)}
      </Card>
    </div>
  )
}

/* ---------- Engagement Inbox ---------- */
type Rule = { key: string; label: string; action: string; v: number; on: boolean }
type Log = { id: number; time: string; user: string; msg: string; intent: string; action: string; k: K }
const REPLY_LIMIT = 2
export function Inbox({ say }: { say: Say }) {
  const p = useProgress()
  const [rules, setRules] = useState<Rule[]>([
    { key: 'checklist', label: 'Comment keyword CHECKLIST', action: 'DM the approved checklist link', v: 3, on: true },
    { key: 'price', label: 'Price question', action: 'Reply with the current approved offer and terms', v: 2, on: true },
    { key: 'demo', label: 'Demo or fitting request', action: 'Ask one qualifying question, share the booking link', v: 1, on: true },
    { key: 'complaint', label: 'Complaint or refund', action: 'Acknowledge and route to support', v: 2, on: true },
  ])
  const [testMode, setTestMode] = useState(true)
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState('@jordan.runs')
  const [log, setLog] = useState<Log[]>([])
  const on = (k: string) => rules.find((r) => r.key === k)?.on
  const send = () => {
    const m = msg.trim(); if (!m) return say('Type a message first')
    const lower = m.toLowerCase()
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const replies = log.filter((l) => l.user === user && l.k === 'ok').length
    let intent = 'Unclear'; let action = 'Escalated to a person (low confidence)'; let k: K = 'warn'
    const delivery = testMode ? 'Test mode: not sent' : 'Queued, waiting for the platform to confirm delivery'
    if (log.some((l) => l.user === user && l.msg === m && Date.now() - l.id < 60000)) { intent = 'Duplicate'; action = 'Ignored duplicate event'; k = '' }
    else if (/\b(stop|unsubscribe|opt.?out)\b/.test(lower)) { intent = 'Opt-out'; action = 'Recorded opt-out. No reply sent'; k = 'ok' }
    else if (/\b(lawyer|legal|sue|injur\w+|allerg\w+)\b/.test(lower)) { intent = 'Legal or sensitive'; action = 'Automation paused for this thread. Responsible person notified'; k = 'bad' }
    else if (p.paused) { intent = 'Paused'; action = 'Global pause is on. Queued for a person'; k = 'warn' }
    else if (/refund|complain|broken|late|wrong/.test(lower)) { intent = 'Complaint or refund'; action = on('complaint') ? 'Acknowledged and routed to support. No policy invented' : 'Rule off. Escalated to a person'; k = 'warn' }
    else if (replies >= REPLY_LIMIT) { intent = 'Rate limited'; action = `Limit of ${REPLY_LIMIT} automatic replies per user per day reached`; k = 'warn' }
    else if (/checklist/.test(lower) && on('checklist')) { intent = 'Keyword CHECKLIST'; action = `Approved checklist link by DM. ${delivery}`; k = 'ok' }
    else if (/price|cost|how much|discount/.test(lower) && on('price')) { intent = 'Price question'; action = `“15% off until Nov 30, online only. Terms apply.” ${delivery}`; k = 'ok' }
    else if (/demo|fitting|book|appointment/.test(lower) && on('demo')) { intent = 'Demo request'; action = `Asked: “Which shoe size are you after?” and shared the booking link. ${delivery}`; k = 'ok' }
    setLog([{ id: Date.now(), time, user, msg: m, intent, action, k }, ...log]); setMsg('')
    earn(say, 20, 'inbox-test', 'Rule tested')
  }
  return <>
    {p.paused && <div className="card warnline" role="status"><b>Global pause is on.</b> No automatic replies will go out. <button className="btn sm" onClick={() => setPaused(false)}>Resume</button></div>}
    <div className="grid g2" style={p.paused ? { marginTop: 16 } : undefined}>
      <Card title="Reply rules">
        {rules.map((r, i) => <div className="row" key={r.key}><div className="g"><label htmlFor={`r-${r.key}`}><b>{r.label}</b></label><small>{r.action} · template v{r.v}</small></div>
          <input id={`r-${r.key}`} type="checkbox" role="switch" className="sw" checked={r.on} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} /></div>)}
        <div className="row"><div className="g"><label htmlFor="tm"><b>Test mode</b></label><small>Simulate replies without sending. Turn it off only after testing.</small></div><input id="tm" type="checkbox" role="switch" className="sw" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} /></div>
        <p className="muted" style={{ marginBottom: 0 }}>Always on: opt-out handling, {REPLY_LIMIT} replies per user per day, duplicate protection.</p>
      </Card>
      <Card title="Try an incoming message">
        <div className="field"><label htmlFor="u">From</label><input id="u" type="text" value={user} onChange={(e) => setUser(e.target.value)} /></div>
        <div className="field"><label htmlFor="m">Message</label><input id="m" type="text" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a comment or DM" /></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{['CHECKLIST', 'How much is the Cloudline?', 'Can I book a fitting?', 'My order is late, I want a refund', 'I will sue you', 'STOP'].map((s) => <button key={s} className="btn sm" onClick={() => setMsg(s)}>{s}</button>)}</div>
        <button className="btn p" onClick={send}>Send message</button>
      </Card>
    </div>
    <Card title="Activity" cls="mt scroll">
      {log.length === 0 ? <p className="muted">No messages yet. Send one to see how it is classified and handled.</p> :
        <table><thead><tr><th>Time</th><th>From</th><th>Message</th><th>Classified as</th><th>What happened</th></tr></thead><tbody>
          {log.map((l) => <tr key={l.id}><td>{l.time}</td><td>{l.user}</td><td>{l.msg}</td><td><Tag k={l.k}>{l.intent}</Tag></td><td>{l.action}</td></tr>)}</tbody></table>}
    </Card>
  </>
}

/* ---------- Viral Lab ---------- */
type Post = { t: string; fmt: string; hook: string; watch: number; shares: number; saves: number; days: number }
const POSTS: Post[] = [
  { t: 'Day in my life', fmt: 'Reel', hook: 'Story', watch: 58, shares: 210, saves: 380, days: 7 },
  { t: 'Sneaker care in 20s', fmt: 'Reel', hook: 'Question', watch: 71, shares: 340, saves: 610, days: 7 },
  { t: 'Factory tour', fmt: 'Reel', hook: 'Story', watch: 52, shares: 120, saves: 190, days: 6 },
  { t: 'Why feet swell', fmt: 'Reel', hook: 'Question', watch: 69, shares: 300, saves: 540, days: 5 },
  { t: 'Spring teaser', fmt: 'Reel', hook: 'Stat', watch: 44, shares: 90, saves: 110, days: 4 },
  { t: 'Lacing hacks', fmt: 'Reel', hook: 'Question', watch: 74, shares: 410, saves: 700, days: 6 },
  { t: 'Founder note', fmt: 'Reel', hook: 'Story', watch: 49, shares: 100, saves: 150, days: 5 },
  { t: 'Autumn drop', fmt: 'Reel', hook: 'Stat', watch: 47, shares: 85, saves: 120, days: 1 },
  { t: 'Size guide', fmt: 'Carousel', hook: 'Stat', watch: 0, shares: 60, saves: 420, days: 7 },
  { t: 'Care checklist', fmt: 'Carousel', hook: 'Question', watch: 0, shares: 75, saves: 510, days: 7 },
]
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
export function Viral({ say }: { say: Say }) {
  const [metric, setMetric] = useState<'watch' | 'shares' | 'saves'>('saves')
  const [test, setTest] = useState('')
  const label = { watch: 'Watch time %', shares: 'Shares', saves: 'Saves' }
  const result = (p: Post): [string, K, string] => {
    const peers = POSTS.filter((x) => x.fmt === p.fmt && x.days >= 3)
    if (p.days < 3) return ['Inconclusive', '', 'Fewer than 3 days of data']
    if (peers.length < 5) return ['Inconclusive', '', `Only ${peers.length} comparable posts`]
    const base = median(peers.map((x) => x[metric])); const v = p[metric]
    if (v > base * 1.2) return ['Above baseline', 'ok', `${v} vs median ${base}`]
    if (v < base * 0.8) return ['Below baseline', 'bad', `${v} vs median ${base}. Possible factors only, no proof of cause`]
    return ['Near baseline', 'warn', `${v} vs median ${base}`]
  }
  const rows = POSTS.filter((p) => metric !== 'watch' || p.fmt === 'Reel')
  const reels = POSTS.filter((p) => p.fmt === 'Reel' && p.days >= 3)
  const hooks = ['Question', 'Story', 'Stat'].map((h) => { const g = reels.filter((p) => p.hook === h); return { h, n: g.length, above: g.filter((p) => result(p)[0] === 'Above baseline').length } })
  const pattern = hooks.find((x) => x.n >= 3 && x.above === x.n)
  return <>
    <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <label htmlFor="mt"><b>Compare on</b></label>
      <select id="mt" style={{ maxWidth: 200 }} value={metric} onChange={(e) => setMetric(e.target.value as 'watch' | 'shares' | 'saves')}>{(Object.keys(label) as (keyof typeof label)[]).map((k) => <option key={k} value={k}>{label[k]}</option>)}</select>
      <span className="muted">Each post is compared with your own median for the same format. Nothing is predicted.</span>
    </div>
    <div className="grid g2 mt">
      <Card title="Posts" cls="scroll">
        <table><thead><tr><th>Post</th><th>Hook</th><th>{label[metric]}</th><th>Result</th></tr></thead><tbody>
          {rows.map((p) => { const [r, k, why] = result(p); return <tr key={p.t}><td><b>{p.t}</b><br /><span className="muted">{p.fmt} · {p.days} days</span></td><td>{p.hook}</td><td>{p[metric]}</td><td><Tag k={k}>{r}</Tag><br /><span className="muted">{why}</span></td></tr> })}</tbody></table>
      </Card>
      <div className="grid" style={{ alignContent: 'start' }}>
        <Card title="Potential pattern">
          {pattern ? <><Tag k="ok">{pattern.h} hooks</Tag><p>{pattern.above} of {pattern.n} comparable Reels with a {pattern.h.toLowerCase()} hook are above baseline on {label[metric].toLowerCase()}. Sample size is small, so treat this as a pattern to test, not a rule.</p></> : <p className="muted">No hook is above baseline across at least 3 comparable posts for this metric.</p>}
        </Card>
        <Card title="Next test">
          <p style={{ marginTop: 0 }}>Test a question opening against your usual story opening. Keep the topic, length and call to action the same.</p>
          {test ? <><Tag k="ok">Running</Tag> <span className="muted">{test}</span><div style={{ marginTop: 10 }}><button className="btn sm" onClick={() => { setTest(''); say('Test closed') }}>Close test</button></div></>
            : <button className="btn p" onClick={() => { setTest('Question vs story opening · started today'); earn(say, 20, 'viral-test', 'Test started') }}>Start this test</button>}
          <p className="muted" style={{ marginBottom: 0 }}>One test at a time, so you can tell what changed.</p>
        </Card>
      </div>
    </div>
  </>
}

/* ---------- Lead Desk ---------- */
const LEADS = ['Hi, what’s the price of the Cloudline in size 43? Can I order today?', 'Do you do custom orthotic fitting for trail shoes?', 'Where is my last order? Tracking says delivered but nothing came.', 'Can you help me get a business loan?', 'Interested in your trainers']
function qualify(t: string) {
  const l = t.toLowerCase()
  const existing = /my (last )?order|refund|return|broken|tracking|delivered/.test(l)
  const unsupported = /loan|crypto|insurance|laptop/.test(l)
  const need = /shoe|sneaker|trainer|cloudline|size|run|trail|foot|orthotic/.test(l)
  const fit = need && !unsupported
  const intent = /price|cost|how much|demo|book|fitting|available|order|buy|quote/.test(l)
  let route = 'Ask one clarifying question'; let next = 'Which problem are you trying to solve: sizing, running comfort or something else?'; let k: K = 'warn'
  if (existing) { route = 'Support'; next = 'Existing customer problem. Send to support with the order context.'; k = '' }
  else if (unsupported) { route = 'Not a fit'; next = 'Politely say we don’t offer this. No invented alternatives.'; k = 'bad' }
  else if (need && fit && intent) { route = 'Sales owner'; next = 'Send to a sales owner. Share only the approved price and availability.'; k = 'ok' }
  else if (need && fit) { route = 'Nurture'; next = 'Share the approved size guide and ask what they need next.'; k = '' }
  return { existing, unsupported, need, fit, intent, route, next, k }
}
export function Leads({ say }: { say: Say }) {
  const [text, setText] = useState(LEADS[0])
  const [routed, setRouted] = useState<{ t: string; r: string }[]>([])
  const q = qualify(text)
  const chip = (ok: boolean, l: string) => <Tag k={ok ? 'ok' : 'bad'}>{ok ? '✓' : '✗'} {l}</Tag>
  return (
    <div className="grid g2">
      <Card title="Incoming enquiry">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>{LEADS.map((l, i) => <button key={l} className={`btn sm${text === l ? ' p' : ''}`} onClick={() => setText(l)}>Lead {i + 1}</button>)}</div>
        <label htmlFor="lead" className="muted">Edit the message to see how the answer changes.</label>
        <textarea id="lead" style={{ marginTop: 6 }} value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ marginTop: 10 }}>{chip(q.need, 'Need')}{chip(q.fit, 'Fit')}{chip(q.intent, 'Intent')}</div>
      </Card>
      <Card title="What to do next">
        <Tag k={q.k}>{q.route}</Tag>
        <p>{q.next}</p>
        <button className="btn p" disabled={!text.trim()} onClick={() => { setRouted([{ t: text, r: q.route }, ...routed]); earn(say, 20, 'lead-route', 'Lead routed'); say(`Routed to ${q.route}`) }}>Route lead</button>
        {routed.length > 0 && <div style={{ marginTop: 14 }}><h3 style={{ fontSize: 14 }}>Routed ({routed.length})</h3>{routed.map((r, i) => <div className="row" key={i}><div className="g">{r.t.slice(0, 70)}{r.t.length > 70 ? '…' : ''}</div><Tag>{r.r}</Tag></div>)}</div>}
      </Card>
    </div>
  )
}

/* ---------- Impact ---------- */
const ROLES: [string, string, string, string][] = [
  ['Copywriter', 'Hooks, scripts, captions and CTAs', 'Assist', 'Original angle and final quality call'],
  ['Social media manager', 'Calendar, briefs, reminders and status', 'Automate', 'Priorities and strategy'],
  ['Brand manager', 'Template variations, asset checks, logo and colour checks', 'Automate', 'Art direction and subjective calls'],
  ['Community manager', 'FAQ replies, comment sorting, keyword DMs', 'Automate', 'Sensitive conversations and conflict'],
  ['Marketing analyst', 'Baselines, summaries, anomaly alerts', 'Assist', 'Business context and big decisions'],
  ['Legal reviewer', 'Flags unsupported claims and expired offers', 'Human', 'Interpretation, approval and accountability'],
  ['Sales qualification', 'Intent detection and lead routing', 'Assist', 'Negotiation and complex objections'],
]
export function Impact({ say }: { say: Say }) {
  const [tasks, setTasks] = useState([
    { n: 'Captions and hooks', c: 60, b: 25, a: 8 }, { n: 'Calendar and briefs', c: 20, b: 90, a: 30 },
    { n: 'Brand and fact checks', c: 80, b: 15, a: 4 }, { n: 'Comment and DM replies', c: 300, b: 3, a: 0.5 }, { n: 'Weekly reports', c: 4, b: 120, a: 35 },
  ])
  const [rate, setRate] = useState(28)
  const [sub, setSub] = useState(900)
  const [over, setOver] = useState(12)
  const [ok, setOk] = useState(1186)
  const [tried, setTried] = useState(1240)
  const num = (v: string) => Math.max(0, Number(v) || 0)
  const touch = () => earn(say, 20, 'impact-calc', 'Ran the numbers')
  const hours = tasks.reduce((s, t) => s + (t.c * (t.b - t.a)) / 60, 0)
  const net = hours * rate - sub - over * rate
  const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
  const edit = (i: number, k: 'c' | 'b' | 'a', v: string) => { setTasks(tasks.map((t, j) => (j === i ? { ...t, [k]: num(v) } : t))); touch() }
  const field = (id: string, l: string, v: number, set: (n: number) => void) => <div className="field"><label htmlFor={id}>{l}</label><input id={id} type="number" min={0} value={v} onChange={(e) => { set(num(e.target.value)); touch() }} /></div>
  return <>
    <div className="grid g3">
      <div className="card kpi"><b>{Math.round(hours)} h</b><span>Saved per month</span></div>
      <div className="card kpi"><b style={{ color: net < 0 ? 'var(--bad)' : undefined }}>{money(net)}</b><span>Net saving per month after tool and oversight cost</span></div>
      <div className="card kpi"><b>{tried ? Math.round((ok / tried) * 1000) / 10 : 0}%</b><span>Automation reliability</span></div>
    </div>
    <Card title="Time saved per task type" cls="mt scroll">
      <table><thead><tr><th>Task</th><th>Tasks a month</th><th>Baseline min</th><th>With BrandPilot min</th><th>Hours saved</th></tr></thead><tbody>
        {tasks.map((t, i) => <tr key={t.n}><td>{t.n}</td>{(['c', 'b', 'a'] as const).map((k) => <td key={k}><input type="number" min={0} aria-label={`${t.n} ${k}`} style={{ width: 90 }} value={t[k]} onChange={(e) => edit(i, k, e.target.value)} /></td>)}<td><b>{Math.round((t.c * (t.b - t.a)) / 60)}</b></td></tr>)}</tbody></table>
      <p className="muted" style={{ marginBottom: 0 }}>Use the median minutes for the same task before and after. Savings differ by team, so confirm them in a pilot.</p>
    </Card>
    <div className="grid g2 mt">
      <Card title="Cost comparison">
        <div className="grid g3">{field('rate', 'Hourly labour cost ($)', rate, setRate)}{field('sub', 'Subscription per month ($)', sub, setSub)}{field('over', 'Review and oversight hours', over, setOver)}</div>
        <p className="muted" style={{ marginBottom: 0 }}>Net saving = hours saved × labour cost − subscription − oversight time.</p>
      </Card>
      <Card title="Quality and reliability">
        <Meter label="Approval turnaround (before 26 h, now 9 h)" v={35} />
        <Meter label="Preventable correction rate (before 12%, now 4%)" v={4} />
        <div className="grid g2" style={{ marginTop: 10 }}>{field('ok', 'Successful eligible actions', ok, setOk)}{field('tried', 'Attempted eligible actions', tried, setTried)}</div>
      </Card>
    </div>
    <Card title="Roles BrandPilot supports" cls="mt scroll">
      <table><thead><tr><th>Role</th><th>What the platform handles</th><th>Mode</th><th>What stays with a person</th></tr></thead><tbody>
        {ROLES.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td><Tag k={MODE[r[2]]}>{r[2]}</Tag></td><td>{r[3]}</td></tr>)}</tbody></table>
      <p className="muted" style={{ marginBottom: 0 }}>The aim is less repetitive work and fewer disconnected tools, not removing people.</p>
    </Card>
  </>
}

/* ---------- Pilot plan ---------- */
const PHASES: [string, string, string][] = [
  ['Scope', 'First customer segment, problem and pilot goal', 'A specific buyer and measurable pain are agreed'],
  ['Requirements', 'User stories, workflow and acceptance tests', 'Every core feature has a test'],
  ['Brand and fact base', 'Versioned facts, offers, assets and rules', 'Expired and outdated records are caught'],
  ['Governance MVP', 'Draft intake, findings, revisions, approvals', 'A user can trace each warning to evidence'],
  ['Content planning', 'Calendar, briefs, content packages', 'Drafts use approved facts and stay editable'],
  ['One-channel integration', 'One verified publishing or engagement flow', 'End-to-end test passes with no duplicate actions'],
  ['Automation and handoff', 'Keyword rules, limits, pause switch, human queue', 'Unknown and sensitive cases escalate'],
  ['Analytics', 'Baselines, experiment reports, outcome metrics', 'Results reconcile with source data'],
  ['Security and pilot', 'Isolation, retention, monitoring, customer testing', 'Security tests pass and savings are measured'],
]
const DONE = ['Client data is isolated', 'Uncertainty is labelled', 'Failed actions are visible', 'Automation can be stopped', 'Time saved is measured against a documented baseline']
const DECIDE = ['Choose the first buyer: agencies or in-house teams', 'Pick one social channel and verify its API permissions', 'Define the first five fact and brand checks', 'Decide which actions need a human and who approves', 'Set confidentiality, retention and AI-provider rules', 'Run a pilot and calculate real time saved']
export function Plan({ say }: { say: Say }) {
  const p = useProgress()
  const sets: [string, string[], string][] = [['Phases', PHASES.map((x) => x[0]), 'ph'], ['Ready for a pilot when', DONE, 'dod'], ['Decide before coding', DECIDE, 'dec']]
  const total = PHASES.length + DONE.length + DECIDE.length
  const have = p.checks.filter((c) => /^(ph|dod|dec)-/.test(c)).length
  const toggle = (id: string, on: boolean) => { setCheck(id, on); if (on) earn(say, 10, 'plan-exit', 'Exit test passed') }
  return <>
    <Card><div className="lbl" style={{ marginTop: 0 }}><b>Pilot readiness</b><b>{have} of {total}</b></div><div className="bar xp"><i style={{ width: `${(have / total) * 100}%` }} /></div></Card>
    <div className="grid g2 mt">
      <Card title="Phases and exit tests">
        {PHASES.map((x, i) => { const id = `ph-${i}`; const on = p.checks.includes(id); return <div className="row" key={id}><input id={id} type="checkbox" className="cb" checked={on} onChange={(e) => toggle(id, e.target.checked)} /><label htmlFor={id} className="g"><b>{i}. {x[0]}</b><small>{x[1]}</small><small>Exit test: {x[2]}</small></label></div> })}
      </Card>
      <div className="grid" style={{ alignContent: 'start' }}>
        {sets.slice(1).map(([title, items, pre]) => <Card key={pre} title={title}>{items.map((x, i) => { const id = `${pre}-${i}`; return <div className="row" key={id}><input id={id} type="checkbox" className="cb" checked={p.checks.includes(id)} onChange={(e) => toggle(id, e.target.checked)} /><label htmlFor={id} className="g">{x}</label></div> })}</Card>)}
      </div>
    </div>
  </>
}

/* ---------- Agency services ---------- */
const LINES: [string, string, string, string][] = [
  ['Digital and performance', 'Paid ads, SEO and conversion rate work', 'campaign', 'Campaign Plaza'],
  ['Brand strategy and design', 'Identity, messaging and positioning', 'library', 'Rule Library'],
  ['Content and social', 'Content, community and influencers', 'studio', 'Creator’s Studio'],
  ['E-commerce and lead generation', 'Full-funnel acquisition and lifetime value', 'leads', 'Lead Desk'],
]
export function Agency({ say }: { say: Say }) {
  const [caps, setCaps] = useState([
    { who: '@runwithpriya', job: '1 reel + 2 stories', fee: '$800', cap: 'Loving my new Cloudline trainers! Link in bio.' },
    { who: '@trailtara', job: '1 carousel', fee: '$450', cap: '#ad Trail-tested all month. Sizes 36–47, 30-day returns.' },
  ])
  const [checked, setChecked] = useState<string[]>([])
  const has = (c: string) => /#ad|#sponsored|paid partnership/i.test(c)
  return <>
    <div className="grid g4">{LINES.map((l) => <button key={l[0]} className="card tile" onClick={() => to(l[2])}><h3>{l[0]}</h3><span className="muted">{l[1]}</span><br /><Tag>Open {l[3]}</Tag></button>)}</div>
    <Card title="Influencer partnerships" cls="mt">
      <p className="muted" style={{ marginTop: 0 }}>Sponsored posts need a clear disclosure before they can be approved and paid.</p>
      {caps.map((c, i) => { const done = checked.includes(c.who); return <div className="row" key={c.who} style={{ alignItems: 'flex-start' }}>
        <div className="g"><b>{c.who}</b> <span className="muted">{c.job} · {c.fee}</span>
          <textarea aria-label={`Caption for ${c.who}`} style={{ minHeight: 56, marginTop: 6 }} value={c.cap} onChange={(e) => { setCaps(caps.map((x, j) => (j === i ? { ...x, cap: e.target.value } : x))); setChecked(checked.filter((w) => w !== c.who)) }} /></div>
        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
          {done ? (has(c.cap) ? <Tag k="ok">Disclosure found · ready to approve</Tag> : <Tag k="bad">Disclosure missing</Tag>) : <Tag>Not checked</Tag>}
          <div style={{ display: 'flex', gap: 6 }}>
            {done && !has(c.cap) && <button className="btn sm" onClick={() => { setCaps(caps.map((x, j) => (j === i ? { ...x, cap: `#ad ${x.cap}` } : x))); say('Added #ad to the start') }}>Add #ad</button>}
            <button className="btn p sm" onClick={() => { setChecked([...new Set([...checked, c.who])]); earn(say, 15, 'agency-check', 'Disclosure checked') }}>Check disclosure</button>
            {done && has(c.cap) && <button className="btn sm" onClick={() => to('treasury')}>Go to payouts</button>}</div></div></div> })}
    </Card>
  </>
}
