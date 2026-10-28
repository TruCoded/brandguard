import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Pages from './pages/Pages'
import { SignIn } from './pages/Account'
import { getUser, saveUser, type User } from './auth'
import './index.css'

function Root() {
  const [route, setRoute] = useState(window.location.hash.slice(1))
  const [user, setUserState] = useState<User | null>(getUser())
  useEffect(() => {
    const on = () => setRoute(window.location.hash.slice(1))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const setUser = (u: User | null) => { saveUser(u); setUserState(u) }
  if (!route || route === 'home') return <App />
  const base = route.split('/')[0]
  const needsUser = ['users', 'settings', 'profile'].includes(base)
  if (base === 'signin' || (needsUser && !user)) {
    return <SignIn next={base === 'signin' ? 'signin' : route} onDone={(u) => { setUser(u); window.location.hash = base === 'signin' ? 'brand' : route }} />
  }
  return <Pages route={route} user={user} setUser={setUser} signOut={() => { setUser(null); window.location.hash = '' }} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
