import { useSyncExternalStore } from 'react'

type S = { xp: number; done: string[]; checks: string[]; paused: boolean }
const KEY = 'brandguard.progress'
const fresh = (): S => ({ xp: 120, done: [], checks: [], paused: false })
function load(): S {
  try { const v = window.localStorage.getItem(KEY); if (v) return { ...fresh(), ...(JSON.parse(v) as Partial<S>) } } catch { /* storage unavailable */ }
  return fresh()
}
let s: S = load()
const subs = new Set<() => void>()
function emit() {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
  subs.forEach((f) => f())
}

/** Adds XP once per id. Returns true when XP was actually granted. */
export function award(n: number, id: string): boolean {
  if (s.done.includes(id)) return false
  s = { ...s, xp: s.xp + n, done: [...s.done, id] }; emit(); return true
}
export function setCheck(id: string, on: boolean) {
  s = { ...s, checks: on ? [...new Set([...s.checks, id])] : s.checks.filter((c) => c !== id) }; emit()
}
export function setPaused(paused: boolean) { s = { ...s, paused }; emit() }
export function resetProgress() { s = fresh(); emit() }
export const useProgress = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => s)

export const LEVEL_SIZE = 200
export const levelOf = (xp: number) => ({ lvl: Math.floor(xp / LEVEL_SIZE) + 1, into: xp % LEVEL_SIZE })
export const titleOf = (lvl: number) => ['Rookie', 'Cadet', 'Navigator', 'Pilot', 'Captain', 'Commander'][Math.min(lvl - 1, 5)]
