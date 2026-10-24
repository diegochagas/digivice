'use client'

import { CRESTS } from '@/lib/crests'
import { t } from '../i18n'
import type { Lang, PublicState } from '@/lib/types'

const GLOW_FROM = 3

interface CrestsPanelProps {
  state: PublicState
  lang: Lang
}

function CrestCard({ name, glyph, fill, background, current, best, partner }: { name: string; glyph: string; fill: string; background: string; current: number; best: number; partner: boolean }) {
  const glowing = current >= GLOW_FROM
  return (
    <div className="rounded-xl p-2 flex items-center gap-2 border" style={{ borderColor: partner ? '#f5a524' : 'rgba(255,255,255,0.08)', background: glowing ? `color-mix(in srgb, ${background} 35%, transparent)` : 'rgba(0,0,0,0.2)', boxShadow: glowing ? `0 0 14px ${background}` : 'none' }}>
      <div className="w-9 h-9 rounded-full grid place-items-center text-lg" style={{ background: glowing ? background : fill, opacity: glowing ? 1 : 0.6 }}>{glyph}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold capitalize truncate">{name}{partner ? ' ★' : ''}</div>
        <div className="text-[11px] text-slate-300">🔥 {current} · {best}</div>
      </div>
    </div>
  )
}

export function CrestsPanel({ state, lang }: CrestsPanelProps) {
  const gate = state.crestGate
  return (
    <section className="panel w-full p-3 flex flex-col gap-2 text-sm">
      <div className="font-semibold">{t(lang, 'crests')}</div>
      <p className="text-xs text-slate-300">{t(lang, 'crestsHint')}</p>
      {gate && gate.required > 0 && (
        <p className="text-xs text-amber-300">
          {t(lang, 'crestGate')}: {gate.current}/{gate.required} {t(lang, 'days')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {CRESTS.map(c => {
          const streak = state.crestStreaks[c.name]
          return <CrestCard key={c.name} {...c} current={streak?.current ?? 0} best={streak?.best ?? 0} partner={c.name === state.crest} />
        })}
      </div>
    </section>
  )
}
