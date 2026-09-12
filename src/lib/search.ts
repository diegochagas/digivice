import { getConfig } from './config'

export interface SearchResult {
  title: string
  url: string
  content: string
}

export function searchEnabled(): boolean {
  return Boolean(getConfig().SEARXNG_URL)
}

export async function webSearch(query: string, limit = 5): Promise<SearchResult[]> {
  const base = getConfig().SEARXNG_URL
  if (!base) return []
  const qs = new URLSearchParams({ q: query, format: 'json' })
  try {
    const res = await fetch(`${base}/search?${qs}`, {
      headers: { 'User-Agent': 'digivice/1.0' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).slice(0, limit).map((r: SearchResult) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      content: r.content ?? '',
    }))
  } catch {
    return []
  }
}

export function formatResults(results: SearchResult[]): string {
  return results.map(r => `- ${r.title}\n  ${r.url}\n  ${r.content}`).join('\n\n')
}
