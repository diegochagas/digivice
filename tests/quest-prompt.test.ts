import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/prompt'
import { describeQuests } from '@/lib/quest-prompt'
import { completeQuest } from '@/lib/quests/scoring'
import { NOON, stateWith } from './fixtures'

describe('quest prompt section', () => {
  it('lists due dailies with their status, habits and open to-dos, and the crest gate', () => {
    const state = stateWith([
      { kind: 'daily', text: 'Workout', crest: 'courage' },
      { kind: 'daily', text: 'Sunday walk', weekdays: [0] },
      { kind: 'habit', text: 'Drink water' },
      { kind: 'todo', text: 'Pay rent', crest: 'reliability' },
    ])
    const child = { ...completeQuest(state, 'q3', NOON), stage: 1 }
    const text = describeQuests(child, new Date(NOON))
    expect(text).toContain('[q0] daily: Workout, crest: courage, still due today, streak 0')
    expect(text).not.toContain('Sunday walk')
    expect(text).toContain('[q2] habit: Drink water')
    expect(text).not.toContain('Pay rent')
    expect(text).toMatch(/Crest of courage streak: 0 days \(your next evolution needs 3 days\)/)
  })

  it('the system prompt advertises the quest tools and the crest vocabulary', () => {
    const prompt = buildSystemPrompt(stateWith([]), { lore: '', searchEnabled: false, idle: false, now: new Date(NOON) })
    expect(prompt).toContain('"name": "quest_add"')
    expect(prompt).toContain('"name": "quest_done"')
    expect(prompt).toContain('reliability = money/chores/work')
    expect(prompt).not.toContain('todo_add')
  })
})
