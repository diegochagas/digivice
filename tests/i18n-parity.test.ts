import { expect, it } from 'vitest'
import { STRINGS } from '@/app/i18n'

it('every UI string exists in both languages', () => {
  const en = Object.keys(STRINGS.en).sort()
  const pt = Object.keys(STRINGS.pt).sort()
  expect(pt).toEqual(en)
  expect(STRINGS.en.weekdayLetters).toHaveLength(7)
  expect(STRINGS.pt.weekdayLetters).toHaveLength(7)
})
