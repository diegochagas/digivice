/** Quest and reward actions accepted by POST /api/state, validated with zod and applied as a pure reducer. */
import { z } from 'zod'
import { normalizeCrest } from '../crests'
import { newId } from '../ids'
import type { CompanionState } from '../types'
import { addReward, buyReward, deleteReward } from './rewards'
import { scoreHabit, toggleQuest } from './scoring'
import { DIFFICULTIES, newQuest, QUEST_KINDS, type Weekday } from './types'

const weekdaySchema = z.number().int().min(0).max(6) as z.ZodType<Weekday>
const crestSchema = z.string().max(30).transform(normalizeCrest).refine(c => c !== null, { message: 'unknown crest: expected a crest name from crests.json' }).nullable().optional()

export const questDraftSchema = z.object({
  kind: z.enum(QUEST_KINDS),
  text: z.string().trim().min(1).max(200),
  crest: crestSchema,
  difficulty: z.enum(DIFFICULTIES).optional(),
  weekdays: z.array(weekdaySchema).max(7).optional(),
})

export const questActionOptions = [
  questDraftSchema.extend({ action: z.literal('quest_add') }),
  z.object({ action: z.literal('quest_update'), id: z.string(), text: z.string().trim().min(1).max(200).optional(), crest: crestSchema, difficulty: z.enum(DIFFICULTIES).optional(), weekdays: z.array(weekdaySchema).max(7).optional() }),
  z.object({ action: z.literal('quest_score'), id: z.string(), direction: z.enum(['up', 'down']) }),
  z.object({ action: z.literal('quest_toggle'), id: z.string() }),
  z.object({ action: z.literal('quest_delete'), id: z.string() }),
  z.object({ action: z.literal('reward_add'), text: z.string().trim().min(1).max(120), cost: z.number().int().min(1).max(100_000) }),
  z.object({ action: z.literal('reward_buy'), id: z.string() }),
  z.object({ action: z.literal('reward_delete'), id: z.string() }),
] as const

export const questActionSchema = z.discriminatedUnion('action', [...questActionOptions])
export type QuestAction = z.infer<typeof questActionSchema>
/** Action names handled by applyQuestAction, so callers can route without re-parsing. */
export const QUEST_ACTION_NAMES = new Set<string>(questActionOptions.map(o => o.shape.action.value))

function updateQuest(state: CompanionState, input: Extract<QuestAction, { action: 'quest_update' }>): CompanionState {
  const quests = state.quests.map(q => {
    if (q.id !== input.id) return q
    const { action: _a, id: _i, ...patch } = input
    void _a; void _i
    const weekdays = patch.weekdays ? [...patch.weekdays].sort() : q.weekdays
    return { ...q, ...patch, crest: patch.crest === undefined ? q.crest : patch.crest, weekdays }
  })
  return { ...state, quests }
}

/** Apply one quest/reward action. Example: applyQuestAction(state, { action: 'quest_toggle', id: 'ab12cd' }). */
export function applyQuestAction(state: CompanionState, input: QuestAction, now = Date.now()): CompanionState {
  switch (input.action) {
    case 'quest_add': {
      const { action: _a, ...draft } = input
      void _a
      return { ...state, quests: [...state.quests, newQuest(draft, newId(), now)] }
    }
    case 'quest_update': return updateQuest(state, input)
    case 'quest_score': return scoreHabit(state, input.id, input.direction, now)
    case 'quest_toggle': return toggleQuest(state, input.id, now)
    case 'quest_delete': return { ...state, quests: state.quests.filter(q => q.id !== input.id) }
    case 'reward_add': return addReward(state, { text: input.text, cost: input.cost }, newId(), now)
    case 'reward_buy': return buyReward(state, input.id)
    case 'reward_delete': return deleteReward(state, input.id)
  }
}
