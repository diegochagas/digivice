import { describe, expect, it } from 'vitest'
import { completeQuest, QUEST_BOND, QUEST_HAPPINESS, scoreHabit, toggleQuest, uncompleteQuest } from '@/lib/quests/scoring'
import { NOON, stateWith } from '../fixtures'

describe('scoring', () => {
  it('completing a daily pays bond, happiness and Bits once and marks the crest active today', () => {
    const state = stateWith([{ kind: 'daily', text: 'Workout', crest: 'courage', difficulty: 'hard' }])
    const once = completeQuest(state, 'q0', NOON)
    expect(once.bond).toBe(QUEST_BOND.daily.hard)
    expect(once.bits).toBe(QUEST_BOND.daily.hard)
    expect(once.happiness).toBe(state.happiness + QUEST_HAPPINESS.hard)
    expect(once.quests[0]).toMatchObject({ lastDoneDay: '2026-10-24', streak: 1 })
    expect(once.crestStreaks.courage.lastActiveDay).toBe('2026-10-24')
    expect(completeQuest(once, 'q0', NOON)).toBe(once)
  })

  it('undoing a completion takes back bond and Bits but not happiness', () => {
    const state = stateWith([{ kind: 'todo', text: 'Pay rent', difficulty: 'easy' }])
    const done = completeQuest(state, 'q0', NOON)
    const undone = uncompleteQuest(done, 'q0', NOON)
    expect(undone.bond).toBe(0)
    expect(undone.bits).toBe(0)
    expect(undone.happiness).toBe(done.happiness)
    expect(undone.quests[0].done).toBe(false)
    expect(toggleQuest(undone, 'q0', NOON).quests[0].done).toBe(true)
  })

  it('habits score up for gains and down for a happiness penalty only', () => {
    const state = stateWith([{ kind: 'habit', text: 'Water', crest: 'knowledge', difficulty: 'medium' }])
    const up = scoreHabit(state, 'q0', 'up', NOON)
    expect(up.bond).toBe(QUEST_BOND.habit.medium)
    expect(up.quests[0].scoredUp).toBe(1)
    const down = scoreHabit(up, 'q0', 'down', NOON)
    expect(down.bits).toBe(up.bits)
    expect(down.happiness).toBeLessThan(up.happiness)
    expect(down.quests[0].scoredDown).toBe(1)
  })

  it('ignores unknown ids and kind mismatches', () => {
    const state = stateWith([{ kind: 'habit', text: 'Water' }])
    expect(completeQuest(state, 'q0', NOON)).toBe(state)
    expect(scoreHabit(state, 'nope', 'up', NOON)).toBe(state)
  })
})
