'use client'

import { useState } from 'react'
import { displayName } from '@/lib/state'
import { getPixelSprite } from '@/lib/pixel-sprites'
import type { Lang, LineInfo } from '@/lib/types'
import { t } from '../i18n'
import { DigiviceScreen } from './digivice-screen'
import { LangToggle } from './lang-toggle'
import type { ScreenStyle } from './settings-panel'

export interface LineWithPersona extends LineInfo {
  persona: { summary: string; partner: string; crest: string } | null
}

interface ChoosePartnerProps {
  lines: LineWithPersona[]
  lang: Lang
  busy: boolean
  screenStyle: ScreenStyle
  onChoose: (crest: string) => void
  onLang: (l: Lang) => void
}

function LineCard({ line, busy, lang, onPrev, onNext, onChoose }: { line: LineWithPersona; busy: boolean; lang: Lang; onPrev: () => void; onNext: () => void; onChoose: () => void }) {
  const [baby, child] = line.digimons
  return (
    <div className="panel p-4 w-full max-w-sm text-center">
      <div className="text-xs uppercase tracking-widest text-amber-300">Crest of {line.persona?.crest ?? line.crest}</div>
      <div className="text-xl font-bold mt-1">{displayName(baby)} → {displayName(child)}</div>
      <div className="text-xs text-slate-400 mt-1">{line.digimons.map(displayName).join(' → ')}</div>
      <p className="text-sm mt-3 text-slate-200">{line.persona?.summary}</p>
      <div className="flex gap-2 justify-center mt-4">
        <button className="btn" onClick={onPrev} aria-label="previous crest">◀</button>
        <button className="btn btn-accent" disabled={busy} onClick={onChoose}>{t(lang, 'confirm')}</button>
        <button className="btn" onClick={onNext} aria-label="next crest">▶</button>
      </div>
    </div>
  )
}

/** First screen: browse the crest lines with the Digivice buttons and pick a partner. */
export function ChoosePartner({ lines, lang, busy, screenStyle, onChoose, onLang }: ChoosePartnerProps) {
  const [pickIndex, setPickIndex] = useState(0)
  const line = lines[pickIndex]
  const child = line?.digimons[1]
  const prev = () => setPickIndex(i => (i - 1 + lines.length) % lines.length)
  const next = () => setPickIndex(i => (i + 1) % lines.length)
  const choose = () => line && onChoose(line.crest)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold drop-shadow">{t(lang, 'chooseTitle')}</h1>
      <p className="text-sm text-slate-200 text-center max-w-xs">{t(lang, 'chooseHint')}</p>
      <DigiviceScreen
        imageSrc={line ? `/images/${line.crest}/${child}.png` : null}
        alt={child ?? ''}
        evolutionVideo={null}
        pixel={screenStyle === 'pixel' ? { sprite: getPixelSprite(child), mood: 'happy', event: null, onEventEnd: () => undefined } : null}
        onLeftButton={choose}
        onTopRight={prev}
        onBottomRight={next}
        leftLabel={t(lang, 'confirm')}
        topRightLabel="previous crest"
        bottomRightLabel="next crest"
      />
      {line && <LineCard line={line} busy={busy} lang={lang} onPrev={prev} onNext={next} onChoose={choose} />}
      <LangToggle lang={lang} onChange={onLang} />
    </main>
  )
}
