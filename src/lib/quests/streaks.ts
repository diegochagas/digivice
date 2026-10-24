/**
 * Crest gate on evolution: beyond Child the partner only evolves when the
 * tamer has kept its crest's streak long enough, like the crests in the anime
 * glowing only when the child lives up to them.
 */
import type { CompanionState } from '../types'

/** Crest streak (days) required to REACH each stage index: Baby, Child, Adult, Perfect, Ultimate, Jogress. */
export const CREST_STREAK_FOR_STAGE = [0, 0, 3, 7, 14, 21]

export function crestStreakRequired(stage: number): number {
  return CREST_STREAK_FOR_STAGE[stage] ?? CREST_STREAK_FOR_STAGE[CREST_STREAK_FOR_STAGE.length - 1]
}

export function crestStreakOf(state: CompanionState, crest: string | null): number {
  if (!crest) return 0
  return state.crestStreaks[crest]?.current ?? 0
}

/** True when the partner's own crest streak allows evolving to `stage`. */
export function crestGateOpen(state: CompanionState, stage: number): boolean {
  return crestStreakOf(state, state.crest) >= crestStreakRequired(stage)
}
