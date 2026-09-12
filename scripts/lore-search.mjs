#!/usr/bin/env node
/** Debug the lore index: node scripts/lore-search.mjs "your question" [k] */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries((await fs.readFile(path.join(root, '.env'), 'utf8')).split('\n')
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))
const loreDir = path.join(path.resolve(root, env.DATA_DIR ?? './data'), 'lore')
const query = process.argv[2]
const k = Number(process.argv[3] ?? 5)
if (!query) { console.error('usage: lore-search.mjs "question" [k]'); process.exit(1) }

const { dims, chunks } = JSON.parse(await fs.readFile(path.join(loreDir, 'chunks.json'), 'utf8'))
const buf = await fs.readFile(path.join(loreDir, 'vectors.f32'))
const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
const res = await fetch(`${env.OLLAMA_URL}/api/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: env.EMBED_MODEL, input: [`search_query: ${query}`] }) })
const [q] = (await res.json()).embeddings
const qn = Math.sqrt(q.reduce((a, v) => a + v * v, 0))
const scored = chunks.map((c, i) => {
  let dot = 0, n = 0
  for (let d = 0; d < dims; d++) { const v = vectors[i * dims + d]; dot += v * q[d]; n += v * v }
  let score = dot / (Math.sqrt(n) * qn)
  if (query.toLowerCase().includes(c.title.toLowerCase())) score += 0.08
  return { ...c, score }
}).sort((a, b) => b.score - a.score).slice(0, k)
for (const h of scored) console.log(`\n[${h.score.toFixed(3)}] ${h.title}\n${h.text.slice(0, 400)}`)
