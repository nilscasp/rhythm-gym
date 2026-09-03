import { existsSync, statSync } from 'node:fs'
import { dayPaths, readJson, writeJson } from './config'
import type { DayState } from './types'

export function loadState(day: number): DayState {
  const p = dayPaths(day).state
  if (existsSync(p)) return readJson<DayState>(p)
  return { day, steps: {} }
}

export function saveState(state: DayState): void {
  writeJson(dayPaths(state.day).state, state)
}

export function isDone(state: DayState, step: string, fingerprint: string): boolean {
  const r = state.steps[step]
  return Boolean(r && r.done && r.fingerprint === fingerprint)
}

export function markDone(state: DayState, step: string, fingerprint: string): void {
  state.steps[step] = { done: true, at: new Date().toISOString(), fingerprint }
  saveState(state)
}

export function invalidateFrom(state: DayState, step: string): void {
  const order = ['extract', 'separate', 'asr', 'transcribe', 'script', 'tts', 'fit', 'mix', 'mux', 'qa']
  const i = order.indexOf(step)
  if (i < 0) return
  for (const s of order.slice(i)) delete state.steps[s]
  saveState(state)
}

export function fileFingerprint(path: string): string {
  if (!existsSync(path)) return 'missing'
  const st = statSync(path)
  return `${st.size}:${Math.floor(st.mtimeMs)}`
}
