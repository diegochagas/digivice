'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DigiviceScreen } from './components/digivice-screen'
import { QuestsPanel } from './components/quests-panel'
import { CrestsPanel } from './components/crests-panel'
import { StatsPanel } from './components/stats-panel'
import { RolloverBanner } from './components/rollover-banner'
import { ChatPanel } from './components/chat-panel'
import { MemoriesPanel } from './components/memories-panel'
import { SettingsPanel, type ScreenStyle } from './components/settings-panel'
import { ChoosePartner, type LineWithPersona } from './components/choose-partner'
import { dayKey } from '@/lib/quests/dates'
import { isDoneOn, isDueOn } from '@/lib/quests/dates'
import type { PixelEvent } from './components/pixel-digimon'
import { getPixelSprite } from '@/lib/pixel-sprites'
import type { AnimName } from '@/lib/pixel-anim'
import { t } from './i18n'
import type { Emotion, Lang, PublicState } from '@/lib/types'

interface StateResponse {
  state: PublicState | null
  lines?: LineWithPersona[]
  ollama: boolean
}

const IDLE_REMARK_MS = 12 * 60_000
const POLL_MS = 60_000
const PANEL_ICONS = { chat: '💬', quests: '✅', crests: '🔥', memories: '🧠', settings: '⚙️' } as const

export default function Home() {
  const [data, setData] = useState<StateResponse | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [busy, setBusy] = useState(false)
  const [bubble, setBubble] = useState<{ text: string; emotion: Emotion; meta?: string } | null>(null)
  const [reaction, setReaction] = useState<Emotion | null>(null)
  const [panel, setPanel] = useState<'chat' | 'quests' | 'crests' | 'memories' | 'settings'>('chat')
  const [error, setError] = useState<string | null>(null)
  const [screenStyle, setScreenStyle] = useState<ScreenStyle>('pixel')
  const [pixelEvent, setPixelEvent] = useState<PixelEvent | null>(null)
  const seenEvolution = useRef<string | null>(null)
  const lastInteraction = useRef(Date.now())
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function changeScreenStyle(next: ScreenStyle) {
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

  if (data && !state) {
    return (
      <ChoosePartner
        lines={data.lines ?? []}
        lang={lang}
        busy={busy}
        screenStyle={screenStyle}
        onChoose={crest => act({ action: 'choose', crest, lang }).then(refresh)}
        onLang={changeLang}
      />
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

  // ------------------------------------------------------------------ main
  const shown: Emotion = reaction ?? state.idleEmotion
  const imageSrc = state.digimon && state.reactions.includes(shown)
    ? `/images/reactions/${state.digimon}/${shown}.png`
    : state.imageSrc
  const today = dayKey(Date.now())
  const openQuests = state.quests.filter(q => (q.kind === 'daily' && isDueOn(q, today) && !isDoneOn(q, today)) || (q.kind === 'todo' && !q.done))
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
          {(['chat', 'quests', 'crests', 'memories', 'settings'] as const).map(p => (
            <button
              key={p}
              className={`btn !px-3 !py-1 text-xs ${panel === p ? 'btn-sky' : ''}`}
              onClick={() => setPanel(p)}
            >
              {PANEL_ICONS[p]}{p === 'quests' && openQuests.length ? ` ${openQuests.length}` : ''}
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

      <RolloverBanner report={state.lastRollover} lang={lang} onDismiss={() => act({ action: 'rollover_seen' })} />

      <StatsPanel state={state} lang={lang} />

      <section className="w-full flex gap-2">
        <button className="btn flex-1" disabled={busy || state.sleeping} onClick={feed}>🍖 {t(lang, 'feed')}</button>
        <button className="btn flex-1" disabled={busy || state.sleeping} onClick={play}>⚽ {t(lang, 'play')}</button>
        <button className="btn flex-1" disabled={busy} onClick={() => act({ action: state.sleeping ? 'wake' : 'sleep' })}>
          {state.sleeping ? `☀️ ${t(lang, 'wake')}` : `🌙 ${t(lang, 'sleep')}`}
        </button>
      </section>

      {panel === 'chat' && (
        <ChatPanel history={state.history} lang={lang} busy={busy} sleeping={state.sleeping} onSend={say} onTalk={() => say(null)} />
      )}

      {panel === 'quests' && <QuestsPanel state={state} today={today} lang={lang} disabled={busy} act={act} />}

      {panel === 'crests' && <CrestsPanel state={state} lang={lang} />}

      {panel === 'memories' && <MemoriesPanel memories={state.memories} lang={lang} onForget={index => act({ action: 'forget', index })} />}

      {panel === 'settings' && (
        <SettingsPanel
          state={state}
          lang={lang}
          ollama={data?.ollama ?? false}
          screenStyle={screenStyle}
          onScreenStyle={changeScreenStyle}
          onLang={changeLang}
          onReset={() => act({ action: 'reset' }).then(() => { setBubble(null); setReaction(null) })}
        />
      )}
    </main>
  )
}
