import { expect, it } from 'vitest'
import { CRESTS, normalizeCrest } from '@/lib/crests'

it('normalizeCrest keeps only real crest names, case-insensitively', () => {
  expect(CRESTS.map(c => c.name)).toContain('courage')
  expect(normalizeCrest(' Knowledge ')).toBe('knowledge')
  expect(normalizeCrest('Pizza')).toBeNull()
  expect(normalizeCrest(undefined)).toBeNull()
})
