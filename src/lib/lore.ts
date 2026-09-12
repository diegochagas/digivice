/**
 * Digimon lore retrieval over the index built by scripts/build-lore-index.mjs:
 *   $DATA_DIR/lore/chunks.json  — [{ title, url, text }]
 *   $DATA_DIR/lore/vectors.f32  — Float32Array, chunks × dims, row-major
 */
import { promises as fs } from 'fs'
import path from 'path'
import { getConfig } from './config'
import { embed } from './ollama'

interface Chunk {
  title: string
  url: string
  text: string
}

interface Index {
  chunks: Chunk[]
  vectors: Float32Array
  dims: number
  mtime: number
}

let cache: Index | null = null

function loreDir() {
  return path.join(path.resolve(getConfig().DATA_DIR), 'lore')
}

export async function loreReady(): Promise<boolean> {
  try {
    await fs.access(path.join(loreDir(), 'chunks.json'))
    await fs.access(path.join(loreDir(), 'vectors.f32'))
    return true
  } catch {
    return false
  }
}

async function loadIndex(): Promise<Index | null> {
  const chunksFile = path.join(loreDir(), 'chunks.json')
  const vecFile = path.join(loreDir(), 'vectors.f32')
  let stat
  try {
    stat = await fs.stat(chunksFile)
  } catch {
    return null
  }
  if (cache && cache.mtime === stat.mtimeMs) return cache
  const meta = JSON.parse(await fs.readFile(chunksFile, 'utf8')) as { dims: number; chunks: Chunk[] }
  const buf = await fs.readFile(vecFile)
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  cache = { chunks: meta.chunks, vectors, dims: meta.dims, mtime: stat.mtimeMs }
  return cache
}

export interface LoreHit extends Chunk {
  score: number
}

/** Top-k chunks by cosine similarity, with a small boost when the page title appears in the query. */
export async function searchLore(query: string, k = 5): Promise<LoreHit[]> {
  const index = await loadIndex()
  if (!index || index.chunks.length === 0) return []
  const [q] = await embed([`search_query: ${query}`])
  let qNorm = 0
  for (const v of q) qNorm += v * v
  qNorm = Math.sqrt(qNorm) || 1
  const lowerQuery = query.toLowerCase()
  const scored: LoreHit[] = []
  const { dims, vectors, chunks } = index
  for (let i = 0; i < chunks.length; i++) {
    let dot = 0
    let n = 0
    const off = i * dims
    for (let d = 0; d < dims; d++) {
      const v = vectors[off + d]
      dot += v * q[d]
      n += v * v
    }
    let score = dot / ((Math.sqrt(n) || 1) * qNorm)
    if (lowerQuery.includes(chunks[i].title.toLowerCase())) score += 0.08
    scored.push({ ...chunks[i], score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}

export function formatLore(hits: LoreHit[]): string {
  return hits.map(h => `[${h.title}] ${h.text}`).join('\n\n')
}
