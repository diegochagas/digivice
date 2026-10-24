/** Custom rewards bought with Bits, Habitica style: the reward itself is real life (a coffee, an episode). */
import { clamp } from '../clamp'
import type { CompanionState } from '../types'
import type { Reward } from './types'

/** The partner is glad to see the tamer treat themselves. */
export const REWARD_HAPPINESS = 2

export interface RewardDraft { text: string; cost: number }

export function addReward(state: CompanionState, draft: RewardDraft, id: string, now = Date.now()): CompanionState {
  const reward: Reward = { id, text: draft.text.trim(), cost: Math.max(1, Math.round(draft.cost)), createdAt: now, bought: 0 }
  return { ...state, rewards: [...state.rewards, reward] }
}

/** Buy a reward when affordable; otherwise the state is returned unchanged. */
export function buyReward(state: CompanionState, id: string): CompanionState {
  const reward = state.rewards.find(r => r.id === id)
  if (!reward || state.bits < reward.cost) return state
  const rewards = state.rewards.map(r => (r.id === id ? { ...r, bought: r.bought + 1 } : r))
  return { ...state, rewards, bits: state.bits - reward.cost, happiness: clamp(state.happiness + REWARD_HAPPINESS) }
}

export function deleteReward(state: CompanionState, id: string): CompanionState {
  return { ...state, rewards: state.rewards.filter(r => r.id !== id) }
}
