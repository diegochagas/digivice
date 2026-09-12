import { getConfig } from './config'

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  json?: boolean
  temperature?: number
  numCtx?: number
}

/** Strip any leaked <think>...</think> block from reasoning models. */
export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export async function chat(messages: OllamaMessage[], opts: ChatOptions = {}): Promise<string> {
  const cfg = getConfig()
  const res = await fetch(`${cfg.OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.CHAT_MODEL,
      messages,
      stream: false,
      think: false,
      format: opts.json ? 'json' : undefined,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_ctx: opts.numCtx ?? 8192,
      },
    }),
  })
  if (!res.ok) throw new Error(`Ollama chat failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return stripThink(data.message?.content ?? '')
}

export async function embed(inputs: string[]): Promise<number[][]> {
  const cfg = getConfig()
  const res = await fetch(`${cfg.OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.EMBED_MODEL, input: inputs }),
  })
  if (!res.ok) throw new Error(`Ollama embed failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.embeddings as number[][]
}

export async function ollamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${getConfig().OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}
