'use client'

import { t } from '../i18n'
import type { Lang, PublicState } from '@/lib/types'

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

function BondBar({ state, lang }: { state: PublicState; lang: Lang }) {
  const target = state.nextEvolutionAt
  const gate = state.crestGate
  const gateText = gate && gate.current < gate.required ? ` · ${t(lang, 'crestGateShort')} ${gate.current}/${gate.required}` : ''
  return (
    <div className="col-span-2">
      <div className="flex justify-between mb-1">
        <span>{t(lang, 'bond')}</span>
        <span className="text-slate-400">
          {state.bond} XP{target !== null ? ` · ${t(lang, 'nextEvo')} ${target}${gateText}` : ` · ${t(lang, 'maxEvo')}`}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${target ? Math.min(100, (state.bond / target) * 100) : 100}%`, background: '#f5a524' }} />
      </div>
    </div>
  )
}

export function StatsPanel({ state, lang }: { state: PublicState; lang: Lang }) {
  return (
    <section className="panel w-full p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <Stat label={t(lang, 'hunger')} value={100 - state.hunger} color="#f97316" />
      <Stat label={t(lang, 'energy')} value={state.energy} color="#38bdf8" />
      <Stat label={t(lang, 'happiness')} value={state.happiness} color="#f472b6" />
      <div>
        <div className="flex justify-between mb-1">
          <span>{t(lang, 'bits')}</span>
          <span className="text-amber-300 font-semibold">{state.bits} ₿</span>
        </div>
        <div className="text-[11px] text-slate-400">🔥 {t(lang, 'crestStreak')}: {state.crestStreaks[state.crest ?? '']?.current ?? 0}</div>
      </div>
      <BondBar state={state} lang={lang} />
    </section>
  )
}
