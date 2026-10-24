import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readState, updateState, writeState } from '@/lib/store'
import { advance, applyAction, checkEvolution, getLine, listLines, newState } from '@/lib/state'
import { toPublic } from '@/lib/companion'
import { PERSONAS } from '@/lib/personas'
import { ollamaReachable } from '@/lib/ollama'
import { applyQuestAction, QUEST_ACTION_NAMES, questActionOptions, type QuestAction } from '@/lib/quests/actions'
import type { CompanionState } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const current = await readState()
  if (!current) {
    return NextResponse.json({
      state: null,
      lines: listLines().map(l => ({ ...l, persona: PERSONAS[l.crest] ?? null })),
      ollama: await ollamaReachable(),
    })
  }
  const advanced = advance(current)
  if (advanced !== current) await writeState(advanced)
  return NextResponse.json({ state: await toPublic(advanced), ollama: await ollamaReachable() })
}

const careOptions = [
  z.object({ action: z.literal('choose'), crest: z.string(), lang: z.enum(['en', 'pt']).default('en') }),
  z.object({ action: z.literal('feed') }),
  z.object({ action: z.literal('play') }),
  z.object({ action: z.literal('sleep') }),
  z.object({ action: z.literal('wake') }),
  z.object({ action: z.literal('evolution_seen') }),
  z.object({ action: z.literal('rollover_seen') }),
  z.object({ action: z.literal('lang'), lang: z.enum(['en', 'pt']) }),
  z.object({ action: z.literal('forget'), index: z.number().int().min(0) }),
  z.object({ action: z.literal('reset') }),
] as const
const careSchema = z.discriminatedUnion('action', [...careOptions])
type CareAction = z.infer<typeof careSchema>
const actionSchema = z.discriminatedUnion('action', [...careOptions, ...questActionOptions])
type StateAction = z.infer<typeof actionSchema>

type CareInput = Exclude<CareAction, { action: 'choose' }>

function applyPetCare(state: CompanionState, input: CareInput): CompanionState | null {
  switch (input.action) {
    case 'feed': return state.sleeping ? state : applyAction(state, 'feed')
    case 'play': return state.sleeping ? state : applyAction(state, 'play')
    case 'sleep': return { ...state, sleeping: true }
    case 'wake': return { ...state, sleeping: false }
    default: return null
  }
}

function applyBookkeeping(state: CompanionState, input: CareInput): CompanionState {
  switch (input.action) {
    case 'evolution_seen': return { ...state, pendingEvolution: null }
    case 'rollover_seen': return { ...state, lastRollover: null }
    case 'lang': return { ...state, lang: input.lang }
    case 'forget': return { ...state, memories: state.memories.filter((_, i) => i !== input.index) }
    case 'reset': return newState(state.crest ?? 'courage', state.lang)
    default: return state
  }
}

function applyCareAction(state: CompanionState, input: CareInput): CompanionState {
  return applyPetCare(state, input) ?? applyBookkeeping(state, input)
}

function applyStateAction(current: CompanionState, input: Exclude<StateAction, { action: 'choose' }>): CompanionState {
  const state = advance(current)
  if (QUEST_ACTION_NAMES.has(input.action)) return checkEvolution(applyQuestAction(state, input as QuestAction))
  return applyCareAction(state, input as CareInput)
}

export async function POST(req: Request) {
  const body = actionSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  const input = body.data

  const result = await updateState(async current => {
    if (input.action === 'choose') {
      if (!getLine(input.crest)) throw new Error(`unknown crest "${input.crest}": expected one of ${listLines().map(l => l.crest).join(', ')}`)
      const state = newState(input.crest, input.lang)
      return { state, result: state }
    }
    if (!current) throw new Error('no companion yet')
    const state = applyStateAction(current, input)
    return { state, result: state }
  }).catch((err: Error) => ({ error: err.message }))

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ state: await toPublic(result) })
}
