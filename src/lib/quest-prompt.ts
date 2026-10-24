/** The quest section of the system prompt: what is due, what was done, how the crest is doing. */
import { dayKey, isDoneOn, isDueOn } from './quests/dates'
import { crestStreakOf, crestStreakRequired } from './quests/streaks'
import type { Quest } from './quests/types'
import { nextEvolutionAt } from './state'
import type { CompanionState } from './types'

function questLine(q: Quest, today: string): string {
  const crest = q.crest ? `, crest: ${q.crest}` : ''
  if (q.kind === 'habit') return `- [${q.id}] habit: ${q.text}${crest}`
  if (q.kind === 'daily') return `- [${q.id}] daily: ${q.text}${crest}, ${isDoneOn(q, today) ? 'DONE today' : 'still due today'}, streak ${q.streak}`
  return `- [${q.id}] to-do: ${q.text}${crest}`
}

function crestLine(state: CompanionState): string {
  const streak = crestStreakOf(state, state.crest)
  if (nextEvolutionAt(state) === null) return `Crest of ${state.crest} streak: ${streak} days.`
  const required = crestStreakRequired(state.stage + 1)
  const gate = streak >= required ? 'enough for your next evolution' : `your next evolution needs ${required} days`
  return `Crest of ${state.crest} streak: ${streak} days (${gate}). Bits saved: ${state.bits}.`
}

/** Example: describeQuests(state, new Date()) → "YOUR TAMER'S QUESTS ...". */
export function describeQuests(state: CompanionState, now: Date): string {
  const today = dayKey(now)
  const listed = state.quests.filter(q => q.kind === 'habit' || (q.kind === 'daily' && isDueOn(q, today)) || (q.kind === 'todo' && !q.done))
  const header = `YOUR TAMER'S QUESTS (you help track them; completing them strengthens your bond, missed dailies hurt your mood):`
  const body = listed.length ? listed.map(q => questLine(q, today)).join('\n') : '- none yet; suggest one daily that fits your crest if it comes up naturally'
  const rollover = state.lastRollover?.missed.length
    ? `Yesterday the tamer missed: ${state.lastRollover.missed.map(m => m.text).join(', ')}.`
    : ''
  return [header, body, crestLine(state), rollover].filter(Boolean).join('\n')
}
