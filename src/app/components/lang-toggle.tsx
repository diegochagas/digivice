'use client'

import type { Lang } from '@/lib/types'

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
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
