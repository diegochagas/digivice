/** Crest catalogue for the UI: colours from crests.json plus a glyph, since there is no crest artwork yet. */
import crestsJson from '@/data/crests.json'

export interface CrestInfo {
  name: string
  fill: string
  background: string
  glyph: string
}

const GLYPHS: Record<string, string> = {
  courage: '🔥', friendship: '🤝', love: '❤️', knowledge: '📚', sincerity: '🌿', reliability: '⚓',
  hope: '🕊️', light: '✨', kindness: '🌸', miracles: '🌟', destiny: '🎯',
}

export const CRESTS: CrestInfo[] = crestsJson.crests.map(c => ({
  name: c.name,
  fill: c.fill,
  background: c.backgroundColor,
  glyph: GLYPHS[c.name] ?? '◆',
}))

/** Lowercase a crest name the model or a client sent and keep it only when it is a real crest. Example: normalizeCrest('Courage') → 'courage', normalizeCrest('Pizza') → null. */
export function normalizeCrest(name: string | null | undefined): string | null {
  if (!name) return null
  const lower = name.trim().toLowerCase()
  return CRESTS.some(c => c.name === lower) ? lower : null
}

export function crestInfo(name: string | null): CrestInfo | null {
  return CRESTS.find(c => c.name === name) ?? null
}
