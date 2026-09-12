import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readState, updateState, writeState } from '@/lib/store'
import { applyAction, checkEvolution, getLine, listLines, newState, tick } from '@/lib/state'
import { toPublic } from '@/lib/companion'
import { PERSONAS } from '@/lib/personas'
import { ollamaReachable } from '@/lib/ollama'

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
  const ticked = checkEvolution(tick(current))
  if (ticked !== current) await writeState(ticked)
  return NextResponse.json({ state: await toPublic(ticked), ollama: await ollamaReachable() })
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('choose'), crest: z.string(), lang: z.enum(['en', 'pt']).default('en') }),
  z.object({ action: z.literal('feed') }),
  z.object({ action: z.literal('play') }),
  z.object({ action: z.literal('sleep') }),
  z.object({ action: z.literal('wake') }),
  z.object({ action: z.literal('evolution_seen') }),
  z.object({ action: z.literal('lang'), lang: z.enum(['en', 'pt']) }),
  z.object({ action: z.literal('todo_toggle'), id: z.string() }),
  z.object({ action: z.literal('todo_delete'), id: z.string() }),
  z.object({ action: z.literal('todo_add'), text: z.string().min(1).max(200) }),
  z.object({ action: z.literal('forget'), index: z.number().int().min(0) }),
  z.object({ action: z.literal('reset') }),
])

export async function POST(req: Request) {
  const body = actionSchema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  const input = body.data

  const result = await updateState(async current => {
    if (input.action === 'choose') {
      if (!getLine(input.crest)) throw new Error('unknown crest')
      const state = newState(input.crest, input.lang)
      return { state, result: state }
    }
    if (!current) throw new Error('no companion yet')
    let state = checkEvolution(tick(current))
    switch (input.action) {
      case 'feed':
        if (!state.sleeping) state = applyAction(state, 'feed')
        break
      case 'play':
        if (!state.sleeping) state = applyAction(state, 'play')
        break
      case 'sleep':
        state = { ...state, sleeping: true }
        break
      case 'wake':
        state = { ...state, sleeping: false }
        break
      case 'evolution_seen':
        state = { ...state, pendingEvolution: null }
        break
      case 'lang':
        state = { ...state, lang: input.lang }
        break
      case 'todo_toggle':
        state = { ...state, todos: state.todos.map(t => (t.id === input.id ? { ...t, done: !t.done } : t)) }
        break
      case 'todo_delete':
        state = { ...state, todos: state.todos.filter(t => t.id !== input.id) }
        break
      case 'todo_add':
        state = { ...state, todos: [...state.todos, { id: Math.random().toString(36).slice(2, 8), text: input.text, done: false, createdAt: Date.now() }] }
        break
      case 'forget':
        state = { ...state, memories: state.memories.filter((_, i) => i !== input.index) }
        break
      case 'reset':
        state = newState(state.crest ?? 'courage', state.lang)
        break
    }
    return { state, result: state }
  }).catch((err: Error) => ({ error: err.message }))

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ state: await toPublic(result) })
}
