export type User = { name: string; email: string; role: string }
const KEY = 'brandguard.user'
export function getUser(): User | null {
  try { const v = window.localStorage.getItem(KEY); return v ? (JSON.parse(v) as User) : null } catch { return null }
}
export function saveUser(u: User | null) {
  try { if (u) window.localStorage.setItem(KEY, JSON.stringify(u)); else window.localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
}
