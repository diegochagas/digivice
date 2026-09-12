/**
 * Shared helpers for the API routes: public state projection, persistence
 * and the chat turn (model call + tool handling).
 */
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'
import { buildSystemPrompt } from './prompt'
import { chat, type OllamaMessage } from './ollama'
import { formatLore, loreReady, searchLore } from './lore'
import { formatResults, searchEnabled, webSearch } from './search'
import {
  applyAction, assetFolder, currentDigimon, displayName, idleEmotion, nextEvolutionAt, STAGE_NAMES,
} from './state'
import { EMOTIONS, type ChatMessage, type CompanionState, type Emotion, type PublicState } from './types'

const HISTORY_LIMIT = 24
const MEMORY_LIMIT = 40

const reactionCache = new Map<string, Emotion[]>()

async function availableReactions(digimon: string): Promise<Emotion[]> {
  const cached = reactionCache.get(digimon)
  if (cached) return cached
  const dir = path.join(process.cwd(), 'public', 'images', 'reactions', digimon)
  let list: Emotion[] = []
  try {
    const files = await fs.readdir(dir)
    list = EMOTIONS.filter(e => files.includes(`${e}.png`))
  } catch {
    list = []
  }
  reactionCache.set(digimon, list)
  return list
}

export function invalidateReactionCache() {
  reactionCache.clear()
}

export async function toPublic(state: CompanionState): Promise<PublicState> {
  const digimon = currentDigimon(state)
  const reactions = digimon ? await availableReactions(digimon) : []
  const idle = idleEmotion(state)
  const baseImage = digimon && state.crest ? `/images/${assetFolder(state.crest, digimon)}/${digimon}.png` : null
  const imageSrc = digimon && reactions.includes(idle) ? `/images/reactions/${digimon}/${idle}.png` : baseImage
  const evo = state.pendingEvolution
  let evolutionVideo: string | null = null
  if (evo && state.crest) {
    const rel = `/videos/${assetFolder(state.crest, evo.to)}/${evo.to}.mp4`
    try {
      await fs.access(path.join(process.cwd(), 'public', rel))
      evolutionVideo = rel
    } catch {
      evolutionVideo = null // no clip for this form (e.g. regression to Baby): the sprite just swaps
    }
  }
  return {
    ...state,
    history: state.history.slice(-12),
    digimon,
    displayName: digimon ? displayName(digimon) : null,
    stageName: digimon ? (state.dark ? 'Perfect (dark)' : STAGE_NAMES[state.stage] ?? null) : null,
    idleEmotion: idle,
    imageSrc,
    reactions,
    nextEvolutionAt: nextEvolutionAt(state),
    evolutionVideo,
    loreReady: await loreReady(),
    searchEnabled: searchEnabled(),
  }
}

const replySchema = z.object({
  reply: z.string().min(1),
  emotion: z.enum(EMOTIONS).catch('neutral'),
  remember: z.string().nullable().optional(),
  tool: z.union([
    z.object({ name: z.literal('web_search'), query: z.string().min(1) }),
    z.object({ name: z.literal('todo_add'), text: z.string().min(1) }),
    z.object({ name: z.literal('todo_done'), id: z.string().min(1) }),
    z.null(),
  ]).optional(),
})
type ModelReply = z.infer<typeof replySchema>

function parseReply(raw: string): ModelReply {
  try {
    const parsed = replySchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
  } catch {}
  // Model broke format: keep whatever it said as plain speech.
  const text = raw.replace(/^[\s{"]*reply["\s:]*/i, '').replace(/["}\s]*$/, '').trim()
  return { reply: text || '...', emotion: 'neutral', remember: null, tool: null }
}

export interface TurnResult {
  reply: string
  emotion: Emotion
  state: CompanionState
  searched?: string
}

/**
 * One conversation turn. `message` null means an idle "say how you feel" turn.
 * Returns the updated state (not yet persisted).
 */
export async function runTurn(state: CompanionState, message: string | null): Promise<TurnResult> {
  const now = new Date()
  const canSearch = searchEnabled()
  let lore = ''
  if (message) {
    try {
      const hits = await searchLore(message, 5)
      lore = formatLore(hits.filter(h => h.score > 0.45))
    } catch {
      lore = ''
    }
  }

  const system = buildSystemPrompt(state, { lore, searchEnabled: canSearch, idle: !message, now })
  const history: OllamaMessage[] = state.history.slice(-HISTORY_LIMIT).map(m => ({ role: m.role, content: m.content }))
  const messages: OllamaMessage[] = [{ role: 'system', content: system }, ...history]
  if (message) messages.push({ role: 'user', content: message })
  else messages.push({ role: 'user', content: '(no message — share how you feel right now, in one or two sentences)' })

  let parsed = parseReply(await chat(messages, { json: true }))
  let next = { ...state, todos: [...state.todos], memories: [...state.memories], history: [...state.history] }
  let searched: string | undefined

  if (parsed.tool?.name === 'web_search' && canSearch && message) {
    searched = parsed.tool.query
    const results = await webSearch(parsed.tool.query, 5)
    const followUp: OllamaMessage[] = [
      ...messages,
      { role: 'assistant', content: JSON.stringify({ reply: parsed.reply, emotion: parsed.emotion, tool: parsed.tool }) },
      {
        role: 'user',
        content: results.length
          ? `WEB SEARCH RESULTS for "${parsed.tool.query}":\n\n${formatResults(results)}\n\nNow answer the tamer's question using these results, in character, briefly, mentioning the source site name. "tool" must be null.`
          : 'The web search returned nothing. Tell the tamer, in character, that you could not find it. "tool" must be null.',
      },
    ]
    parsed = parseReply(await chat(followUp, { json: true, temperature: 0.5 }))
  } else if (parsed.tool?.name === 'todo_add') {
    next.todos.push({ id: Math.random().toString(36).slice(2, 8), text: parsed.tool.text, done: false, createdAt: Date.now() })
  } else if (parsed.tool?.name === 'todo_done') {
    const id = parsed.tool.id
    next.todos = next.todos.map(t => (t.id === id || t.text.toLowerCase() === id.toLowerCase() ? { ...t, done: true } : t))
  }

  if (parsed.remember && parsed.remember.trim().length > 3) {
    const fact = parsed.remember.trim()
    if (!next.memories.some(m => m.toLowerCase() === fact.toLowerCase())) {
      next.memories = [...next.memories, fact].slice(-MEMORY_LIMIT)
    }
  }

  const at = Date.now()
  if (message) next.history.push({ role: 'user', content: message, at })
  next.history.push({ role: 'assistant', content: parsed.reply, emotion: parsed.emotion, at })
  next.history = next.history.slice(-HISTORY_LIMIT * 2)
  if (message) next = applyAction(next, 'chat')

  return { reply: parsed.reply, emotion: parsed.emotion, state: next, searched }
}

export function sleepingReply(state: CompanionState): { reply: string; emotion: Emotion } {
  const name = displayName(currentDigimon(state) ?? 'digimon')
  const pt = state.lang === 'pt'
  return {
    reply: pt ? `Zzz... ${name} está dormindo. Acorde-o primeiro!` : `Zzz... ${name} is asleep. Wake it up first!`,
    emotion: 'sleepy',
  }
}

export type { ChatMessage }
