/**
 * State file migrations. v1 (pet only, flat `todos`) → v2 (quests, rewards,
 * Bits, crest streaks). Old to-dos become medium untagged to-do quests.
 */
import type { CompanionState } from '../types'
import { newQuest } from './types'

interface LegacyTodo { id: string; text: string; done: boolean; createdAt: number }
type AnyState = Record<string, unknown>

export function migrateState(raw: AnyState): CompanionState {
  const version = typeof raw.version === 'number' ? raw.version : 1
  const migrated = version < 2 ? migrateV1toV2(raw) : raw
  return migrated as unknown as CompanionState
}

function migrateV1toV2(raw: AnyState): AnyState {
  const todos = Array.isArray(raw.todos) ? (raw.todos as LegacyTodo[]) : []
  const quests = todos.map(t => ({
    ...newQuest({ kind: 'todo', text: t.text }, t.id, t.createdAt),
    done: Boolean(t.done),
    doneAt: t.done ? t.createdAt : null,
  }))
  const { todos: _dropped, ...rest } = raw
  void _dropped
  return {
    ...rest,
    version: 2,
    dark: typeof raw.dark === 'boolean' ? raw.dark : false,
    quests,
    rewards: [],
    bits: 0,
    crestStreaks: {},
    lastRolloverDay: null,
    lastRollover: null,
  }
}
