#!/usr/bin/env node
/**
 * Build the Digimon lore index from Wikimon (https://wikimon.net) pages.
 *
 *   node scripts/build-lore-index.mjs [--refetch] [--limit N]
 *
 * Reads OLLAMA_URL / EMBED_MODEL / DATA_DIR from .env. Raw page text is cached
 * under $DATA_DIR/lore/pages/ so re-runs only re-embed. Output:
 *   $DATA_DIR/lore/chunks.json  { dims, model, builtAt, chunks: [{title,url,text}] }
 *   $DATA_DIR/lore/vectors.f32  Float32Array rows matching chunks
 *
 * Zero npm dependencies: plain fetch + fs.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = await loadEnv(path.join(root, '.env'))
const OLLAMA_URL = need('OLLAMA_URL')
const EMBED_MODEL = need('EMBED_MODEL')
const DATA_DIR = path.resolve(root, need('DATA_DIR'))
const LORE_DIR = path.join(DATA_DIR, 'lore')
const PAGES_DIR = path.join(LORE_DIR, 'pages')
const WIKI = 'https://wikimon.net'
const UA = 'digivice-lore-indexer/1.0 (personal project; contact via GitHub diegochagas)'

const args = process.argv.slice(2)
const REFETCH = args.includes('--refetch')
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || Infinity

const CHUNK_CHARS = 900
const CHUNK_OVERLAP = 150
const PAGE_CAP_CHARS = 45_000

// ---------------------------------------------------------------------------
// Page list
// ---------------------------------------------------------------------------
const crests = JSON.parse(await fs.readFile(path.join(root, 'src/data/crests.json'), 'utf8')).crests

/** Sprite folder names → Wikimon page titles where they differ from plain capitalisation. */
const TITLE_OVERRIDES = {
  metalgreymon: 'Metal Greymon',
  wargreymon: 'War Greymon',
  skullgreymon: 'Skull Greymon',
  weregarurumon: 'Were Garurumon',
  metalgarurumon: 'Metal Garurumon',
  atlurkabuterimon: 'Atlur Kabuterimon',
  herculeskabuterimon: 'Hercules Kabuterimon',
  holyangemon: 'Holy Angemon',
  banchostingmon: 'Bancho Stingmon',
  saintgalgomon: 'Saint Galgomon',
  jewelbeemon: 'Jewelbeemon',
}

const digimonTitles = new Set()
for (const c of crests) {
  for (const d of [...c.digimons, c.alternativeEvolution].filter(Boolean)) {
    digimonTitles.add(TITLE_OVERRIDES[d] ?? d.charAt(0).toUpperCase() + d.slice(1))
  }
}

const EXTRA_TITLES = [
  // Chosen Children / tamers
  'Yagami Taichi', 'Ishida Yamato', 'Takenouchi Sora', 'Izumi Koushirou', 'Tachikawa Mimi',
  'Kido Jou', 'Takaishi Takeru', 'Yagami Hikari', 'Motomiya Daisuke', 'Inoue Miyako',
  'Hida Iori', 'Ichijouji Ken', 'Akiyama Ryo', 'Lee Jianliang', 'Matsuda Takato', 'Makino Ruki',
  // Series and films
  'Digimon Adventure', 'Digimon Adventure 02', 'Digimon Tamers', 'Digimon Frontier',
  'Digimon Savers', 'Digimon Xros Wars', 'Digimon Adventure tri.', 'Digimon Adventure: Last Evolution Kizuna',
  'Digimon Adventure:', 'Digimon Adventure 02: The Beginning', 'Digimon Ghost Game',
  'Digimon Universe: Appli Monsters', 'Digimon Adventure (Movie)', 'Digimon Adventure: Our War Game!',
  // Concepts
  'Digimon', 'Digital World', 'Digivice', 'Crest', 'Tag', 'Digimental', 'Evolution', 'Jogress',
  'Chosen Child', 'Level', 'Attribute', 'Type', 'Field', 'X-Antibody', 'Royal Knights',
  'Seven Great Demon Lords', 'Four Holy Beasts', 'Dark Masters', 'Digimon Reference Book',
  'Digital Monster', 'Digimon Pendulum', 'Virtual Pet', 'Digimon Adventure 02: Hurricane Touchdown!! / Supreme Evolution!! The Golden Digimentals',
  'Homeostasis', 'Yggdrasill', 'File Island', 'Server Continent', 'Digitama', 'Dark Ocean',
  // Major antagonists and allies
  'Devimon', 'Etemon', 'Vamdemon', 'Venom Vamdemon', 'Apocalymon', 'Piemon', 'Metal Seadramon',
  'Pinocchimon', 'Mugendramon', 'Diablomon', 'Digimon Kaiser', 'Chimairamon', 'Archnemon',
  'Mummymon', 'Black War Greymon', 'Belial Vamdemon', 'Gennai', 'Leomon', 'Ogremon',
  'Andromon', 'Elecmon', 'Whamon', 'Pixymon', 'Wizarmon', 'Meicoomon', 'Eosmon',
  'Omegamon Alter-S', 'Imperialdramon', 'V-mon', 'Paildramon', 'Dukemon', 'Guilmon',
  'Renamon', 'Sakuyamon', 'Beelzebumon', 'Alphamon', 'Ordinemon', 'Alphamon: Ouryuken',
]

