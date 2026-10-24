/**
 * Day rollover: when a new local day starts, every day since the last rollover
 * is closed. Missed dailies cost happiness and reset their streak; crest
 * streaks advance or break (see `closeCrestDay`). A long absence only charges
 * the last MAX_CHARGED_DAYS days, like coming back from the Digital World.
 */
import { clamp } from '../clamp'
import type { CompanionState } from '../types'
import { dayKey, daysBetween, daysBetweenExclusive, isDoneOn, isDueOn } from './dates'
import { MISSED_DAILY_HAPPINESS } from './scoring'
import type { CrestStreak, DayKey, MissedDaily, Quest, RolloverReport } from './types'

export const MAX_CHARGED_DAYS = 7
const EMPTY_STREAK: CrestStreak = { current: 0, best: 0, lastActiveDay: null }

export function missedDailiesOn(quests: Quest[], day: DayKey): Quest[] {
  return quests.filter(q => isDueOn(q, day) && !isDoneOn(q, day))
}

function crestsInPlay(state: CompanionState): string[] {
  const crests = new Set<string>(Object.keys(state.crestStreaks))
  for (const q of state.quests) if (q.crest) crests.add(q.crest)
  if (state.crest) crests.add(state.crest)
  return Array.from(crests)
}

/**
 * Keeping rule for one crest on one closed day:
 * - a missed due daily of that crest breaks the streak;
 * - otherwise a day with any completed/scored-up quest of that crest extends it;
 * - a day with nothing due and nothing done is neutral (rest days don't break it).
 */
export function closeCrestDay(streak: CrestStreak, crest: string, day: DayKey, missed: MissedDaily[]): { streak: CrestStreak; verdict: 'kept' | 'broken' | 'neutral' } {
  if (missed.some(m => m.crest === crest)) return { streak: { ...streak, current: 0 }, verdict: 'broken' }
  if (streak.lastActiveDay !== day) return { streak, verdict: 'neutral' }
  const current = streak.current + 1
  return { streak: { ...streak, current, best: Math.max(streak.best, current) }, verdict: 'kept' }
}

function closeDay(state: CompanionState, day: DayKey, report: RolloverReport): CompanionState {
  const missedQuests = missedDailiesOn(state.quests, day)
  const missed: MissedDaily[] = missedQuests.map(q => ({ id: q.id, text: q.text, crest: q.crest }))
  const lost = missedQuests.reduce((sum, q) => sum - MISSED_DAILY_HAPPINESS[q.difficulty], 0)
  const quests = state.quests.map(q => (missedQuests.includes(q) ? { ...q, streak: 0 } : q))
  const crestStreaks = { ...state.crestStreaks }
  report.crestsKept = []
  report.crestsBroken = []
  for (const crest of crestsInPlay(state)) {
    const closed = closeCrestDay(crestStreaks[crest] ?? EMPTY_STREAK, crest, day, missed)
    crestStreaks[crest] = closed.streak
    if (closed.verdict === 'kept') report.crestsKept.push(crest)
    if (closed.verdict === 'broken') report.crestsBroken.push(crest)
  }
  report.day = day
  report.missed.push(...missed)
  report.happinessLost += lost
  return { ...state, quests, crestStreaks, happiness: clamp(state.happiness - lost) }
}

function breakAllCrestStreaks(state: CompanionState): CompanionState {
  const crestStreaks = Object.fromEntries(Object.entries(state.crestStreaks).map(([c, s]) => [c, { ...s, current: 0 }]))
  return { ...state, crestStreaks, quests: state.quests.map(q => (q.kind === 'daily' ? { ...q, streak: 0 } : q)) }
}

/** Close every day that ended since the last rollover. Returns the same object when nothing changed. */
export function rolloverDays(state: CompanionState, now = Date.now()): CompanionState {
  const today = dayKey(now)
  if (state.lastRolloverDay === null) return { ...state, lastRolloverDay: today }
  // Same day, or a clock/timezone change that moved today backwards: nothing has ended yet.
  if (daysBetween(state.lastRolloverDay, today) <= 0) return state
  const days = [state.lastRolloverDay, ...daysBetweenExclusive(state.lastRolloverDay, today)]
  const charged = days.slice(-MAX_CHARGED_DAYS)
  let next = days.length > MAX_CHARGED_DAYS ? breakAllCrestStreaks(state) : state
  const report: RolloverReport = { day: today, missed: [], happinessLost: 0, crestsKept: [], crestsBroken: [] }
  for (const day of charged) next = closeDay(next, day, report)
  return { ...next, lastRolloverDay: today, lastRollover: report }
}
