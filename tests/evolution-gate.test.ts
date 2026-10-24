import { describe, expect, it } from 'vitest'
import { checkEvolution, DARK_EVOLUTION_MAX_HAPPINESS, EVOLUTION_THRESHOLDS, newState } from '@/lib/state'
import { CREST_STREAK_FOR_STAGE } from '@/lib/quests/streaks'
import { NOON } from './fixtures'

function courageAt(stage: number, bond: number, happiness: number, streak: number) {
  const base = newState('courage', 'en', NOON)
  return { ...base, stage, bond, happiness, crestStreaks: { courage: { current: streak, best: streak, lastActiveDay: null } } }
}

describe('crest gate on evolution', () => {
  it('Baby → Child still needs only bond and happiness', () => {
    const evolved = checkEvolution(courageAt(0, EVOLUTION_THRESHOLDS[1], 80, 0))
    expect(evolved.stage).toBe(1)
    expect(evolved.pendingEvolution).toEqual({ from: 'koromon', to: 'agumon' })
  })

  it('Child → Adult waits for the crest streak', () => {
    const stuck = checkEvolution(courageAt(1, EVOLUTION_THRESHOLDS[2], 90, CREST_STREAK_FOR_STAGE[2] - 1))
    expect(stuck.stage).toBe(1)
    const evolved = checkEvolution(courageAt(1, EVOLUTION_THRESHOLDS[2], 90, CREST_STREAK_FOR_STAGE[2]))
    expect(evolved.stage).toBe(2)
    expect(evolved.pendingEvolution?.to).toBe('greymon')
  })

  it('neglect still produces the dark evolution even with no streak at all', () => {
    const dark = checkEvolution(courageAt(2, EVOLUTION_THRESHOLDS[3], DARK_EVOLUTION_MAX_HAPPINESS, 0))
    expect(dark.dark).toBe(true)
    expect(dark.pendingEvolution?.to).toBe('skullgreymon')
  })
})
