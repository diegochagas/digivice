'use client'

import { useState } from 'react'
import { isDoneOn, isDueOn } from '@/lib/quests/dates'
import type { Quest, QuestDraft, QuestKind } from '@/lib/quests/types'
import type { Lang, PublicState } from '@/lib/types'
import { t, type StringKey } from '../i18n'
import { QuestForm } from './quest-form'
import { CheckRow, HabitRow } from './quest-row'
import { RewardsPanel } from './rewards-panel'

type Tab = QuestKind | 'rewards'
const TABS: { id: Tab; label: StringKey; icon: string }[] = [
  { id: 'habit', label: 'habits', icon: '🔁' },
  { id: 'daily', label: 'dailies', icon: '📅' },
  { id: 'todo', label: 'todos', icon: '✅' },
  { id: 'rewards', label: 'rewards', icon: '🎁' },
]

interface QuestsPanelProps {
  state: PublicState
  /** Local day key computed by the caller at render time, so it never goes stale across midnight. */
  today: string
  lang: Lang
  disabled: boolean
  act: (body: Record<string, unknown>) => void
}

/** Dailies due today first, then the rest; to-dos open first, done last. */
function sortForTab(quests: Quest[], kind: QuestKind, today: string): Quest[] {
  const list = quests.filter(q => q.kind === kind)
  if (kind === 'daily') return [...list].sort((a, b) => Number(isDueOn(b, today)) - Number(isDueOn(a, today)))
  if (kind === 'todo') return [...list].sort((a, b) => Number(a.done) - Number(b.done))
  return list
}

function QuestList({ quests, kind, today, lang, disabled, act }: QuestsPanelProps & { quests: Quest[]; kind: QuestKind }) {
  if (quests.length === 0) return <div className="text-slate-400 text-xs">{t(lang, 'noQuests')}</div>
  return (
    <>
      {quests.map(q => kind === 'habit' ? (
        <HabitRow key={q.id} quest={q} disabled={disabled} onScore={direction => act({ action: 'quest_score', id: q.id, direction })} onDelete={() => act({ action: 'quest_delete', id: q.id })} />
      ) : (
        <CheckRow key={q.id} quest={q} done={isDoneOn(q, today)} due={q.kind !== 'daily' || isDueOn(q, today)} streakLabel={t(lang, 'streak')} disabled={disabled} onToggle={() => act({ action: 'quest_toggle', id: q.id })} onDelete={() => act({ action: 'quest_delete', id: q.id })} />
      ))}
    </>
  )
}

export function QuestsPanel(props: QuestsPanelProps) {
  const { state, today, lang, disabled, act } = props
  const [tab, setTab] = useState<Tab>('daily')
  const onAdd = (draft: QuestDraft) => act({ action: 'quest_add', ...draft })

  return (
    <section className="panel w-full p-3 flex flex-col gap-2 text-sm">
      <div className="flex gap-1" role="tablist">
        {TABS.map(tb => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} className={`btn flex-1 !px-2 !py-1 text-xs ${tab === tb.id ? 'btn-sky' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.icon} {t(lang, tb.label)}
          </button>
        ))}
      </div>
      {tab === 'rewards' ? (
        <RewardsPanel rewards={state.rewards} bits={state.bits} lang={lang} disabled={disabled} act={act} />
      ) : (
        <>
          <QuestList {...props} kind={tab} quests={sortForTab(state.quests, tab, today)} />
          <QuestForm kind={tab} lang={lang} disabled={disabled} onAdd={onAdd} />
        </>
      )}
    </section>
  )
}
