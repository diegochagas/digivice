import { describe, expect, it } from 'vitest'
import { completeQuest, MISSED_DAILY_HAPPINESS } from '@/lib/quests/scoring'
import { closeCrestDay, MAX_CHARGED_DAYS, rolloverDays } from '@/lib/quests/rollover'
import { DAY, NOON, stateWith } from '../fixtures'

describe('rolloverDays', () => {
  it('only stamps the day on first run and is a no-op within the same day', () => {
    const fresh = { ...stateWith([]), lastRolloverDay: null }
    const stamped = rolloverDays(fresh, NOON)
    expect(stamped.lastRolloverDay).toBe('2026-10-24')
    expect(rolloverDays(stamped, NOON + 3600_000)).toBe(stamped)
  })

  it('charges missed dailies, resets their streak and reports them', () => {
    const state = stateWith([
      { kind: 'daily', text: 'Workout', crest: 'courage', difficulty: 'medium' },
      { kind: 'daily', text: 'Sunday only', crest: 'love', weekdays: [0] },
    ])
    const withStreak = { ...state, quests: [{ ...state.quests[0], streak: 5 }, state.quests[1]] }
    const next = rolloverDays(withStreak, NOON + DAY)
    expect(next.happiness).toBe(state.happiness + MISSED_DAILY_HAPPINESS.medium)
    expect(next.quests[0].streak).toBe(0)
    expect(next.lastRollover).toMatchObject({ day: '2026-10-24', missed: [{ id: 'q0', text: 'Workout', crest: 'courage' }], crestsBroken: ['courage'] })
    expect(next.lastRolloverDay).toBe('2026-10-25')
  })

  it('extends the crest streak on a kept day and leaves it alone on rest days', () => {
    const state = stateWith([{ kind: 'daily', text: 'Workout', crest: 'courage', weekdays: [6] }])
    const done = completeQuest(state, 'q0', NOON)
    const sunday = rolloverDays(done, NOON + DAY)
    expect(sunday.crestStreaks.courage).toMatchObject({ current: 1, best: 1 })
    expect(sunday.lastRollover?.crestsKept).toEqual(['courage'])
    const monday = rolloverDays(sunday, NOON + 2 * DAY) // nothing due on Sunday, nothing done: neutral
    expect(monday.crestStreaks.courage.current).toBe(1)
    expect(monday.happiness).toBe(sunday.happiness)
  })

  it('a long absence breaks every streak and charges at most MAX_CHARGED_DAYS days', () => {
    const state = stateWith([{ kind: 'daily', text: 'Read', crest: 'knowledge', difficulty: 'easy' }])
    const streaky = { ...state, crestStreaks: { knowledge: { current: 9, best: 9, lastActiveDay: '2026-10-24' } } }
    const back = rolloverDays(streaky, NOON + 30 * DAY)
    expect(back.crestStreaks.knowledge.current).toBe(0)
    expect(back.lastRollover?.missed).toHaveLength(MAX_CHARGED_DAYS)
    expect(back.happiness).toBe(Math.max(0, state.happiness + MAX_CHARGED_DAYS * MISSED_DAILY_HAPPINESS.easy))
  })
})

describe('closeCrestDay', () => {
  const streak = { current: 2, best: 4, lastActiveDay: '2026-10-24' }
  it('breaks on a missed daily of that crest, keeps on activity, is neutral otherwise', () => {
    expect(closeCrestDay(streak, 'courage', '2026-10-24', [{ id: 'x', text: 'x', crest: 'courage' }])).toMatchObject({ verdict: 'broken', streak: { current: 0 } })
    expect(closeCrestDay(streak, 'courage', '2026-10-24', [])).toMatchObject({ verdict: 'kept', streak: { current: 3, best: 4 } })
    expect(closeCrestDay(streak, 'courage', '2026-10-25', [])).toMatchObject({ verdict: 'neutral', streak })
  })
})

describe('rolloverDays clock guard', () => {
  it('does nothing when the clock moved back before the last rollover day', () => {
    const state = { ...stateWith([{ kind: 'daily', text: 'Read' }]), lastRolloverDay: '2026-10-25' }
    expect(rolloverDays(state, NOON)).toBe(state)
  })
})
