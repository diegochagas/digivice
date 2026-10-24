'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, Lang } from '@/lib/types'
import { t } from '../i18n'

interface ChatPanelProps {
  history: ChatMessage[]
  lang: Lang
  busy: boolean
  sleeping: boolean
  onSend: (message: string) => void
  onTalk: () => void
}

function ChatLog({ history }: { history: ChatMessage[] }) {
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [history.length])
  return (
    <div ref={logRef} className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 text-sm">
      {history.map((m, i) => (
        <div key={i} className={`max-w-[85%] rounded-xl px-3 py-1.5 ${m.role === 'user' ? 'self-end bg-sky-500/30' : 'self-start bg-white/10'}`}>
          {m.content}
        </div>
      ))}
    </div>
  )
}

export function ChatPanel({ history, lang, busy, sleeping, onSend, onTalk }: ChatPanelProps) {
  const [input, setInput] = useState('')

  function submit() {
    const msg = input.trim()
    if (!msg || busy) return
    setInput('')
    onSend(msg)
  }

  return (
    <section className="panel w-full p-3 flex flex-col gap-2">
      <ChatLog history={history} />
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); submit() }}>
        <input
          className="flex-1 rounded-full bg-black/30 border border-white/10 px-4 py-2 text-sm outline-none focus:border-sky-400"
          placeholder={t(lang, 'placeholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          enterKeyHint="send"
          disabled={busy}
        />
        <button className="btn btn-accent" disabled={busy || !input.trim()}>{busy ? '…' : t(lang, 'send')}</button>
      </form>
      <button className="btn text-xs self-start" disabled={busy || sleeping} onClick={onTalk}>💭 {t(lang, 'talk')}</button>
    </section>
  )
}
