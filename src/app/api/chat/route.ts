import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readState, writeState } from '@/lib/store'
import { checkEvolution, tick } from '@/lib/state'
import { runTurn, sleepingReply, toPublic } from '@/lib/companion'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const schema = z.object({
  message: z.string().trim().min(1).max(2000).nullable(),
})

/** POST { message } — a chat turn. message null = spontaneous feeling. */
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  const current = await readState()
  if (!current) return NextResponse.json({ error: 'no companion yet' }, { status: 400 })

  const state = checkEvolution(tick(current))
  if (state.sleeping) {
    await writeState(state)
    const r = sleepingReply(state)
    return NextResponse.json({ ...r, state: await toPublic(state) })
  }

  try {
    const turn = await runTurn(state, body.data.message)
    const next = checkEvolution(turn.state)
    await writeState(next)
    return NextResponse.json({ reply: turn.reply, emotion: turn.emotion, searched: turn.searched ?? null, state: await toPublic(next) })
  } catch (err) {
    await writeState(state)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
