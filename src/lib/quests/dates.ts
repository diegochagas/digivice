import type { DayKey, Quest, Weekday } from './types'

const DAY_MS = 86_400_000

/** Local calendar day of a timestamp. Example: dayKey(new Date(2026, 9, 24, 23, 59)) → "2026-10-24". */
export function dayKey(at: number | Date): DayKey {
  const d = new Date(at)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Local midnight at the start of a day key. */
export function dayStart(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayOfDay(day: DayKey): Weekday {
  return dayStart(day).getDay() as Weekday
}

export function nextDayKey(day: DayKey): DayKey {
  const start = dayStart(day)
  return dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1))
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / DAY_MS)
}

/** Every day strictly after `from` and strictly before `to`, oldest first. */
export function daysBetweenExclusive(from: DayKey, to: DayKey): DayKey[] {
  const days: DayKey[] = []
  for (let day = nextDayKey(from); daysBetween(day, to) > 0; day = nextDayKey(day)) days.push(day)
  return days
}

/** A daily is due on a day when that weekday is selected (or none is, meaning every day). */
export function isDueOn(quest: Quest, day: DayKey): boolean {
  if (quest.kind !== 'daily') return false
  if (dayStart(day).getTime() + DAY_MS <= quest.createdAt) return false
  return quest.weekdays.length === 0 || quest.weekdays.includes(weekdayOfDay(day))
}

export function isDoneOn(quest: Quest, day: DayKey): boolean {
  return quest.kind === 'daily' ? quest.lastDoneDay === day : quest.done
}