const titles = [...digimonTitles, ...EXTRA_TITLES].slice(0, LIMIT)

// ---------------------------------------------------------------------------
// Fetch + clean
// ---------------------------------------------------------------------------
await fs.mkdir(PAGES_DIR, { recursive: true })

const pages = []
let fetched = 0
for (const title of titles) {
  const slug = title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  const cacheFile = path.join(PAGES_DIR, `${slug}.json`)
  let page = null
  if (!REFETCH) {
    try {
      page = JSON.parse(await fs.readFile(cacheFile, 'utf8'))
    } catch {}
  }
  if (!page) {
    page = await fetchPage(title)
    if (!page) {
      console.warn(`  skip: ${title} (not found)`)
      continue
    }
    await fs.writeFile(cacheFile, JSON.stringify(page))
    fetched++
    await sleep(400)
  }
  pages.push(page)
  process.stdout.write(`\r  pages: ${pages.length}/${titles.length} (${fetched} fetched)   `)
}
console.log()

async function fetchPage(title) {
  const qs = new URLSearchParams({
    action: 'parse', page: title, prop: 'text|displaytitle', format: 'json',
    redirects: '1', disabletoc: '1', disableeditsection: '1',
  })
  const res = await fetch(`${WIKI}/api.php?${qs}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.parse) return null
  const html = data.parse.text['*']
  const resolvedTitle = data.parse.title
  const text = cleanHtml(html)
  if (text.length < 200) return null
  return {
    title: resolvedTitle,
    url: `${WIKI}/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
    text: text.slice(0, PAGE_CAP_CHARS),
  }
}

function cleanHtml(html) {
  let t = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<div class="(?:toc|navbox|mw-references-wrap|reflist|printfooter)[\s\S]*?<\/div>/gi, '')
    .replace(/<sup[^>]*class="reference"[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6]|table|dd|dt)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, ' | ')
    .replace(/<h([2-4])[^>]*>/gi, '\n\n## ')
    .replace(/<[^>]+>/g, ' ')
  t = decodeEntities(t)
    .replace(/\[edit\]/g, '')
    .replace(/⇨/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  // Drop trailing sections that are pure listings (galleries, references, card dumps).
  const cut = t.search(/\n## (Image Gallery|References|Additional Information|External Links|Card Game|Hyper Colosseum|Digimon Card Game)\b/)
  if (cut > 400) t = t.slice(0, cut)
  return t
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
}

// ---------------------------------------------------------------------------
// Chunk
// ---------------------------------------------------------------------------
const chunks = []
for (const page of pages) {
  const paras = page.text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0)
  let buf = ''
  for (const p of paras) {
    if (buf.length + p.length + 1 > CHUNK_CHARS && buf.length > 0) {
      chunks.push({ title: page.title, url: page.url, text: buf })
      buf = buf.slice(-CHUNK_OVERLAP).replace(/^\S*\s/, '') + ' '
    }
    buf += (buf ? '\n' : '') + p
    while (buf.length > CHUNK_CHARS * 1.5) {
      chunks.push({ title: page.title, url: page.url, text: buf.slice(0, CHUNK_CHARS) })
      buf = buf.slice(CHUNK_CHARS - CHUNK_OVERLAP)
    }
  }
  if (buf.trim().length > 40) chunks.push({ title: page.title, url: page.url, text: buf.trim() })
}
console.log(`  chunks: ${chunks.length} from ${pages.length} pages`)

// ---------------------------------------------------------------------------
// Embed
// ---------------------------------------------------------------------------
const BATCH = 32
let dims = 0
const vectors = []
for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH).map(c => `search_document: ${c.title}\n${c.text}`)
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: batch, truncate: true }),
  })
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`)
  const { embeddings } = await res.json()
  dims = embeddings[0].length
  vectors.push(...embeddings)
  process.stdout.write(`\r  embedded: ${Math.min(i + BATCH, chunks.length)}/${chunks.length}   `)
}
console.log()

const flat = new Float32Array(chunks.length * dims)
vectors.forEach((v, i) => flat.set(v, i * dims))
await fs.writeFile(path.join(LORE_DIR, 'vectors.f32'), Buffer.from(flat.buffer))
await fs.writeFile(path.join(LORE_DIR, 'chunks.json'), JSON.stringify({
  dims, model: EMBED_MODEL, builtAt: new Date().toISOString(), chunks,
}))
console.log(`  wrote ${LORE_DIR}/chunks.json and vectors.f32 (${dims} dims)`)

// ---------------------------------------------------------------------------
function need(key) {
  const v = process.env[key] ?? env[key]
  if (!v) {
    console.error(`Missing ${key}: copy .env.example to .env and fill it`)
    process.exit(1)
  }
  return v
}

async function loadEnv(file) {
  const out = {}
  try {
    for (const line of (await fs.readFile(file, 'utf8')).split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
  return out
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
