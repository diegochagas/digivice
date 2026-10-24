'use client'

import type { Lang, PublicState } from '@/lib/types'
import { t } from '../i18n'
import { LangToggle } from './lang-toggle'

export type ScreenStyle = 'pixel' | 'art'

interface SettingsPanelProps {
  state: PublicState
  lang: Lang
  ollama: boolean
  screenStyle: ScreenStyle
  onScreenStyle: (s: ScreenStyle) => void
  onLang: (l: Lang) => void
  onReset: () => void
}

function ScreenStylePicker({ value, lang, onChange }: { value: ScreenStyle; lang: Lang; onChange: (s: ScreenStyle) => void }) {
  return (
    <div className="flex gap-1">
      {(['pixel', 'art'] as const).map(st => (
        <button key={st} className={`btn !px-3 !py-1 text-xs ${value === st ? 'btn-sky' : ''}`} onClick={() => onChange(st)}>
          {st === 'pixel' ? t(lang, 'screenPixel') : t(lang, 'screenArt')}
        </button>
      ))}
    </div>
  )
}

export function SettingsPanel({ state, lang, ollama, screenStyle, onScreenStyle, onLang, onReset }: SettingsPanelProps) {
  return (
    <section className="panel w-full p-3 flex flex-col gap-3 text-sm">
      <div className="font-semibold">{t(lang, 'settings')}</div>
      <div className="flex items-center justify-between">
        <span>{t(lang, 'language')}</span>
        <LangToggle lang={lang} onChange={onLang} />
      </div>
      <div className="flex items-center justify-between">
        <span>{t(lang, 'screen')}</span>
        <ScreenStylePicker value={screenStyle} lang={lang} onChange={onScreenStyle} />
      </div>
      <div className="text-xs text-slate-400 flex flex-col gap-1">
        <span>{t(lang, 'lore')}: {state.loreReady ? t(lang, 'ready') : t(lang, 'missing')}</span>
        <span>{t(lang, 'web')}: {state.searchEnabled ? t(lang, 'on') : t(lang, 'off')}</span>
        <span>Ollama: {ollama ? 'ok' : 'offline'}</span>
        <span>🍖 {state.stats.meals} · ⚽ {state.stats.plays} · 💬 {state.stats.chats}</span>
      </div>
      <button className="btn text-xs self-start text-red-300" onClick={() => { if (confirm(t(lang, 'resetConfirm'))) onReset() }}>
        {t(lang, 'reset')}
      </button>
    </section>
  )
}
