'use client'

import type { RolloverReport } from '@/lib/quests/types'
import { t } from '../i18n'
import type { Lang } from '@/lib/types'

interface RolloverBannerProps {
  report: RolloverReport | null
  lang: Lang
  onDismiss: () => void
}

/** Yesterday's verdict, shown once after the day rollover: what was missed and which crests kept or broke their streak. */
export function RolloverBanner({ report, lang, onDismiss }: RolloverBannerProps) {
  if (!report) return null
  const quiet = report.missed.length === 0 && report.crestsKept.length === 0 && report.crestsBroken.length === 0
  if (quiet) return null
  const tone = report.missed.length ? 'border-red-500/40 bg-red-900/30' : 'border-emerald-500/40 bg-emerald-900/30'
  return (
    <div className={`w-full text-xs rounded-lg border px-3 py-2 flex flex-col gap-1 ${tone}`} role="status">
      <div className="font-semibold">{t(lang, 'yesterday')} · {report.day}</div>
      {report.missed.length > 0 && (
        <div>{t(lang, 'missedDailies')}: {report.missed.map(m => m.text).join(', ')} (−{report.happinessLost} {t(lang, 'happiness').toLowerCase()})</div>
      )}
      {report.crestsKept.length > 0 && <div>✨ {t(lang, 'crestsKept')}: {report.crestsKept.join(', ')}</div>}
      {report.crestsBroken.length > 0 && <div>💔 {t(lang, 'crestsBroken')}: {report.crestsBroken.join(', ')}</div>}
      <button className="btn !px-3 !py-0.5 text-xs self-end" onClick={onDismiss}>{t(lang, 'ok')}</button>
    </div>
  )
}
