import { useState, type FormEvent } from 'react'
import type { User } from '../auth'
import './pages.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const nameFrom = (email: string) => { const n = email.split('@')[0].replace(/[._-]+/g, ' '); return n.charAt(0).toUpperCase() + n.slice(1) }

export function SignIn({ next, onDone }: { next: string; onDone: (u: User) => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (mode === 'up' && !name.trim()) er.name = 'Enter your full name.'
    if (!EMAIL.test(email)) er.email = 'Enter a valid work email, like ana@company.com.'
    if (pw.length < 6) er.pw = 'Use at least 6 characters.'
    setErrs(er)
    if (Object.keys(er).length) return
    onDone({ name: mode === 'up' ? name.trim() : nameFrom(email), email: email.trim(), role: mode === 'up' ? 'Brand Manager' : 'Admin' })
  }
  return (
    <div className="bgx auth">
      <div className="auth__side">
        <a className="brand" href="#" aria-label="Back to BrandGuard home"><span className="brand__mark" /><span>BrandGuard</span></a>
        <h1>Every piece of content, on-brand by design.</h1>
        <p>Review scripts, cuts, ads and keywords against your rules and facts before anything goes live.</p>
      </div>
      <form className="auth__form card" onSubmit={submit} noValidate>
        <h2>{mode === 'in' ? 'Sign in to BrandGuard' : 'Create your account'}</h2>
        <p className="muted">{next && next !== 'signin' ? 'Sign in to open this page.' : 'Use any valid email and a password of 6+ characters for this demo.'}</p>
        {mode === 'up' && <Field id="name" label="Full name" value={name} set={setName} err={errs.name} auto="name" />}
        <Field id="email" label="Work email" value={email} set={setEmail} err={errs.email} type="email" auto="email" />
        <Field id="pw" label="Password" value={pw} set={setPw} err={errs.pw} type={show ? 'text' : 'password'} auto={mode === 'in' ? 'current-password' : 'new-password'} />
        <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
        <button className="btn p" style={{ width: '100%', marginTop: 8 }} type="submit">{mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <p className="muted" style={{ textAlign: 'center' }}>
          {mode === 'in' ? 'New to BrandGuard?' : 'Already have an account?'}{' '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErrs({}) }}>{mode === 'in' ? 'Create an account' : 'Sign in'}</button>
        </p>
      </form>
    </div>
  )
}

function Field({ id, label, value, set, err, type = 'text', auto }: { id: string; label: string; value: string; set: (v: string) => void; err?: string; type?: string; auto?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} autoComplete={auto} onChange={(e) => set(e.target.value)} aria-invalid={!!err} aria-describedby={err ? `${id}-e` : undefined} />
      {err && <small id={`${id}-e`} role="alert" className="err">{err}</small>}
    </div>
  )
}

type Say = (m: string) => void
const ROLES = ['Admin', 'Brand Manager', 'Legal', 'Marketing Director', 'Creator', 'Finance Lead']

export function Profile({ user, setUser, say }: { user: User; setUser: (u: User) => void; say: Say }) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [err, setErr] = useState('')
  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const savePw = (e: FormEvent) => {
    e.preventDefault()
    if (!cur) return setErr('Enter your current password.')
    if (nw.length < 6) return setErr('New password needs at least 6 characters.')
    setErr(''); setCur(''); setNw(''); say('Password updated')
  }
  return (
    <div className="grid g2">
      <div className="card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <div className="av">{initials}</div><div><h3 style={{ margin: 0 }}>{user.name}</h3><span className="muted">{user.email}</span></div>
        </div>
        <Field id="pn" label="Full name" value={name} set={setName} />
        <div className="field"><label htmlFor="pr">Role</label><select id="pr" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <button className="btn p" onClick={() => { if (!name.trim()) return say('Name can’t be empty'); setUser({ ...user, name: name.trim(), role }); say('Profile saved') }}>Save profile</button>
      </div>
      <form className="card" onSubmit={savePw} noValidate>
        <h3>Change password</h3>
        <Field id="cp" label="Current password" value={cur} set={setCur} type="password" auto="current-password" />
        <Field id="np" label="New password" value={nw} set={setNw} type="password" auto="new-password" err={err} />
        <button className="btn p" type="submit">Update password</button>
      </form>
    </div>
  )
}

