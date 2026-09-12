import crestsJson from '@/data/crests.json'
import type { CompanionState, Emotion, Lang, LineInfo } from './types'

const HOUR = 3_600_000

export const STAGE_NAMES = ['Baby', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Ultimate (Jogress)']

/** Bond XP required to reach each stage index. */
export const EVOLUTION_THRESHOLDS = [0, 40, 160, 420, 900, 1600]
export const EVOLUTION_MIN_HAPPINESS = 60
/** Evolving from Adult while this unhappy triggers the dark evolution (SkullGreymon). */
export const DARK_EVOLUTION_MAX_HAPPINESS = 35
/** A dark form regresses to Baby once happiness climbs back here. */
export const DARK_RECOVERY_HAPPINESS = 75
const DARK_STAGE = 2

export const ACTION_EFFECTS = {
  feed: { hunger: -35, happiness: +6, energy: +4, bond: +3 },
  play: { hunger: +6, happiness: +20, energy: -12, bond: +5 },
  chat: { hunger: 0, happiness: +3, energy: -1, bond: +2 },
}

/** Per-hour drift while awake / asleep. */
const DRIFT = {
  awake: { hunger: +5, energy: -4, happiness: -2 },
  asleep: { hunger: +2, energy: +14, happiness: -0.5 },
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

export function listLines(): LineInfo[] {
  return crestsJson.crests.map(c => ({
    crest: c.name,
    digimons: c.digimons,
    stageNames: STAGE_NAMES.slice(0, c.digimons.length),
    alternativeEvolution: c.alternativeEvolution ?? null,
  }))
}

export function getLine(crest: string | null): LineInfo | null {
  if (!crest) return null
  return listLines().find(l => l.crest === crest) ?? null
}

export function currentDigimon(state: CompanionState): string | null {
  const line = getLine(state.crest)
  if (!line) return null
  if (state.dark && line.alternativeEvolution) return line.alternativeEvolution
  return line.digimons[Math.min(state.stage, line.digimons.length - 1)] ?? null
}

/** Folder holding the sprite/video for a given form (Omegamon lives in `ultimate`). */
export function assetFolder(crest: string, digimon: string): string {
  return digimon === 'omegamon' ? 'ultimate' : crest
}

export function newState(crest: string, lang: Lang, now = Date.now()): CompanionState {
  return {
    version: 1,
    crest,
    stage: 0,
    dark: false,
    lang,
    hunger: 30,
    energy: 90,
    happiness: 70,
    bond: 0,
    sleeping: false,
    lastTick: now,
    createdAt: now,
    history: [],
    memories: [],
    todos: [],
    pendingEvolution: null,
    stats: { meals: 0, plays: 0, chats: 0 },
  }
}

/** Advance hunger/energy/happiness for the time elapsed since the last tick. */
export function tick(state: CompanionState, now = Date.now()): CompanionState {
  const hours = Math.max(0, (now - state.lastTick) / HOUR)
  if (hours === 0) return state
  const next = { ...state, lastTick: now }
  const d = state.sleeping ? DRIFT.asleep : DRIFT.awake
  next.hunger = clamp(state.hunger + d.hunger * hours)
  next.energy = clamp(state.energy + d.energy * hours)
  let happinessDrift = d.happiness * hours
  if (next.hunger > 75) happinessDrift -= 3 * hours
  next.happiness = clamp(state.happiness + happinessDrift)
  if (next.sleeping && next.energy >= 100) next.sleeping = false
  if (!next.sleeping && next.energy <= 5) next.sleeping = true
  return next
}

export function applyAction(state: CompanionState, action: keyof typeof ACTION_EFFECTS): CompanionState {
  const e = ACTION_EFFECTS[action]
  const next = { ...state, stats: { ...state.stats } }
  next.hunger = clamp(state.hunger + e.hunger)
  next.happiness = clamp(state.happiness + e.happiness)
  next.energy = clamp(state.energy + e.energy)
  next.bond = state.bond + e.bond
  if (action === 'feed') next.stats.meals++
  if (action === 'play') next.stats.plays++
  if (action === 'chat') next.stats.chats++
  return checkEvolution(next)
}

export function nextEvolutionAt(state: CompanionState): number | null {
  const line = getLine(state.crest)
  if (!line || state.dark || state.stage >= line.digimons.length - 1) return null
  return EVOLUTION_THRESHOLDS[state.stage + 1] ?? null
}

export function checkEvolution(state: CompanionState): CompanionState {
  const line = getLine(state.crest)
  if (!line || state.pendingEvolution || state.sleeping) return state
  if (state.dark) {
    // Cared for again: the dark form breaks down and the Digimon starts over as a Baby.
    if (state.happiness < DARK_RECOVERY_HAPPINESS) return state
    const from = line.alternativeEvolution ?? line.digimons[state.stage]
    return { ...state, dark: false, stage: 0, bond: EVOLUTION_THRESHOLDS[1], pendingEvolution: { from, to: line.digimons[0] } }
  }
  const target = nextEvolutionAt(state)
  if (target === null || state.bond < target) return state
  const from = line.digimons[state.stage]
  if (line.alternativeEvolution && state.stage === DARK_STAGE && state.happiness <= DARK_EVOLUTION_MAX_HAPPINESS) {
    return { ...state, dark: true, pendingEvolution: { from, to: line.alternativeEvolution } }
  }
  if (state.happiness < EVOLUTION_MIN_HAPPINESS) return state
  const to = line.digimons[state.stage + 1]
  return { ...state, stage: state.stage + 1, pendingEvolution: { from, to } }
}

export function idleEmotion(state: CompanionState): Emotion {
  if (state.sleeping) return 'sleepy'
  if (state.dark && state.happiness < 50) return 'angry'
  if (state.hunger > 70) return 'hungry'
  if (state.energy < 25) return 'sleepy'
  if (state.happiness < 30) return 'sad'
  if (state.happiness > 80) return 'happy'
  return 'neutral'
}

/** Short human-readable condition, used in the system prompt. */
export function describeCondition(state: CompanionState): string {
  const lvl = (v: number, low: string, mid: string, high: string) => (v < 33 ? low : v < 66 ? mid : high)
  const parts = [
    `hunger: ${Math.round(state.hunger)}/100 (${lvl(state.hunger, 'well fed', 'a bit peckish', 'very hungry')})`,
    `energy: ${Math.round(state.energy)}/100 (${lvl(state.energy, 'exhausted', 'a little tired', 'full of energy')})`,
    `happiness: ${Math.round(state.happiness)}/100 (${lvl(state.happiness, 'sad and lonely', 'okay', 'very happy')})`,
    `bond with tamer: ${state.bond} XP`,
  ]
  if (state.sleeping) parts.push('currently asleep')
  return parts.join('; ')
}

export function displayName(digimon: string): string {
  const special: Record<string, string> = {
    metalgreymon: 'MetalGreymon',
    wargreymon: 'WarGreymon',
    skullgreymon: 'SkullGreymon',
    weregarurumon: 'WereGarurumon',
    metalgarurumon: 'MetalGarurumon',
    atlurkabuterimon: 'AtlurKabuterimon',
    herculeskabuterimon: 'HerculesKabuterimon',
    holyangemon: 'HolyAngemon',
    banchostingmon: 'BanchoStingmon',
    saintgalgomon: 'SaintGalgomon',
  }
  return special[digimon] ?? digimon.charAt(0).toUpperCase() + digimon.slice(1)
}
