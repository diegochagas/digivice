import type { CrestStreak, DayKey, Quest, Reward, RolloverReport } from './quests/types'

export const EMOTIONS = [
  'neutral', 'happy', 'excited', 'sad', 'angry',
  'hungry', 'sleepy', 'thinking', 'surprised', 'love',
] as const
export type Emotion = typeof EMOTIONS[number]

export type Lang = 'en' | 'pt'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  emotion?: Emotion
  at: number
}

export interface CompanionState {
  version: 2
  crest: string | null
  stage: number
  /** Dark evolution (e.g. SkullGreymon): stuck until cared for, then regresses to Baby. */
  dark: boolean
  lang: Lang
  hunger: number
  energy: number
  happiness: number
  bond: number
  sleeping: boolean
  lastTick: number
  createdAt: number
  history: ChatMessage[]
  memories: string[]
  /** Habitica-style task layer; see quests/README in src/lib/quests/types.ts. */
  quests: Quest[]
  rewards: Reward[]
  /** Currency earned by completing quests, spent on rewards. */
  bits: number
  crestStreaks: Record<string, CrestStreak>
  lastRolloverDay: DayKey | null
  lastRollover: RolloverReport | null
  pendingEvolution: { from: string; to: string } | null
  stats: { meals: number; plays: number; chats: number }
}

export interface LineInfo {
  crest: string
  digimons: string[]
  stageNames: string[]
  alternativeEvolution: string | null
}

/** What the browser receives: the state plus derived display info. */
export interface PublicState extends Omit<CompanionState, 'history'> {
  digimon: string | null
  displayName: string | null
  stageName: string | null
  idleEmotion: Emotion
  imageSrc: string | null
  reactions: Emotion[]
  nextEvolutionAt: number | null
  /** Crest streak needed for the next stage, when one is still ahead. */
  crestGate: { stage: number; required: number; current: number } | null
  evolutionVideo: string | null
  history: ChatMessage[]
  loreReady: boolean
  searchEnabled: boolean
}
