import { newState } from '@/lib/state'
import { newQuest, type QuestDraft } from '@/lib/quests/types'
import type { CompanionState } from '@/lib/types'

/** Local noon on 2026-10-24 (a Saturday), so day keys never straddle midnight in any timezone. */
export const NOON = new Date(2026, 9, 24, 12).getTime()
export const DAY = 86_400_000

export function stateWith(drafts: QuestDraft[], now = NOON): CompanionState {
  const base = newState('courage', 'en', now)
  const quests = drafts.map((d, i) => newQuest(d, `q${i}`, now - DAY))
  return { ...base, quests, lastRolloverDay: '2026-10-24' }
}
