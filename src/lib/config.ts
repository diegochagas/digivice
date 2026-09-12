import { z } from 'zod'

const schema = z.object({
  OLLAMA_URL: z.string().url(),
  CHAT_MODEL: z.string().min(1),
  EMBED_MODEL: z.string().min(1),
  SEARXNG_URL: z.string().url().or(z.literal('')).optional().transform(v => v || null),
  DATA_DIR: z.string().min(1),
})

export type Config = z.infer<typeof schema>

let cached: Config | null = null

/** Validated environment. Throws a readable error listing every missing value. */
export function getConfig(): Config {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid configuration (copy .env.example to .env and fill it): ${problems}`)
  }
  cached = parsed.data
  return cached
}
