'use client'

import type { Lang } from '@/lib/types'
import { t } from '../i18n'

export function MemoriesPanel({ memories, lang, onForget }: { memories: string[]; lang: Lang; onForget: (index: number) => void }) {
  return (
    <section className="panel w-full p-3 flex flex-col gap-2 text-sm">
      <div className="font-semibold">{t(lang, 'memories')}</div>
      {memories.length === 0 && <div className="text-slate-400 text-xs">{t(lang, 'noMemories')}</div>}
      {memories.map((m, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="flex-1">{m}</span>
          <button className="text-slate-500 hover:text-red-300" onClick={() => onForget(i)} aria-label={`forget ${m}`}>✕</button>
        </div>
      ))}
    </section>
  )
}
