import { promises as fs } from 'fs'
import path from 'path'
import { getConfig } from './config'
import type { CompanionState } from './types'

const STATE_FILE = 'state.json'
let queue: Promise<unknown> = Promise.resolve()

function stateFile() {
  return path.join(path.resolve(getConfig().DATA_DIR), STATE_FILE)
}

export async function readState(): Promise<CompanionState | null> {
  try {
    const raw = await fs.readFile(stateFile(), 'utf8')
    const parsed = JSON.parse(raw) as CompanionState
    if (typeof parsed.dark !== 'boolean') parsed.dark = false
    return parsed
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/** Atomic write: temp file + rename, serialized so concurrent requests can't interleave. */
export function writeState(state: CompanionState): Promise<void> {
  const run = async () => {
    const file = stateFile()
    await fs.mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(state, null, 2))
    await fs.rename(tmp, file)
  }
  queue = queue.then(run, run)
  return queue as Promise<void>
}

/** Run a read-modify-write under the store lock. */
export function updateState<T>(fn: (state: CompanionState | null) => Promise<{ state: CompanionState; result: T }>): Promise<T> {
  const run = async () => {
    const current = await readState()
    const { state, result } = await fn(current)
    const file = stateFile()
    await fs.mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(state, null, 2))
    await fs.rename(tmp, file)
    return result
  }
  const next = queue.then(run, run)
  queue = next.catch(() => undefined)
  return next
}
