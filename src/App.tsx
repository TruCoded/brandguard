import { useEffect, useMemo, useState } from 'react'
import { getUser } from './auth'

type IconName =
  | 'shield'
  | 'sparkle'
  | 'search'
  | 'arrow'
  | 'play'
  | 'file'
  | 'warning'
  | 'check'
  | 'snow'
  | 'minus'
  | 'plus'
  | 'menu'
  | 'expand'
  | 'rotate'
  | 'film'
  | 'book'
  | 'database'
  | 'clock'
  | 'chart'
  | 'megaphone'
  | 'coins'
  | 'user'
  | 'x'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const paths: Record<IconName, React.ReactNode> = {
    shield: <><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
    sparkle: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    play: <path d="m9 7 8 5-8 5V7Z" />,
    file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    warning: <><path d="m12 3 9 17H3l9-17Z" /><path d="M12 9v4M12 17h.01" /></>,
    check: <><path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
    snow: <><path d="M12 2v20M4 7l16 10M4 17 20 7" /><path d="m9 4 3 3 3-3M9 20l3-3 3 3" /></>,
    minus: <path d="M5 12h14" />,
    plus: <><path d="M5 12h14M12 5v14" /></>,
    menu: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r=".8" fill="currentColor" /><circle cx="4" cy="12" r=".8" fill="currentColor" /><circle cx="4" cy="18" r=".8" fill="currentColor" /></>,
    expand: <><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></>,
    rotate: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
    film: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4" /></>,
    book: <><path d="M4 5c4-1 6 .5 8 2v14c-2-1.5-4-3-8-2V5ZM20 5c-4-1-6 .5-8 2v14c2-1.5 4-3 8-2V5Z" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    megaphone: <><path d="m4 11 14-6v14L4 13v-2Z" /><path d="m7 14 2 6h4l-2-5" /></>,
    coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v4c0 1.7 2.7 3 6 3 1.1 0 2-.1 2.9-.4M3 11v4c0 1.7 2.7 3 6 3" /><ellipse cx="16" cy="15" rx="5" ry="2.5" /><path d="M11 15v3.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V15" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return <svg {...common}>{paths[name]}</svg>
}

type Stop = {
  id: string
  name: string
  short: string
  note: string
  icon: IconName
  color: string
  x: number
  y: number
  size: 'small' | 'medium' | 'large'
  motion: string
  person: string
  stat: string
}

const stops: Stop[] = [
  { id: 'studio', name: "Creator's Studio", short: 'Scripts & Production', note: 'Turn approved ideas into ready-to-publish scripts and production briefs.', icon: 'film', color: '#8257e8', x: 20, y: 78, size: 'small', motion: 'sway', person: 'directing', stat: '8 drafts ready' },
  { id: 'planning', name: 'Planning Hub', short: 'Shorts & Reels Planner', note: 'Plan campaigns, assign owners, and keep every channel moving together.', icon: 'clock', color: '#ef9a67', x: 24, y: 49, size: 'medium', motion: 'pulse', person: 'planning', stat: '14 tasks today' },
  { id: 'review', name: 'Content Review', short: 'Claims & compliance', note: 'Review every asset against approved brand, legal, and factual guidance.', icon: 'user', color: '#7655da', x: 27, y: 32, size: 'small', motion: 'nod', person: 'reviewing', stat: '18 issues flagged' },
  { id: 'cuttery', name: 'The Cuttery', short: 'TikTok Cuts & Edits', note: 'Create quick social cuts while keeping every frame and caption on-brand.', icon: 'film', color: '#39354b', x: 40, y: 14, size: 'small', motion: 'bounce', person: 'editing', stat: '6 cuts rendering' },
  { id: 'brand', name: 'Brand HQ', short: '124 reviewed · 18 flagged', note: 'Your central command for brand health, governance, and team progress.', icon: 'shield', color: '#7052dd', x: 52, y: 21, size: 'large', motion: 'float', person: 'waving', stat: '92% compliance' },
  { id: 'library', name: 'Rule Library', short: '12 rules active', note: 'Keep voice, visual, and legal rules accessible to every contributor.', icon: 'book', color: '#886ce8', x: 75, y: 31, size: 'medium', motion: 'tilt', person: 'reading', stat: '12 rules active' },
  { id: 'facts', name: 'Fact Library', short: '45 facts verified', note: 'Maintain one trusted source for claims, statistics, and approved language.', icon: 'database', color: '#47bfae', x: 86, y: 50, size: 'large', motion: 'bounce', person: 'checking', stat: '45 facts verified' },
  { id: 'approvals', name: 'Approvals', short: '5 pending', note: 'Move work through review with clear ownership and no lost feedback.', icon: 'check', color: '#a775e6', x: 70, y: 70, size: 'medium', motion: 'nod', person: 'celebrating', stat: '5 pending' },
  { id: 'campaign', name: 'Campaign Plaza', short: 'SEO & Performance', note: 'Track campaign health, optimize performance, and amplify what works.', icon: 'megaphone', color: '#6754d9', x: 51, y: 76, size: 'medium', motion: 'sway', person: 'speaking', stat: '+24% reach' },
  { id: 'insights', name: 'Insights', short: 'Compliance +94%', note: 'Follow live performance and see where your brand system is getting stronger.', icon: 'chart', color: '#5caab1', x: 35, y: 71, size: 'small', motion: 'tilt', person: 'presenting', stat: '+94% compliance' },
  { id: 'treasury', name: 'The Treasury', short: 'Finance Lead & Operations', note: 'See budgets, resources, and operational impact in one clear view.', icon: 'coins', color: '#eeb143', x: 89, y: 79, size: 'small', motion: 'pulse', person: 'counting', stat: '$18k saved' },
]

