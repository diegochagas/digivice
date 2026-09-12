'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DigiviceScreen } from './components/digivice-screen'
import type { PixelEvent } from './components/pixel-digimon'
import { getPixelSprite } from '@/lib/pixel-sprites'
import type { AnimName } from '@/lib/pixel-anim'
import { t } from './i18n'
import type { Emotion, Lang, LineInfo, PublicState } from '@/lib/types'

interface LineWithPersona extends LineInfo {
  persona: { summary: string; partner: string; crest: string } | null
}

interface StateResponse {
  state: PublicState | null
  lines?: LineWithPersona[]
  ollama: boolean
}

const IDLE_REMARK_MS = 12 * 60_000
const POLL_MS = 60_000

function displayName(d: string) {
  const special: Record<string, string> = {
    metalgreymon: 'MetalGreymon', wargreymon: 'WarGreymon', skullgreymon: 'SkullGreymon',
    weregarurumon: 'WereGarurumon', metalgarurumon: 'MetalGarurumon', atlurkabuterimon: 'AtlurKabuterimon',
    herculeskabuterimon: 'HerculesKabuterimon', holyangemon: 'HolyAngemon', banchostingmon: 'BanchoStingmon',
    saintgalgomon: 'SaintGalgomon',
  }
  return special[d] ?? d.charAt(0).toUpperCase() + d.slice(1)
}

