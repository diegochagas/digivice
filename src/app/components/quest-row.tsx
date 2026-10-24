'use client'

import { crestInfo } from '@/lib/crests'
import type { Quest } from '@/lib/quests/types'

export function CrestChip({ crest }: { crest: string | null }) {
  const info = crestInfo(crest)
  if (!info) return null
  return (
    <span className="text-[10px] rounded-full px-1.5 py-0.5 leading-none" style={{ background: info.background, color: '#1a1200' }} title={info.name}>
      {info.glyph} {info.name}
    </span>
  )
}

interface HabitRowProps {
  quest: Quest
  disabled: boolean
  onScore: (direction: 'up' | 'down') => void
  onDelete: () => void
}

export function HabitRow({ quest, disabled, onScore, onDelete }: HabitRowProps) {
  return (
    <div className="flex items-center gap-2">
      <button className="btn !px-2.5 !py-0.5 text-xs" disabled={disabled} onClick={() => onScore('down')} aria-label={`${quest.text}: slipped`}>−</button>
      <div className="flex-1 min-w-0">
        <div className="truncate">{quest.text}</div>
        <div className="flex gap-2 items-center text-[11px] text-slate-400">
          <CrestChip crest={quest.crest} />
          <span>+{quest.scoredUp} / −{quest.scoredDown}</span>
        </div>
      </div>
      <button className="btn btn-accent !px-2.5 !py-0.5 text-xs" disabled={disabled} onClick={() => onScore('up')} aria-label={`${quest.text}: done`}>+</button>
      <button className="text-slate-500 hover:text-red-300" onClick={onDelete} aria-label={`delete ${quest.text}`}>✕</button>
    </div>
  )
}

interface CheckRowProps {
  quest: Quest
  done: boolean
  due: boolean
  streakLabel: string
  disabled: boolean
  onToggle: () => void
  onDelete: () => void
}

export function CheckRow({ quest, done, due, streakLabel, disabled, onToggle, onDelete }: CheckRowProps) {
  return (
    <div className={`flex items-center gap-2 ${due ? '' : 'opacity-50'}`}>
      <input type="checkbox" className="w-4 h-4" checked={done} disabled={disabled} onChange={onToggle} aria-label={quest.text} />
      <div className="flex-1 min-w-0">
        <div className={`truncate ${done ? 'line-through text-slate-500' : ''}`}>{quest.text}</div>
        <div className="flex gap-2 items-center text-[11px] text-slate-400">
          <CrestChip crest={quest.crest} />
          {quest.kind === 'daily' && <span>🔥 {quest.streak} {streakLabel}</span>}
          <span className="uppercase tracking-wide">{quest.difficulty}</span>
        </div>
      </div>
      <button className="text-slate-500 hover:text-red-300" onClick={onDelete} aria-label={`delete ${quest.text}`}>✕</button>
    </div>
  )
}