const homes = [
  { x: 8, y: 52, color: '#a981e8' },
  { x: 17, y: 25, color: '#f19b82' },
  { x: 28, y: 82, color: '#ee9d69' },
  { x: 39, y: 56, color: '#8b74df' },
  { x: 52, y: 12, color: '#f4ae72' },
  { x: 63, y: 64, color: '#7dc6b8' },
  { x: 70, y: 15, color: '#9175df' },
  { x: 79, y: 78, color: '#ea937e' },
  { x: 89, y: 32, color: '#67baa8' },
  { x: 93, y: 64, color: '#e2a95e' },
]

function Building({ stop, active }: { stop: Stop; active: boolean }) {
  const floors = stop.size === 'large' ? 4 : stop.size === 'medium' ? 3 : 2
  return (
    <div
      className={`building building--${stop.size} building--${stop.motion}${active ? ' is-active' : ''}`}
      style={{ '--accent': stop.color } as React.CSSProperties}
    >
      <div className="building__flag" />
      <div className="person" aria-hidden="true">
        <span className="person__head" />
        <span className="person__body" />
        <span className="person__arm person__arm--left" />
        <span className="person__arm person__arm--right" />
      </div>
      <div className="building__roof">
        <span><Icon name={stop.icon} size={17} /></span>
      </div>
      <div className="building__body">
        {Array.from({ length: floors * 2 }).map((_, index) => <i key={index} />)}
      </div>
      <div className="building__steps" />
    </div>
  )
}

