/**
 * Stat effects of quests on the partner. Completing a quest raises bond and
 * happiness and pays Bits; negative habits and missed dailies cost happiness
 * (the Habitica HP bar is the partner's mood here).
 */
import { clamp } from '../clamp'
import type { CompanionState } from '../types'
import { dayKey } from './dates'
import type { Difficulty, Quest, QuestKind, StatGain } from './types'

export const QUEST_BOND: Record<QuestKind, Record<Difficulty, number>> = {
  habit: { easy: 2, medium: 4, hard: 6 },
  daily: { easy: 4, medium: 8, hard: 12 },
  todo: { easy: 6, medium: 12, hard: 20 },
}
export const QUEST_HAPPINESS: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 8 }
export const HABIT_PENALTY_HAPPINESS: Record<Difficulty, number> = { easy: -4, medium: -7, hard: -10 }
export const MISSED_DAILY_HAPPINESS: Record<Difficulty, number> = { easy: -5, medium: -9, hard: -14 }

/** Gain for completing `quest`; Bits match the bond earned. */
export function gainFor(quest: Quest): StatGain {
  const bond = QUEST_BOND[quest.kind][quest.difficulty]
  return { bond, happiness: QUEST_HAPPINESS[quest.difficulty], bits: bond }
}

export function applyGain(state: CompanionState, gain: StatGain): CompanionState {
  return {
    ...state,
    bond: Math.max(0, state.bond + gain.bond),
    happiness: clamp(state.happiness + gain.happiness),
    bits: Math.max(0, state.bits + gain.bits),
  }
}

function touchCrest(state: CompanionState, crest: string | null, now: number): CompanionState {
  if (!crest) return state
  const existing = state.crestStreaks[crest] ?? { current: 0, best: 0, lastActiveDay: null }
  return { ...state, crestStreaks: { ...state.crestStreaks, [crest]: { ...existing, lastActiveDay: dayKey(now) } } }
}

function replaceQuest(state: CompanionState, quest: Quest): CompanionState {
  return { ...state, quests: state.quests.map(q => (q.id === quest.id ? quest : q)) }
}

/** Score a habit: `up` rewards, `down` costs happiness only (no Bits are taken). */
export function scoreHabit(state: CompanionState, id: string, direction: 'up' | 'down', now = Date.now()): CompanionState {
  const quest = state.quests.find(q => q.id === id && q.kind === 'habit')
  if (!quest) return state
  if (direction === 'down') {
    const penalty = { bond: 0, happiness: HABIT_PENALTY_HAPPINESS[quest.difficulty], bits: 0 }
    return applyGain(replaceQuest(state, { ...quest, scoredDown: quest.scoredDown + 1 }), penalty)
  }
  const next = applyGain(replaceQuest(state, { ...quest, scoredUp: quest.scoredUp + 1 }), gainFor(quest))
  return touchCrest(next, quest.crest, now)
}

/** Mark a daily done for today or a to-do done. Already-done quests are left alone. */
export function completeQuest(state: CompanionState, id: string, now = Date.now()): CompanionState {
  const quest = state.quests.find(q => q.id === id && q.kind !== 'habit')
  if (!quest) return state
  const today = dayKey(now)
  if (quest.kind === 'daily' && quest.lastDoneDay === today) return state
  if (quest.kind === 'todo' && quest.done) return state
  const updated: Quest = quest.kind === 'daily'
    ? { ...quest, lastDoneDay: today, streak: quest.streak + 1 }
    : { ...quest, done: true, doneAt: now }
  return touchCrest(applyGain(replaceQuest(state, updated), gainFor(quest)), quest.crest, now)
}

/** Undo today's completion: bond and Bits are taken back, the happiness stays (no sulking over a mis-tap). */
export function uncompleteQuest(state: CompanionState, id: string, now = Date.now()): CompanionState {
  const quest = state.quests.find(q => q.id === id && q.kind !== 'habit')
  if (!quest) return state
  const today = dayKey(now)
  if (quest.kind === 'daily' && quest.lastDoneDay !== today) return state
  if (quest.kind === 'todo' && !quest.done) return state
  const updated: Quest = quest.kind === 'daily'
    ? { ...quest, lastDoneDay: null, streak: Math.max(0, quest.streak - 1) }
    : { ...quest, done: false, doneAt: null }
  const gain = gainFor(quest)
  return applyGain(replaceQuest(state, updated), { bond: -gain.bond, happiness: 0, bits: -gain.bits })
}

/** Toggle a daily/to-do for today. */
export function toggleQuest(state: CompanionState, id: string, now = Date.now()): CompanionState {
  const quest = state.quests.find(q => q.id === id)
  if (!quest || quest.kind === 'habit') return state
  const doneNow = quest.kind === 'daily' ? quest.lastDoneDay === dayKey(now) : quest.done
  return doneNow ? uncompleteQuest(state, id, now) : completeQuest(state, id, now)
}
