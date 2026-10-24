'use client'

import { useState } from 'react'
import { CRESTS } from '@/lib/crests'
import { DIFFICULTIES, type Difficulty, type QuestDraft, type QuestKind, type Weekday } from '@/lib/quests/types'
import { t } from '../i18n'
import type { Lang } from '@/lib/types'

const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

interface QuestFormProps {
  kind: QuestKind
  lang: Lang
  disabled: boolean
  onAdd: (draft: QuestDraft) => void
}

function WeekdayPicker({ value, lang, onChange }: { value: Weekday[]; lang: Lang; onChange: (w: Weekday[]) => void }) {
  const letters = t(lang, 'weekdayLetters')
  const toggle = (d: Weekday) => onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d])
  return (
    <div className="flex gap-1" role="group" aria-label={t(lang, 'weekdays')}>
      {WEEKDAYS.map(d => (
        <button type="button" key={d} className={`btn !px-0 w-7 !py-1 text-[11px] ${value.includes(d) ? 'btn-sky' : ''}`} onClick={() => toggle(d)} aria-pressed={value.includes(d)}>
          {letters[d]}
        </button>
      ))}
      <span className="text-[11px] text-slate-400 self-center ml-1">{value.length === 0 ? t(lang, 'everyDay') : ''}</span>
    </div>
  )
}

export function QuestForm({ kind, lang, disabled, onAdd }: QuestFormProps) {
  const [text, setText] = useState('')
  const [crest, setCrest] = useState<string>('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [weekdays, setWeekdays] = useState<Weekday[]>([])

  function submit() {
    if (!text.trim()) return
    onAdd({ kind, text: text.trim(), crest: crest || null, difficulty, weekdays })
    setText('')
  }

  return (
    <form className="flex flex-col gap-2 mt-1 border-t border-white/10 pt-2" onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="flex gap-2">
        <input className="flex-1 rounded-full bg-black/30 border border-white/10 px-3 py-1.5 text-xs outline-none" value={text} onChange={e => setText(e.target.value)} placeholder={t(lang, 'addQuest')} aria-label={t(lang, 'addQuest')} disabled={disabled} />
        <button className="btn !py-1 text-xs" disabled={disabled || !text.trim()}>+</button>
      </div>
      <div className="flex gap-2 flex-wrap text-xs">
        <select className="rounded-full bg-black/30 border border-white/10 px-2 py-1 text-xs" value={crest} onChange={e => setCrest(e.target.value)} aria-label={t(lang, 'crest')}>
          <option value="">{t(lang, 'noCrest')}</option>
          {CRESTS.map(c => <option key={c.name} value={c.name}>{c.glyph} {c.name}</option>)}
        </select>
        <select className="rounded-full bg-black/30 border border-white/10 px-2 py-1 text-xs" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} aria-label={t(lang, 'difficulty')}>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{t(lang, d)}</option>)}
        </select>
      </div>
      {kind === 'daily' && <WeekdayPicker value={weekdays} lang={lang} onChange={setWeekdays} />}
    </form>
  )
}