function App() {
  const [activeId, setActiveId] = useState('brand')
  const [frozen, setFrozen] = useState(false)
  const [rotating, setRotating] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const activeStop = useMemo(() => stops.find((stop) => stop.id === activeId) ?? stops[0], [activeId])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const selectStop = (stop: Stop) => {
    setActiveId(stop.id)
    setNotice(`${stop.name} selected`)
  }

  return (
    <main className={`app${frozen ? ' is-frozen' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="BrandGuard home">
          <span className="brand__mark"><Icon name="shield" size={20} /></span>
          <span>BrandGuard</span>
        </a>
        <button className="nav-toggle" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle navigation">
          <Icon name={mobileNav ? 'x' : 'menu'} />
        </button>
        <nav className={mobileNav ? 'is-open' : ''} aria-label="Primary navigation">
          {['Overview', 'Content Review', 'Rule Library', 'Fact Library', 'Approvals', 'Insights'].map((item, index) => (
            <button className={index === 0 ? 'active' : ''} key={item} onClick={() => { const id = ({ 'Content Review': 'review', 'Rule Library': 'library', 'Fact Library': 'facts', Approvals: 'approvals', Insights: 'insights' } as Record<string, string>)[item]; if (id) window.location.hash = id; else window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{item}</button>
          ))}
        </nav>
        <div className="account">
          <button className="avatar" aria-label="Open profile" onClick={() => { window.location.hash = getUser() ? 'profile' : 'signin' }}><span>AG</span></button>
          <button className="sign-in" onClick={() => { window.location.hash = getUser() ? 'profile' : 'signin' }}>Sign In</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero__wash" />
        <div className="copy">
          <div className="eyebrow"><Icon name="sparkle" size={15} /> AI-powered brand governance</div>
          <h1>Every piece of content.<br /><span>On-brand by design.</span></h1>
          <p>AI-powered brand governance for consistent, compliant and credible communication. Review content, catch unsupported claims, and apply approved fixes — automatically.</p>
          <div className="searchbox">
            <Icon name="search" size={18} />
            <input aria-label="Explore your brand workspace" placeholder="Explore your brand workspace" onKeyDown={(event) => {
              if (event.key === 'Enter') window.location.hash = `search/${encodeURIComponent(event.currentTarget.value)}`
            }} />
            <button onClick={() => { window.location.hash = getUser() ? 'brand' : 'signin' }}>Enter BrandGuard <Icon name="arrow" size={16} /></button>
          </div>
          <button className="workflow" onClick={() => { window.location.hash = 'workflow' }}><span><Icon name="play" size={13} /></span> View workflow</button>
          <div className="metrics">
            <div><Icon name="file" /><strong>124</strong><small>pieces reviewed</small></div>
            <div><Icon name="warning" /><strong>18</strong><small>issues flagged</small></div>
            <div><Icon name="check" /><strong>92%</strong><small>compliance</small></div>
          </div>
        </div>

        <div className="map-area">
          <div className="map-toolbar">
            <button className={frozen ? 'active' : ''} onClick={() => setFrozen((value) => !value)}><Icon name="snow" size={15} /> {frozen ? 'Resume view' : 'Freeze view'}</button>
            <div className="zoom-control">
              <button onClick={() => setZoom((value) => Math.max(.84, +(value - .08).toFixed(2)))} aria-label="Zoom out"><Icon name="minus" size={14} /></button>
              <span>Zoom {Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(1.16, +(value + .08).toFixed(2)))} aria-label="Zoom in"><Icon name="plus" size={14} /></button>
            </div>
            <button onClick={() => { window.location.hash = 'activity' }}><Icon name="menu" size={15} /> Activity log</button>
          </div>

          <div className="side-tools">
            <button onClick={() => setZoom(1)} aria-label="Reset zoom"><Icon name="expand" /></button>
            <button className={rotating ? 'active' : ''} onClick={() => setRotating((value) => !value)} aria-label="Toggle rotation"><Icon name="rotate" /></button>
          </div>

          <div className="scene-frame">
            <div className={`scene${rotating ? ' is-rotating' : ''}`} style={{ '--zoom': zoom } as React.CSSProperties}>
              <div className="cloud cloud--one" />
              <div className="cloud cloud--two" />
              <div className="island-shadow" />
              <div className="island">
                <div className="island__grass" />
                <svg className="roads" viewBox="0 0 840 490" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M45 270 C135 180 195 185 275 210 S395 225 430 145 S555 80 650 125 S740 205 805 180" />
                  <path d="M90 390 C190 330 265 370 335 305 S445 235 510 280 S635 365 795 360" />
                  <path d="M195 78 C240 145 270 215 245 320 S230 405 280 455" />
                  <path d="M515 35 C505 105 530 170 610 210 S735 270 770 420" />
                  <path d="M405 130 C415 205 430 285 420 435" />
                </svg>
                <div className="lake"><span className="boat" /></div>
                <div className="path path--one" />
                <div className="path path--two" />
                <div className="village" aria-hidden="true">
                  {homes.map((home, index) => (
                    <span
                      className="mini-home"
                      key={index}
                      style={{
                        '--home-x': `${home.x}%`,
                        '--home-y': `${home.y}%`,
                        '--home-color': home.color,
                        '--home-delay': `${index * -.23}s`,
                      } as React.CSSProperties}
                    >
                      <i />
                      <b />
                    </span>
                  ))}
                </div>
                <div className="trees">
                  {Array.from({ length: 34 }).map((_, index) => (
                    <i
                      key={index}
                      style={{
                        '--i': index,
                        '--x': `${5 + (index * 23) % 90}%`,
                        '--y': `${5 + (index * 37) % 82}%`,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
              {stops.map((stop) => (
                <button
                  className={`stop stop--${stop.id}${activeId === stop.id ? ' is-active' : ''}`}
                  style={{ left: `${stop.x}%`, top: `${stop.y}%`, '--accent': stop.color } as React.CSSProperties}
                  key={stop.id}
                  onClick={() => selectStop(stop)}
                  aria-label={`Visit ${stop.name}`}
                >
                  <Building stop={stop} active={activeId === stop.id} />
                  <span className="stop__label">
                    <span className="stop__icon"><Icon name={stop.icon} size={16} /></span>
                    <span><strong>{stop.name}</strong><small>{stop.short}</small></span>
                  </span>
                </button>
              ))}
              <div className="issue-pill"><span>!</span> 3 issues detected</div>
            </div>
          </div>

          <aside className="stop-detail" style={{ '--accent': activeStop.color, cursor: 'pointer' } as React.CSSProperties} onClick={() => { window.location.hash = activeStop.id }} title={`Open ${activeStop.name}`}>
            <button className="stop-detail__close" onClick={(e) => { e.stopPropagation(); setNotice('Detail minimized') }} aria-label="Close detail"><Icon name="x" size={15} /></button>
            <div className="stop-detail__icon"><Icon name={activeStop.icon} size={20} /></div>
            <div>
              <small>Now visiting</small>
              <strong>{activeStop.name}</strong>
              <p>{activeStop.note}</p>
              <span>{activeStop.stat}</span>
              <button style={{ display: 'block', marginTop: 8, border: 0, background: 'none', padding: 0, fontWeight: 700, color: activeStop.color, textDecoration: 'underline' }} onClick={() => { window.location.hash = activeStop.id }}>Open page</button>
            </div>
          </aside>
          <div className="rotation-status"><i className={rotating ? 'active' : ''} /> {rotating ? 'World rotates clockwise' : 'World rotation paused'}</div>
        </div>
      </section>
      <div className={`toast${notice ? ' show' : ''}`} role="status"><Icon name="check" size={16} /> {notice}</div>
    </main>
  )
}

export default App
