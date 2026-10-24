import { describe, expect, it } from 'vitest'
import { addReward, buyReward, deleteReward, REWARD_HAPPINESS } from '@/lib/quests/rewards'
import { NOON, stateWith } from '../fixtures'

describe('rewards', () => {
  it('buys only when affordable and cheers the partner a little', () => {
    const state = { ...addReward(stateWith([]), { text: 'Coffee', cost: 20 }, 'r1', NOON), bits: 25, happiness: 50 }
    const broke = buyReward({ ...state, bits: 10 }, 'r1')
    expect(broke.bits).toBe(10)
    expect(broke.rewards[0].bought).toBe(0)
    const bought = buyReward(state, 'r1')
    expect(bought.bits).toBe(5)
    expect(bought.rewards[0].bought).toBe(1)
    expect(bought.happiness).toBe(50 + REWARD_HAPPINESS)
    expect(deleteReward(bought, 'r1').rewards).toEqual([])
  })

  it('normalises the cost to a positive integer', () => {
    expect(addReward(stateWith([]), { text: ' Nap ', cost: 0.4 }, 'r2', NOON).rewards[0]).toMatchObject({ text: 'Nap', cost: 1 })
  })
})
