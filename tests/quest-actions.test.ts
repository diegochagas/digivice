import { describe, expect, it } from 'vitest'
import { applyQuestAction, questActionSchema } from '@/lib/quests/actions'
import { NOON, stateWith } from './fixtures'

describe('quest actions', () => {
  it('adds, updates, scores, toggles and deletes quests', () => {
    let state = applyQuestAction(stateWith([]), { action: 'quest_add', kind: 'daily', text: ' Workout ', crest: 'courage', difficulty: 'hard', weekdays: [5, 1] }, NOON)
    const quest = state.quests[0]
    expect(quest).toMatchObject({ kind: 'daily', text: 'Workout', crest: 'courage', difficulty: 'hard', weekdays: [1, 5] })
    state = applyQuestAction(state, { action: 'quest_update', id: quest.id, text: 'Gym', crest: null }, NOON)
    expect(state.quests[0]).toMatchObject({ text: 'Gym', crest: null, difficulty: 'hard' })
    state = applyQuestAction(state, { action: 'quest_toggle', id: quest.id }, NOON)
    expect(state.bits).toBeGreaterThan(0)
    state = applyQuestAction(state, { action: 'quest_add', kind: 'habit', text: 'Stretch' }, NOON)
    state = applyQuestAction(state, { action: 'quest_score', id: state.quests[1].id, direction: 'up' }, NOON)
    expect(state.quests[1].scoredUp).toBe(1)
    state = applyQuestAction(state, { action: 'quest_delete', id: quest.id }, NOON)
    expect(state.quests).toHaveLength(1)
  })

  it('manages rewards', () => {
    let state = { ...stateWith([]), bits: 30 }
    state = applyQuestAction(state, { action: 'reward_add', text: 'Episode', cost: 10 }, NOON)
    state = applyQuestAction(state, { action: 'reward_buy', id: state.rewards[0].id }, NOON)
    expect(state.bits).toBe(20)
    expect(applyQuestAction(state, { action: 'reward_delete', id: state.rewards[0].id }, NOON).rewards).toEqual([])
  })

  it('rejects malformed input', () => {
    expect(questActionSchema.safeParse({ action: 'quest_add', kind: 'chore', text: 'x' }).success).toBe(false)
    expect(questActionSchema.safeParse({ action: 'quest_add', kind: 'todo', text: '' }).success).toBe(false)
    expect(questActionSchema.safeParse({ action: 'reward_add', text: 'x', cost: 0 }).success).toBe(false)
    expect(questActionSchema.safeParse({ action: 'quest_add', kind: 'daily', text: 'ok', weekdays: [7] }).success).toBe(false)
  })
})

describe('crest normalisation', () => {
  it('lowercases known crests and rejects unknown ones at the API', () => {
    const ok = questActionSchema.safeParse({ action: 'quest_add', kind: 'todo', text: 'x', crest: 'Courage' })
    expect(ok.success && ok.data.action === 'quest_add' && ok.data.crest).toBe('courage')
    expect(questActionSchema.safeParse({ action: 'quest_add', kind: 'todo', text: 'x', crest: 'pizza' }).success).toBe(false)
    expect(questActionSchema.safeParse({ action: 'quest_add', kind: 'todo', text: 'x', crest: null }).success).toBe(true)
  })
})