type Member = { name: string; email: string; role: string; active: boolean }
export function Users({ say }: { say: Say }) {
  const [m, setM] = useState<Member[]>([
    { name: 'Maya Chen', email: 'maya@brand.co', role: 'Legal', active: true },
    { name: 'Sam Ortiz', email: 'sam@brand.co', role: 'Marketing Director', active: true },
    { name: 'Priya Nair', email: 'priya@brand.co', role: 'Creator', active: true },
    { name: 'Leo Banks', email: 'leo@brand.co', role: 'Creator', active: false },
  ])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Creator')
  const [err, setErr] = useState('')
  const invite = (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL.test(email)) return setErr('Enter a valid email address.')
    if (m.some((x) => x.email === email)) return setErr('This person is already on the team.')
    setM([...m, { name: nameFrom(email), email, role, active: false }]); setEmail(''); setErr(''); say('Invite sent')
  }
  return <>
    <form className="card" onSubmit={invite} noValidate>
      <h3>Invite a teammate</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 220px' }}><Field id="ie" label="Email" value={email} set={setEmail} type="email" err={err} /></div>
        <div className="field" style={{ flex: '1 1 160px' }}><label htmlFor="ir">Role</label><select id="ir" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        <button className="btn p" type="submit" style={{ marginTop: 22 }}>Send invite</button>
      </div>
    </form>
    <div className="card mt scroll"><h3>Team ({m.length})</h3>
      <table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
        {m.map((x, i) => <tr key={x.email}><td><b>{x.name}</b><br /><span className="muted">{x.email}</span></td>
          <td><select aria-label={`Role for ${x.name}`} value={x.role} onChange={(e) => { setM(m.map((y, j) => (j === i ? { ...y, role: e.target.value } : y))); say('Role updated') }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
          <td><span className={`tag ${x.active ? 'ok' : 'warn'}`}>{x.active ? 'Active' : 'Invited'}</span></td>
          <td><button className="btn sm" onClick={() => { setM(m.filter((_, j) => j !== i)); say(`${x.name} removed`) }}>Remove</button></td></tr>)}
      </tbody></table>
    </div>
  </>
}

export function Settings({ say }: { say: Say }) {
  const [ws, setWs] = useState('Acme Footwear')
  const [strict, setStrict] = useState('Standard')
  const [t, setT] = useState({ flags: true, approvals: true, facts: true, digest: false })
  type TK = 'flags' | 'approvals' | 'facts' | 'digest'
  const items: [TK, string, string][] = [['flags', 'New flagged issues', 'Alert me when a review finds a problem'], ['approvals', 'Approval requests', 'Alert me when something needs my sign-off'], ['facts', 'Fact changes', 'Alert me when a fact changes and affects approved content'], ['digest', 'Weekly digest', 'Email a weekly brand health summary']]
  return (
    <div className="grid g2">
      <div className="card"><h3>Workspace</h3>
        <Field id="ws" label="Workspace name" value={ws} set={setWs} />
        <div className="field"><label htmlFor="st">Scan strictness</label><select id="st" value={strict} onChange={(e) => setStrict(e.target.value)}>{['Relaxed', 'Standard', 'Strict'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <button className="btn p" onClick={() => say('Settings saved')}>Save settings</button>
      </div>
      <div className="card"><h3>Notifications</h3>
        {items.map(([k, l, d]) => <div className="row" key={k}><div className="g"><label htmlFor={`sw-${k}`}><b>{l}</b></label><small>{d}</small></div>
          <input id={`sw-${k}`} type="checkbox" role="switch" className="sw" checked={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.checked })} /></div>)}
      </div>
    </div>
  )
}