export default function Home() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [pickIndex, setPickIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [bubble, setBubble] = useState<{ text: string; emotion: Emotion; meta?: string } | null>(null)
  const [reaction, setReaction] = useState<Emotion | null>(null)
  const [input, setInput] = useState('')
  const [panel, setPanel] = useState<'chat' | 'tasks' | 'memories' | 'settings'>('chat')
  const [error, setError] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')
  const [screenStyle, setScreenStyle] = useState<'pixel' | 'art'>('pixel')
  const [pixelEvent, setPixelEvent] = useState<PixelEvent | null>(null)
  const seenEvolution = useRef<string | null>(null)
  const lastInteraction = useRef(Date.now())
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const state = data?.state ?? null

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      const json = (await res.json()) as StateResponse
      setData(json)
      if (json.state) setLang(json.state.lang)
      setError(null)
    } catch {
      setError('network')
    }
  }, [])

  useEffect(() => {
    refresh()
    try {
      const saved = localStorage.getItem('lang')
      if (saved === 'pt' || saved === 'en') setLang(saved)
      const style = localStorage.getItem('screenStyle')
      if (style === 'art' || style === 'pixel') setScreenStyle(style)
    } catch {}
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [state?.history?.length, bubble])

  const showReaction = useCallback((emotion: Emotion, ms = 25_000) => {
    setReaction(emotion)
    if (reactionTimer.current) clearTimeout(reactionTimer.current)
    reactionTimer.current = setTimeout(() => setReaction(null), ms)
  }, [])

  const act = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true)
    lastInteraction.current = Date.now()
    try {
      const res = await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (json.state) setData(d => ({ ollama: d?.ollama ?? true, ...d, state: json.state }))
      if (json.error) setError(json.error)
      return json
    } finally {
      setBusy(false)
    }
  }, [])

  const say = useCallback(async (message: string | null) => {
    if (busy) return
    setBusy(true)
    lastInteraction.current = Date.now()
    setBubble({ text: '', emotion: 'thinking' })
    showReaction('thinking', 120_000)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      const json = await res.json()
      if (json.error) {
        setError(json.error)
        setBubble(null)
        setReaction(null)
        return
      }
      setData(d => ({ ollama: true, ...d, state: json.state }))
      setBubble({
        text: json.reply,
        emotion: json.emotion,
        meta: json.searched ? `${t(lang, 'searching')} "${json.searched}"` : undefined,
      })
      showReaction(json.emotion)
      setError(null)
    } catch {
      setError('network')
      setBubble(null)
      setReaction(null)
    } finally {
      setBusy(false)
    }
  }, [busy, lang, showReaction])

  // Pending evolution: in LCD mode play the flicker transition; in art mode with no clip, acknowledge right away.
  useEffect(() => {
    const evo = state?.pendingEvolution
    if (!evo) return
    if (screenStyle === 'pixel') {
      const key = `${evo.from}>${evo.to}`
      if (seenEvolution.current === key) return
      seenEvolution.current = key
      setPixelEvent({ anim: 'evolve', target: getPixelSprite(evo.to), id: Date.now() })
    } else if (!state?.evolutionVideo) {
      act({ action: 'evolution_seen' })
    }
  }, [state?.pendingEvolution, state?.evolutionVideo, screenStyle, act])

  function changeScreenStyle(next: 'pixel' | 'art') {
    setScreenStyle(next)
    try { localStorage.setItem('screenStyle', next) } catch {}
  }

  function onPixelEventEnd(e: PixelEvent) {
    if (e.anim === 'evolve') act({ action: 'evolution_seen' })
    setPixelEvent(null)
  }

  // Spontaneous feelings while the page is open and idle.
  useEffect(() => {
    const id = setInterval(() => {
      if (!state || state.sleeping || busy || document.hidden) return
      if (Date.now() - lastInteraction.current < IDLE_REMARK_MS) return
      say(null)
    }, 60_000)
    return () => clearInterval(id)
  }, [state, busy, say])

  function changeLang(next: Lang) {
    setLang(next)
    try { localStorage.setItem('lang', next) } catch {}
    if (state) act({ action: 'lang', lang: next })
  }

  // ------------------------------------------------------------------ choose
  if (data && !state) {
    const lines = data.lines ?? []
    const line = lines[pickIndex]
    const baby = line?.digimons[0]
    const child = line?.digimons[1]
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold drop-shadow">{t(lang, 'chooseTitle')}</h1>
        <p className="text-sm text-slate-200 text-center max-w-xs">{t(lang, 'chooseHint')}</p>
        <DigiviceScreen
          imageSrc={line ? `/images/${line.crest}/${child}.png` : null}
          alt={child ?? ''}
          evolutionVideo={null}
          pixel={screenStyle === 'pixel' ? { sprite: getPixelSprite(child), mood: 'happy', event: null, onEventEnd: () => undefined } : null}
          onLeftButton={() => act({ action: 'choose', crest: line.crest, lang }).then(refresh)}
          onTopRight={() => setPickIndex(i => (i - 1 + lines.length) % lines.length)}
          onBottomRight={() => setPickIndex(i => (i + 1) % lines.length)}
          leftLabel={t(lang, 'confirm')}
          topRightLabel="previous crest"
          bottomRightLabel="next crest"
        />
        {line && (
          <div className="panel p-4 w-full max-w-sm text-center">
            <div className="text-xs uppercase tracking-widest text-amber-300">Crest of {line.persona?.crest ?? line.crest}</div>
            <div className="text-xl font-bold mt-1">{displayName(baby)} → {displayName(child)}</div>
            <div className="text-xs text-slate-400 mt-1">{line.digimons.map(displayName).join(' → ')}</div>
            <p className="text-sm mt-3 text-slate-200">{line.persona?.summary}</p>
            <div className="flex gap-2 justify-center mt-4">
              <button className="btn" onClick={() => setPickIndex(i => (i - 1 + lines.length) % lines.length)}>◀</button>
              <button className="btn btn-accent" disabled={busy} onClick={() => act({ action: 'choose', crest: line.crest, lang }).then(refresh)}>{t(lang, 'confirm')}</button>
              <button className="btn" onClick={() => setPickIndex(i => (i + 1) % lines.length)}>▶</button>
            </div>
          </div>
        )}
        <LangToggle lang={lang} onChange={changeLang} />
      </main>
    )
  }

  if (!state) {
    return <main className="min-h-screen flex items-center justify-center text-slate-300">{error ? t(lang, 'offline') : '...'}</main>
  }

  function feed() {
    if (busy || state?.sleeping) return
    setPixelEvent({ anim: 'eat', id: Date.now() })
    act({ action: 'feed' }).then(() => showReaction('happy', 8000))
  }

  function play() {
    if (busy || state?.sleeping) return
    setPixelEvent({ anim: 'play', id: Date.now() })
    act({ action: 'play' }).then(() => showReaction('excited', 8000))
  }

  function submitMessage() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    say(msg)
  }

  // ------------------------------------------------------------------ main
  const shown: Emotion = reaction ?? state.idleEmotion
  const imageSrc = state.digimon && state.reactions.includes(shown)
    ? `/images/reactions/${state.digimon}/${shown}.png`
    : state.imageSrc
  const openTodos = state.todos.filter(td => !td.done)
  const mood: AnimName = state.sleeping ? 'sleep' : shown
  // During the evolution flicker the sprite shown is still the old form; the new one appears at the end.
  const pixelForm = pixelEvent?.anim === 'evolve' && state.pendingEvolution ? state.pendingEvolution.from : state.digimon

  return (
    <main className="min-h-screen flex flex-col items-center gap-3 p-3 pb-6 max-w-md mx-auto">
      <header className="w-full flex items-center justify-between px-1 pt-1">
        <div>
          <div className="text-lg font-bold leading-tight">{state.displayName}</div>
          <div className="text-xs text-slate-300">{t(lang, 'stage')}: {state.stageName} · Crest of {state.crest}</div>
        </div>
        <div className="flex gap-1">
          {(['chat', 'tasks', 'memories', 'settings'] as const).map(p => (
            <button
              key={p}
              className={`btn !px-3 !py-1 text-xs ${panel === p ? 'btn-sky' : ''}`}
              onClick={() => setPanel(p)}
            >
              {p === 'chat' ? '💬' : p === 'tasks' ? `✅${openTodos.length ? ' ' + openTodos.length : ''}` : p === 'memories' ? '🧠' : '⚙️'}
            </button>
          ))}
        </div>
      </header>

      <DigiviceScreen
        imageSrc={imageSrc}
        alt={state.displayName ?? ''}
        sleeping={state.sleeping}
        evolutionVideo={state.evolutionVideo}
        onEvolutionEnd={() => act({ action: 'evolution_seen' })}
        onLeftButton={() => (state.sleeping ? act({ action: 'wake' }) : say(null))}
        onTopRight={() => feed()}
        onBottomRight={() => play()}
        pixel={screenStyle === 'pixel' ? { sprite: getPixelSprite(pixelForm), mood, event: pixelEvent, onEventEnd: onPixelEventEnd } : null}
        leftLabel={state.sleeping ? t(lang, 'wake') : t(lang, 'talk')}
        topRightLabel={t(lang, 'feed')}
        bottomRightLabel={t(lang, 'play')}
      />

      {(bubble || state.sleeping) && (
        <div className="w-full">
          <div className="bubble">
            {bubble?.text === '' ? (
              <span className="typing"><span /><span /><span /></span>
            ) : (
              bubble?.text ?? t(lang, 'asleepHint')
            )}
            {bubble?.meta && <div className="text-[11px] text-slate-500 mt-1">🔎 {bubble.meta}</div>}
          </div>
        </div>
      )}

      {error && (
        <div className="w-full text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-3 py-2">
          {error === 'network' || /ollama|fetch/i.test(error) ? t(lang, 'offline') : error}
        </div>
      )}

      <section className="panel w-full p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Stat label={t(lang, 'hunger')} value={100 - state.hunger} color="#f97316" />
        <Stat label={t(lang, 'energy')} value={state.energy} color="#38bdf8" />
        <Stat label={t(lang, 'happiness')} value={state.happiness} color="#f472b6" />
        <div className="col-span-2">
          <div className="flex justify-between mb-1">
            <span>{t(lang, 'bond')}</span>
            <span className="text-slate-400">
              {state.bond} XP{state.nextEvolutionAt !== null ? ` · ${t(lang, 'nextEvo')} ${state.nextEvolutionAt}` : ` · ${t(lang, 'maxEvo')}`}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${state.nextEvolutionAt ? Math.min(100, (state.bond / state.nextEvolutionAt) * 100) : 100}%`, background: '#f5a524' }} />
          </div>
        </div>
      </section>

      <section className="w-full flex gap-2">
        <button className="btn flex-1" disabled={busy || state.sleeping} onClick={feed}>🍖 {t(lang, 'feed')}</button>
        <button className="btn flex-1" disabled={busy || state.sleeping} onClick={play}>⚽ {t(lang, 'play')}</button>
        <button className="btn flex-1" disabled={busy} onClick={() => act({ action: state.sleeping ? 'wake' : 'sleep' })}>
          {state.sleeping ? `☀️ ${t(lang, 'wake')}` : `🌙 ${t(lang, 'sleep')}`}
        </button>
      </section>

      {panel === 'chat' && (
        <section className="panel w-full p-3 flex flex-col gap-2">
          <div ref={logRef} className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 text-sm">
            {state.history.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-1.5 ${m.role === 'user' ? 'self-end bg-sky-500/30' : 'self-start bg-white/10'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              submitMessage()
            }}
          >
            <input
              className="flex-1 rounded-full bg-black/30 border border-white/10 px-4 py-2 text-sm outline-none focus:border-sky-400"
              placeholder={t(lang, 'placeholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitMessage()
                }
              }}
              enterKeyHint="send"
              disabled={busy}
            />
            <button className="btn btn-accent" disabled={busy || !input.trim()}>{busy ? '…' : t(lang, 'send')}</button>
          </form>
          <button className="btn text-xs self-start" disabled={busy || state.sleeping} onClick={() => say(null)}>💭 {t(lang, 'talk')}</button>
        </section>
      )}

      {panel === 'tasks' && (
        <section className="panel w-full p-3 flex flex-col gap-2 text-sm">
          <div className="font-semibold">{t(lang, 'tasks')}</div>
          {state.todos.length === 0 && <div className="text-slate-400 text-xs">{t(lang, 'noTasks')}</div>}
          {state.todos.map(td => (
            <div key={td.id} className="flex items-center gap-2">
              <input type="checkbox" checked={td.done} onChange={() => act({ action: 'todo_toggle', id: td.id })} />
              <span className={`flex-1 ${td.done ? 'line-through text-slate-500' : ''}`}>{td.text}</span>
              <button className="text-slate-500 hover:text-red-300" onClick={() => act({ action: 'todo_delete', id: td.id })}>✕</button>
            </div>
          ))}
          <form
            className="flex gap-2 mt-1"
            onSubmit={e => {
              e.preventDefault()
              if (!newTask.trim()) return
              act({ action: 'todo_add', text: newTask.trim() })
              setNewTask('')
            }}
          >
            <input className="flex-1 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-xs outline-none" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder={t(lang, 'addTask')} />
            <button className="btn !py-1 text-xs">+</button>
          </form>
        </section>
      )}

      {panel === 'memories' && (
        <section className="panel w-full p-3 flex flex-col gap-2 text-sm">
          <div className="font-semibold">{t(lang, 'memories')}</div>
          {state.memories.length === 0 && <div className="text-slate-400 text-xs">{t(lang, 'noMemories')}</div>}
          {state.memories.map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-1">{m}</span>
              <button className="text-slate-500 hover:text-red-300" onClick={() => act({ action: 'forget', index: i })}>✕</button>
            </div>
          ))}
        </section>
      )}

      {panel === 'settings' && (
        <section className="panel w-full p-3 flex flex-col gap-3 text-sm">
          <div className="font-semibold">{t(lang, 'settings')}</div>
          <div className="flex items-center justify-between">
            <span>{t(lang, 'language')}</span>
            <LangToggle lang={lang} onChange={changeLang} />
          </div>
          <div className="flex items-center justify-between">
            <span>{t(lang, 'screen')}</span>
            <div className="flex gap-1">
              {(['pixel', 'art'] as const).map(st => (
                <button key={st} className={`btn !px-3 !py-1 text-xs ${screenStyle === st ? 'btn-sky' : ''}`} onClick={() => changeScreenStyle(st)}>
                  {st === 'pixel' ? t(lang, 'screenPixel') : t(lang, 'screenArt')}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-400 flex flex-col gap-1">
            <span>{t(lang, 'lore')}: {state.loreReady ? t(lang, 'ready') : t(lang, 'missing')}</span>
            <span>{t(lang, 'web')}: {state.searchEnabled ? t(lang, 'on') : t(lang, 'off')}</span>
            <span>Ollama: {data?.ollama ? 'ok' : 'offline'}</span>
            <span>🍖 {state.stats.meals} · ⚽ {state.stats.plays} · 💬 {state.stats.chats}</span>
          </div>
          <button
            className="btn text-xs self-start text-red-300"
            onClick={() => {
              if (confirm(t(lang, 'resetConfirm'))) act({ action: 'reset' }).then(() => { setBubble(null); setReaction(null) })
            }}
          >
            {t(lang, 'reset')}
          </button>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="text-slate-400">{Math.round(value)}%</span>
      </div>
      <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>
    </div>
  )
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex gap-1">
      {(['en', 'pt'] as const).map(l => (
        <button key={l} className={`btn !px-3 !py-1 text-xs ${lang === l ? 'btn-sky' : ''}`} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
