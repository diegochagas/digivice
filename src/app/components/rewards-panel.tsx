'use client'

import { useState } from 'react'
import type { Reward } from '@/lib/quests/types'
import { t } from '../i18n'
import type { Lang } from '@/lib/types'

interface RewardsPanelProps {
  rewards: Reward[]
  bits: number
  lang: Lang
  disabled: boolean
  act: (body: Record<string, unknown>) => void
}

function RewardRow({ reward, bits, lang, disabled, act }: { reward: Reward } & Omit<RewardsPanelProps, 'rewards'>) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="truncate">{reward.text}</div>
        <div className="text-[11px] text-slate-400">{t(lang, 'bought')} {reward.bought}×</div>
      </div>
      <button className="btn btn-accent !px-3 !py-0.5 text-xs" disabled={disabled || bits < reward.cost} onClick={() => act({ action: 'reward_buy', id: reward.id })}>
        {t(lang, 'buy')} · {reward.cost} ₿
      </button>
      <button className="text-slate-500 hover:text-red-300" onClick={() => act({ action: 'reward_delete', id: reward.id })} aria-label={`delete ${reward.text}`}>✕</button>
    </div>
  )
}

export function RewardsPanel({ rewards, bits, lang, disabled, act }: RewardsPanelProps) {
  const [text, setText] = useState('')
  const [costText, setCostText] = useState('20')

  function submit() {
    if (!text.trim()) return
    act({ action: 'reward_add', text: text.trim(), cost: Math.max(1, Math.round(Number(costText)) || 1) })
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-slate-300">{t(lang, 'bitsHint')} <b>{bits} ₿</b></div>
      {rewards.length === 0 && <div className="text-slate-400 text-xs">{t(lang, 'noRewards')}</div>}
      {rewards.map(r => <RewardRow key={r.id} reward={r} bits={bits} lang={lang} disabled={disabled} act={act} />)}
      <form className="flex gap-2 mt-1 border-t border-white/10 pt-2" onSubmit={e => { e.preventDefault(); submit() }}>
        <input className="flex-1 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-xs outline-none" value={text} onChange={e => setText(e.target.value)} placeholder={t(lang, 'addReward')} aria-label={t(lang, 'addReward')} />
        <input className="w-16 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-xs outline-none" type="number" min={1} value={costText} onChange={e => setCostText(e.target.value)} aria-label={t(lang, 'cost')} />
        <button className="btn !py-1 text-xs" disabled={disabled || !text.trim()}>+</button>
      </form>
    </div>
  )
}
