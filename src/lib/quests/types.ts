/**
 * Habitica-style task layer ("quests") living next to the Tamagotchi state.
 * Habits are scored up/down any time, dailies are due on given weekdays,
 * to-dos are done once. Every quest trains a crest (life area) or none.
 */

export const QUEST_KINDS = ['habit', 'daily', 'todo'] as const
export type QuestKind = typeof QUEST_KINDS[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = typeof DIFFICULTIES[number]

/** Day of week as Date#getDay returns it: 0 = Sunday ... 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Local calendar day, `YYYY-MM-DD`. */
export type DayKey = string

export interface Quest {
  id: string
  kind: QuestKind
  text: string
  /** Crest this quest trains (courage, knowledge, ...) or null when untagged. */
  crest: string | null
  difficulty: Difficulty
  createdAt: number
  /** Habits: lifetime counters shown next to the +/- buttons. */
  scoredUp: number
  scoredDown: number
  /** Dailies: weekdays it is due; empty means every day. */
  weekdays: Weekday[]
  /** Dailies: the last day it was completed (done today ⇔ equals today's key). */
  lastDoneDay: DayKey | null
  /** Dailies: consecutive due days completed; reset by the day rollover when missed. */
  streak: number
  /** To-dos only. */
  done: boolean
  doneAt: number | null
}

export interface Reward {
  id: string
  text: string
  /** Price in Bits (the currency earned by completing quests). */
  cost: number
  createdAt: number
  bought: number
}

export interface CrestStreak {
  /** Consecutive kept days (see rollover.ts for the keeping rule). */
  current: number
  best: number
  /** Last day a quest of this crest was completed or scored up. */
  lastActiveDay: DayKey | null
}

export interface MissedDaily {
  id: string
  text: string
  crest: string | null
}

/** What the last day rollover did, shown to the tamer once. */
export interface RolloverReport {
  /** Last day that was closed. */
  day: DayKey
  missed: MissedDaily[]
  happinessLost: number
  crestsKept: string[]
  crestsBroken: string[]
}

export interface StatGain {
  bond: number
  happiness: number
  bits: number
}

export interface QuestDraft {
  kind: QuestKind
  text: string
  crest?: string | null
  difficulty?: Difficulty
  weekdays?: Weekday[]
}

/** Build a quest with the per-kind defaults filled in. Example: newQuest({kind:'todo', text:'Pay rent'}, 'ab12cd', Date.now()). */
export function newQuest(draft: QuestDraft, id: string, now: number): Quest {
  return {
    id,
    kind: draft.kind,
    text: draft.text.trim(),
    crest: draft.crest ?? null,
    difficulty: draft.difficulty ?? 'medium',
    createdAt: now,
    scoredUp: 0,
    scoredDown: 0,
    weekdays: draft.kind === 'daily' ? [...(draft.weekdays ?? [])].sort() : [],
    lastDoneDay: null,
    streak: 0,
    done: false,
    doneAt: null,
  }
}
