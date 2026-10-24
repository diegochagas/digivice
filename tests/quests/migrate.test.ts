import { describe, expect, it } from 'vitest'
import { migrateState } from '@/lib/quests/migrate'
import { newState } from '@/lib/state'
import { NOON } from '../fixtures'

describe('migrateState', () => {
  it('turns v1 todos into to-do quests and adds the v2 fields', () => {
    const v1 = {
      version: 1, crest: 'courage', stage: 1, lang: 'en', hunger: 10, energy: 90, happiness: 70, bond: 50,
      sleeping: false, lastTick: NOON, createdAt: NOON, history: [], memories: ['likes meat'],
      todos: [{ id: 'abc', text: 'Buy milk', done: true, createdAt: NOON }, { id: 'def', text: 'Call mom', done: false, createdAt: NOON }],
      pendingEvolution: null, stats: { meals: 1, plays: 2, chats: 3 },
    }
    const v2 = migrateState(v1)
    expect(v2.version).toBe(2)
    expect(v2.dark).toBe(false)
    expect('todos' in v2).toBe(false)
    expect(v2.quests.map(q => [q.id, q.kind, q.text, q.done, q.difficulty])).toEqual([
      ['abc', 'todo', 'Buy milk', true, 'medium'],
      ['def', 'todo', 'Call mom', false, 'medium'],
    ])
    expect(v2).toMatchObject({ rewards: [], bits: 0, crestStreaks: {}, lastRolloverDay: null, lastRollover: null, memories: ['likes meat'] })
  })

  it('leaves a v2 state untouched', () => {
    const state = newState('hope', 'pt', NOON)
    expect(migrateState(state as unknown as Record<string, unknown>)).toEqual(state)
  })
})
