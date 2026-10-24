import { describe, expect, it } from 'vitest'
import { dayKey, daysBetween, daysBetweenExclusive, isDueOn, nextDayKey, weekdayOfDay } from '@/lib/quests/dates'
import { newQuest } from '@/lib/quests/types'
import { NOON } from '../fixtures'

describe('dates', () => {
  it('formats local day keys and steps across month ends', () => {
    expect(dayKey(NOON)).toBe('2026-10-24')
    expect(nextDayKey('2026-10-31')).toBe('2026-11-01')
    expect(weekdayOfDay('2026-10-24')).toBe(6)
  })

  it('lists the days strictly between two keys', () => {
    expect(daysBetweenExclusive('2026-10-24', '2026-10-25')).toEqual([])
    expect(daysBetweenExclusive('2026-10-24', '2026-10-27')).toEqual(['2026-10-25', '2026-10-26'])
    expect(daysBetween('2026-10-24', '2026-11-03')).toBe(10)
  })

  it('dailies are due on their weekdays, every day when none is set, never before creation', () => {
    const weekdaysOnly = newQuest({ kind: 'daily', text: 'Workout', weekdays: [1, 3, 5] }, 'a', NOON)
    expect(isDueOn(weekdaysOnly, '2026-10-26')).toBe(true) // Monday
    expect(isDueOn(weekdaysOnly, '2026-10-25')).toBe(false) // Sunday
    const everyDay = newQuest({ kind: 'daily', text: 'Read' }, 'b', NOON)
    expect(isDueOn(everyDay, '2026-10-25')).toBe(true)
    expect(isDueOn(everyDay, '2026-10-23')).toBe(false)
    expect(isDueOn(newQuest({ kind: 'todo', text: 'x' }, 'c', NOON), '2026-10-25')).toBe(false)
  })
})
